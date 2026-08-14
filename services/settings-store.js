const path = require('path');
const JsonStore = require('./json-store');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

const DEFAULT_SETTINGS = {
    appTitle: 'Family Hub',
    logoIcon: null, // null => use bundled default icon
    kids: ['Kid 1', 'Kid 2'],
    birthdays: [], // { name, month (0-11), day }
    googleCalendarId: 'primary',
    googleCalendarLabel: 'Google Calendar',
    appleCalendarLabel: 'Apple Calendar',
    appleUsername: '',
    applePassword: ''
};

const store = new JsonStore(SETTINGS_FILE, DEFAULT_SETTINGS);

// Merge saved settings over the defaults so new fields added later always have a value
function read() {
    const saved = store.read() || {};
    return { ...DEFAULT_SETTINGS, ...saved };
}

function write(settings) {
    return store.write(settings);
}

// Settings a client is allowed to see (excludes calendar credentials)
function publicSettings(settings = read()) {
    return {
        appTitle: settings.appTitle,
        kids: settings.kids,
        birthdays: settings.birthdays,
        googleCalendarLabel: settings.googleCalendarLabel,
        appleCalendarLabel: settings.appleCalendarLabel
    };
}

module.exports = { read, write, publicSettings, DEFAULT_SETTINGS };
