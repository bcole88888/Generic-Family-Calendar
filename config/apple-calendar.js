const { createDAVClient } = require('tsdav');
const ICAL = require('ical.js');

class AppleCalendarClient {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.client = null;
        this.calendars = [];
    }

    // Initialize the DAV client
    async initialize() {
        try {
            this.client = await createDAVClient({
                serverUrl: 'https://caldav.icloud.com/',
                credentials: {
                    username: this.username,
                    password: this.password,
                },
                authMethod: 'Basic',
                defaultAccountType: 'caldav',
            });

            console.log('Apple Calendar client initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Apple Calendar client:', error.message);
            return false;
        }
    }

    // Fetch calendars
    async fetchCalendars() {
        try {
            if (!this.client) {
                await this.initialize();
            }

            this.calendars = await this.client.fetchCalendars();
            console.log(`Found ${this.calendars.length} Apple calendars`);
            return this.calendars;
        } catch (error) {
            console.error('Error fetching Apple calendars:', error.message);
            return [];
        }
    }

    // Fetch calendar events
    async fetchEvents(startDate = null, endDate = null) {
        try {
            if (!this.client) {
                await this.initialize();
            }

            if (this.calendars.length === 0) {
                await this.fetchCalendars();
            }

            if (this.calendars.length === 0) {
                console.log('No Apple calendars available');
                return [];
            }

            // Set default date range (today to 30 days from now)
            if (!startDate) {
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
            }
            if (!endDate) {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 30);
                endDate.setHours(23, 59, 59, 999);
            }

            const allEvents = [];

            // Fetch events from each calendar
            for (const calendar of this.calendars) {
                try {
                    const calendarObjects = await this.client.fetchCalendarObjects({
                        calendar: calendar,
                        timeRange: {
                            start: startDate.toISOString(),
                            end: endDate.toISOString(),
                        },
                    });

                    // Parse iCalendar data
                    for (const obj of calendarObjects) {
                        if (obj.data) {
                            try {
                                const jcalData = ICAL.parse(obj.data);
                                const comp = new ICAL.Component(jcalData);
                                const vevents = comp.getAllSubcomponents('vevent');

                                for (const vevent of vevents) {
                                    const event = new ICAL.Event(vevent);

                                    // Extract event details
                                    const startTime = event.startDate ? event.startDate.toJSDate() : null;
                                    const endTime = event.endDate ? event.endDate.toJSDate() : null;

                                    if (startTime) {
                                        allEvents.push({
                                            id: event.uid,
                                            title: event.summary || 'Untitled Event',
                                            start: startTime.toISOString(),
                                            end: endTime ? endTime.toISOString() : startTime.toISOString(),
                                            allDay: event.startDate.isDate,
                                            source: 'apple',
                                            description: event.description || '',
                                            location: event.location || '',
                                        });
                                    }
                                }
                            } catch (parseError) {
                                console.error('Error parsing iCal event:', parseError.message);
                            }
                        }
                    }
                } catch (calError) {
                    console.error(`Error fetching events from calendar ${calendar.displayName}:`, calError.message);
                }
            }

            console.log(`Successfully fetched ${allEvents.length} Apple Calendar events`);
            return allEvents;
        } catch (error) {
            console.error('Error fetching Apple Calendar events:', error.message);
            return [];
        }
    }

    // Test connection
    async testConnection() {
        try {
            const initialized = await this.initialize();
            if (initialized) {
                const calendars = await this.fetchCalendars();
                console.log('Apple Calendar connection test successful');
                return calendars.length > 0;
            }
            return false;
        } catch (error) {
            console.error('Apple Calendar connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = AppleCalendarClient;
