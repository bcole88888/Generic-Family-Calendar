const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const settingsStore = require('../services/settings-store');
const choresData = require('../services/chores-data');
const AppleCalendarClient = require('../config/apple-calendar');
const calendarRoutes = require('./calendar');

// Logo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'branding');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'logo-icon-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Settings page
router.get('/', (req, res) => {
    const settings = settingsStore.read();
    res.render('settings', {
        title: `Settings - ${settings.appTitle}`,
        settings: settings,
        googleAuthenticated: calendarRoutes.isGoogleAuthenticated(),
        googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here')
    });
});

// Branding: app title
router.post('/branding', (req, res) => {
    const { appTitle } = req.body;
    if (!appTitle || !appTitle.trim()) {
        return res.status(400).json({ error: 'App title is required' });
    }

    const settings = settingsStore.read();
    settings.appTitle = appTitle.trim();
    settingsStore.write(settings);
    res.json({ success: true, settings });
});

// Branding: logo icon upload
router.post('/logo', upload.single('logoIcon'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const settings = settingsStore.read();
    settings.logoIcon = `/uploads/branding/${req.file.filename}`;
    settingsStore.write(settings);
    res.json({ success: true, logoIcon: settings.logoIcon });
});

// Branding: reset logo icon to the bundled default
router.post('/logo/reset', (req, res) => {
    const settings = settingsStore.read();
    settings.logoIcon = null;
    settingsStore.write(settings);
    res.json({ success: true });
});

// Kids: add
router.post('/kids', (req, res) => {
    const { name } = req.body;
    const kidName = (name || '').trim();

    if (!kidName) {
        return res.status(400).json({ error: 'Kid name is required' });
    }

    const settings = settingsStore.read();
    if (settings.kids.includes(kidName)) {
        return res.status(400).json({ error: 'That kid already exists' });
    }

    settings.kids.push(kidName);
    settingsStore.write(settings);
    choresData.ensureKid(kidName);

    res.json({ success: true, kids: settings.kids });
});

// Kids: remove
router.delete('/kids/:name', (req, res) => {
    const { name } = req.params;
    const settings = settingsStore.read();

    settings.kids = settings.kids.filter(kid => kid !== name);
    settingsStore.write(settings);
    choresData.removeKid(name);

    res.json({ success: true, kids: settings.kids });
});

// Birthdays: add
router.post('/birthdays', (req, res) => {
    const { name, month, day } = req.body;
    const birthdayName = (name || '').trim();
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (!birthdayName || Number.isNaN(monthNum) || Number.isNaN(dayNum) ||
        monthNum < 0 || monthNum > 11 || dayNum < 1 || dayNum > 31) {
        return res.status(400).json({ error: 'A name, month, and day are required' });
    }

    const settings = settingsStore.read();
    settings.birthdays.push({ name: birthdayName, month: monthNum, day: dayNum });
    settingsStore.write(settings);

    res.json({ success: true, birthdays: settings.birthdays });
});

// Birthdays: remove
router.delete('/birthdays/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const settings = settingsStore.read();

    if (Number.isNaN(index) || index < 0 || index >= settings.birthdays.length) {
        return res.status(404).json({ error: 'Birthday not found' });
    }

    settings.birthdays.splice(index, 1);
    settingsStore.write(settings);

    res.json({ success: true, birthdays: settings.birthdays });
});

// Google Calendar: which calendar + display label
router.post('/calendar/google', (req, res) => {
    const { calendarId, label } = req.body;
    const settings = settingsStore.read();

    settings.googleCalendarId = (calendarId || '').trim() || 'primary';
    if (label && label.trim()) {
        settings.googleCalendarLabel = label.trim();
    }

    settingsStore.write(settings);
    res.json({ success: true });
});

// Google Calendar: disconnect
router.post('/calendar/google/disconnect', (req, res) => {
    calendarRoutes.disconnectGoogle();
    res.json({ success: true });
});

// Apple Calendar: username/password + display label
router.post('/calendar/apple', (req, res) => {
    const { username, password, label } = req.body;
    const settings = settingsStore.read();

    if (username !== undefined) {
        settings.appleUsername = username.trim();
    }
    // Only overwrite the stored password if a new one was actually typed in,
    // so re-saving the form doesn't wipe it out via the masked placeholder.
    if (password) {
        settings.applePassword = password;
    }
    if (label && label.trim()) {
        settings.appleCalendarLabel = label.trim();
    }

    settingsStore.write(settings);
    res.json({ success: true });
});

// Apple Calendar: disconnect (clear stored credentials)
router.post('/calendar/apple/disconnect', (req, res) => {
    const settings = settingsStore.read();
    settings.appleUsername = '';
    settings.applePassword = '';
    settingsStore.write(settings);
    res.json({ success: true });
});

// Apple Calendar: test connection with the currently saved credentials
router.post('/calendar/apple/test', async (req, res) => {
    const settings = settingsStore.read();
    const username = settings.appleUsername || process.env.APPLE_USERNAME;
    const password = settings.applePassword || process.env.APPLE_PASSWORD;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Enter an Apple ID and app-specific password first' });
    }

    try {
        const client = new AppleCalendarClient(username, password);
        const ok = await client.testConnection();
        res.json({ success: ok });
    } catch (error) {
        console.error('Apple Calendar test connection failed:', error.message);
        res.status(500).json({ success: false, error: 'Connection test failed' });
    }
});

module.exports = router;
