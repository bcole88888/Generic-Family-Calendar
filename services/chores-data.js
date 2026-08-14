const path = require('path');
const JsonStore = require('./json-store');

const CHORES_FILE = path.join(__dirname, '../data/chores.json');
const store = new JsonStore(CHORES_FILE, {});

function defaultKidChores() {
    return {
        dailyChores: [
            { name: 'Make bed', completed: false, points: 5 },
            { name: 'Put toys away', completed: false, points: 10 },
            { name: 'Homework', completed: false, points: 15 }
        ],
        weeklyChores: [
            { name: 'Clean room', completed: false, points: 20 },
            { name: 'Help with dishes', completed: false, points: 15 }
        ],
        totalPoints: 0
    };
}

// Add a chores entry for a new kid if one doesn't already exist. Safe to call repeatedly.
function ensureKid(kidName) {
    const chores = store.read();
    if (!chores[kidName]) {
        chores[kidName] = defaultKidChores();
        store.write(chores);
    }
}

// Remove a kid's chores entry entirely
function removeKid(kidName) {
    const chores = store.read();
    if (chores[kidName]) {
        delete chores[kidName];
        store.write(chores);
    }
}

module.exports = { store, defaultKidChores, ensureKid, removeKid };
