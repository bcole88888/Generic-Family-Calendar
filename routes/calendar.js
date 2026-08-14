const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { createGoogleAuth, getAuthUrl, getTokens } = require('../config/google-setup');
const AppleCalendarClient = require('../config/apple-calendar');
const JsonStore = require('../services/json-store');
const settingsStore = require('../services/settings-store');
const fs = require('fs');
const path = require('path');

// Token storage path
const TOKEN_PATH = path.join(__dirname, '..', '.tokens', 'google-tokens.json');

// Meals data store (read-only here; owned/written by routes/meals.js)
const MEALS_FILE = path.join(__dirname, '../data/meals.json');
const mealsStore = new JsonStore(MEALS_FILE, { mealsByDate: {}, mealsList: [] });

// Last-known-good events/tasks per source, persisted so a brief Google/iCloud
// outage (or a kiosk reboot during one) shows the last real data instead of
// an empty dashboard. Updated on every successful fetch, read on failure.
const LAST_KNOWN_EVENTS_FILE = path.join(__dirname, '../data/last-known-events.json');
const lastKnownStore = new JsonStore(LAST_KNOWN_EVENTS_FILE, {
    google: { events: [], tasks: [] },
    apple: { events: [] }
});
const lastKnown = lastKnownStore.read();

// Google OAuth2 setup
const oauth2Client = createGoogleAuth();

// Load saved tokens if they exist
function loadSavedTokens() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            oauth2Client.setCredentials(tokens);
            console.log('Loaded saved Google Calendar tokens');
            return true;
        }
    } catch (error) {
        console.error('Error loading saved tokens:', error);
    }
    return false;
}

// Save tokens to file
function saveTokens(tokens) {
    try {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
        console.log('Saved Google Calendar tokens');
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
}

// Load tokens on startup
loadSavedTokens();

// Disconnect Google Calendar: drop saved tokens and clear in-memory credentials
function disconnectGoogle() {
    oauth2Client.setCredentials({});
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
        }
    } catch (error) {
        console.error('Error removing Google Calendar tokens:', error);
    }
}

// Google Calendar OAuth
router.get('/auth/google', (req, res) => {
    // Check if Google Client ID is configured
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
        return res.redirect('/?auth=config_error');
    }

    try {
        const authUrl = getAuthUrl(oauth2Client);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.redirect('/?auth=error');
    }
});

// Google OAuth callback
router.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
        const tokens = await getTokens(oauth2Client, code);
        oauth2Client.setCredentials(tokens);

        // Save tokens to file for persistence
        saveTokens(tokens);

        console.log('Google Calendar authorized successfully');
        res.redirect('/?auth=success');
    } catch (error) {
        console.error('Error retrieving access token:', error);
        res.redirect('/?auth=error');
    }
});

// Check if Google Calendar is authenticated
function isGoogleAuthenticated() {
    return oauth2Client.credentials &&
        (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token);
}

// Fetch Google Calendar events. Falls back to the last successfully fetched
// events (flagged stale) if this fetch fails, instead of going empty.
async function fetchGoogleCalendarEvents() {
    if (!isGoogleAuthenticated()) {
        console.log('Google Calendar not authenticated yet - user needs to authorize first');
        return { events: [], stale: false };
    }

    try {
        // Calculate date range: 1 week ago to 60 days in the future
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 1 week ago

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 60); // 60 days in the future

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const response = await calendar.events.list({
            calendarId: settingsStore.read().googleCalendarId || 'primary',
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.data.items.map(event => ({
            id: event.id,
            title: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            source: 'google',
            allDay: !event.start.dateTime,
            location: event.location || '',
            description: event.description || ''
        }));

        console.log(`Successfully fetched ${events.length} Google Calendar events`);
        lastKnown.google.events = events;
        lastKnownStore.write(lastKnown);
        return { events, stale: false };
    } catch (error) {
        // More specific error handling
        if (error.message.includes('No access, refresh token')) {
            console.log('Google Calendar authentication required - user needs to authorize');
        } else {
            console.error('Error fetching Google Calendar events:', error);
        }
        console.log(`Serving ${lastKnown.google.events.length} cached Google Calendar events after fetch failure`);
        return { events: lastKnown.google.events, stale: true };
    }
}

// Build an Apple Calendar client from current settings (falls back to .env),
// created fresh each time so credential changes in Settings take effect immediately
function getAppleCalendarClient() {
    const settings = settingsStore.read();
    const username = settings.appleUsername || process.env.APPLE_USERNAME;
    const password = settings.applePassword || process.env.APPLE_PASSWORD;

    if (!username || !password) {
        return null;
    }

    return new AppleCalendarClient(username, password);
}

// Load meals data
function loadMeals() {
    return mealsStore.read();
}

// Fetch Google Tasks. Falls back to the last successfully fetched tasks
// (flagged stale) if this fetch fails, instead of going empty.
async function fetchGoogleTasks() {
    if (!isGoogleAuthenticated()) {
        console.log('Google Tasks not authenticated yet - user needs to authorize first');
        return { tasks: [], stale: false };
    }

    try {
        const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

        // Get all task lists
        const taskListsResponse = await tasks.tasklists.list();
        const taskLists = taskListsResponse.data.items || [];

        const allTasks = [];

        // Fetch tasks from each list
        for (const taskList of taskLists) {
            try {
                const tasksResponse = await tasks.tasks.list({
                    tasklist: taskList.id,
                    showCompleted: false,
                    showHidden: false
                });

                const taskItems = tasksResponse.data.items || [];

                for (const task of taskItems) {
                    // Only include tasks with due dates
                    if (task.due) {
                        allTasks.push({
                            id: task.id,
                            title: task.title,
                            due: task.due,
                            notes: task.notes || '',
                            taskList: taskList.title,
                            source: 'google-task',
                            completed: task.status === 'completed'
                        });
                    }
                }
            } catch (error) {
                console.error(`Error fetching tasks from list ${taskList.title}:`, error.message);
            }
        }

        console.log(`Successfully fetched ${allTasks.length} Google Tasks`);
        lastKnown.google.tasks = allTasks;
        lastKnownStore.write(lastKnown);
        return { tasks: allTasks, stale: false };
    } catch (error) {
        console.error('Error fetching Google Tasks:', error.message);
        console.log(`Serving ${lastKnown.google.tasks.length} cached Google Tasks after fetch failure`);
        return { tasks: lastKnown.google.tasks, stale: true };
    }
}

// Fetch Apple Calendar events (CalDAV). Falls back to the last successfully
// fetched events (flagged stale) if this fetch fails, instead of going empty.
async function fetchAppleCalendarEvents() {
    const appleCalendar = getAppleCalendarClient();
    if (!appleCalendar) {
        return { events: [], stale: false };
    }

    try {
        // Calculate date range: 1 week ago to 60 days in the future
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 1 week ago

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 60); // 60 days in the future

        const rawEvents = await appleCalendar.fetchEvents(startDate, endDate);
        const events = rawEvents.map(event => ({
            ...event,
            source: 'apple'
        }));

        lastKnown.apple.events = events;
        lastKnownStore.write(lastKnown);
        return { events, stale: false };
    } catch (error) {
        console.error('Error fetching Apple Calendar events:', error);
        console.log(`Serving ${lastKnown.apple.events.length} cached Apple Calendar events after fetch failure`);
        return { events: lastKnown.apple.events, stale: true };
    }
}

// API endpoint to check authentication status
router.get('/api/auth-status', (req, res) => {
    const settings = settingsStore.read();
    res.json({
        google: {
            authenticated: isGoogleAuthenticated(),
            configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here')
        },
        apple: {
            configured: !!((settings.appleUsername || process.env.APPLE_USERNAME) &&
                (settings.applePassword || process.env.APPLE_PASSWORD))
        }
    });
});

// Short-lived cache so frequent kiosk polling doesn't hammer the calendar APIs
let eventsCache = null;
let eventsCacheTime = 0;
const EVENTS_CACHE_TTL = 60 * 1000; // 60 seconds

// API endpoint to get all calendar events
router.get('/api/events', async (req, res) => {
    try {
        if (eventsCache && Date.now() - eventsCacheTime < EVENTS_CACHE_TTL) {
            return res.json(eventsCache);
        }

        // Fetch the three remote sources in parallel instead of serially
        const [googleResult, appleResult, tasksResult] = await Promise.all([
            fetchGoogleCalendarEvents(),
            fetchAppleCalendarEvents(),
            fetchGoogleTasks()
        ]);
        const mealsData = loadMeals();

        const allEvents = [...googleResult.events, ...appleResult.events];
        const payload = {
            events: allEvents,
            tasks: tasksResult.tasks,
            meals: mealsData.mealsByDate,
            sources: {
                google: {
                    authenticated: isGoogleAuthenticated(),
                    eventCount: googleResult.events.length,
                    taskCount: tasksResult.tasks.length,
                    stale: googleResult.stale || tasksResult.stale
                },
                apple: {
                    eventCount: appleResult.events.length,
                    stale: appleResult.stale
                }
            }
        };

        eventsCache = payload;
        eventsCacheTime = Date.now();
        res.json(payload);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
});

// Exposed for the Settings page (disconnect button, connection status)
router.isGoogleAuthenticated = isGoogleAuthenticated;
router.disconnectGoogle = disconnectGoogle;

module.exports = router;
