const cron = require('node-cron');
const path = require('path');
const JsonStore = require('./json-store');

const CHORES_FILE = path.join(__dirname, '../data/chores.json');
const store = new JsonStore(CHORES_FILE, null);

// Load chores data (returns null if the file is missing/unreadable)
function loadChores() {
    const data = store.read();
    if (!data) {
        console.error('Error loading chores data: file missing or empty');
        return null;
    }
    return data;
}

// Save chores data atomically
function saveChores(chores) {
    return store.write(chores);
}

// Reset all kids' daily chores
function resetAllDailyChores() {
    const chores = loadChores();
    if (!chores) {
        console.error('Failed to load chores for daily reset');
        return;
    }

    const kids = Object.keys(chores);
    let resetCount = 0;

    kids.forEach(kidName => {
        if (chores[kidName] && chores[kidName].dailyChores) {
            // Initialize weeklyPoints if it doesn't exist
            if (typeof chores[kidName].weeklyPoints !== 'number') {
                chores[kidName].weeklyPoints = 0;
            }

            chores[kidName].dailyChores.forEach(chore => {
                if (chore.completed) {
                    // Add points to weekly total before resetting
                    chores[kidName].weeklyPoints += chore.points;
                    resetCount++;
                }
                chore.completed = false;
            });

            // Reset daily points to 0, but keep weekly points and add points from completed weekly chores
            let weeklyChorePoints = 0;
            if (chores[kidName].weeklyChores) {
                chores[kidName].weeklyChores.forEach(chore => {
                    if (chore.completed) {
                        weeklyChorePoints += chore.points;
                    }
                });
            }

            // Total points = Banked Weekly Points + Current Weekly Chore Points
            // (Daily chores are now reset, so 0 points from them)
            chores[kidName].totalPoints = chores[kidName].weeklyPoints + weeklyChorePoints;
        }
    });

    if (saveChores(chores)) {
        const timestamp = new Date().toLocaleString();
        console.log(`[${timestamp}] Daily chores reset completed. Reset ${resetCount} chores for ${kids.length} kids.`);
    } else {
        console.error('Failed to save chores after daily reset');
    }
}

// Reset all kids' weekly points (runs on Sunday)
function resetWeeklyPoints() {
    const chores = loadChores();
    if (!chores) {
        console.error('Failed to load chores for weekly reset');
        return;
    }

    const kids = Object.keys(chores);

    kids.forEach(kidName => {
        if (chores[kidName]) {
            chores[kidName].weeklyPoints = 0;

            // Reset weekly chores
            if (chores[kidName].weeklyChores) {
                chores[kidName].weeklyChores.forEach(chore => {
                    chore.completed = false;
                });
            }

            // Reset totalPoints to 0 (since weeklyPoints is 0 and weekly chores are reset)
            chores[kidName].totalPoints = 0;
        }
    });

    if (saveChores(chores)) {
        const timestamp = new Date().toLocaleString();
        console.log(`[${timestamp}] Weekly points reset completed for ${kids.length} kids.`);
    } else {
        console.error('Failed to save chores after weekly reset');
    }
}

// Initialize the daily chore reset scheduler
function initChoreScheduler() {
    // Schedule daily reset at 5:00 AM every day
    // Cron format: minute hour day-of-month month day-of-week
    cron.schedule('0 5 * * *', () => {
        console.log('Running scheduled daily chores reset...');
        resetAllDailyChores();
    }, {
        timezone: 'America/Chicago' // Adjust timezone as needed
    });

    // Schedule weekly points reset at 5:00 AM every Sunday (day 0)
    cron.schedule('0 5 * * 0', () => {
        console.log('Running scheduled weekly points reset...');
        resetWeeklyPoints();
    }, {
        timezone: 'America/Chicago'
    });

    console.log('Chore scheduler initialized - daily chores reset at 5:00 AM, weekly points reset on Sundays');
}

module.exports = {
    initChoreScheduler,
    resetAllDailyChores,
    resetWeeklyPoints
};
