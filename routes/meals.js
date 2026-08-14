const express = require('express');
const router = express.Router();
const path = require('path');
const JsonStore = require('../services/json-store');

// File to store meals data
const MEALS_FILE = path.join(__dirname, '../data/meals.json');

// Initialize default meals data
const defaultMeals = {
    mealsByDate: {}, // New date-based structure: { "YYYY-MM-DD": "Meal Name" }
    mealsList: [
        'Spaghetti and Meatballs',
        'Tacos',
        'Grilled Chicken',
        'Pizza',
        'Stir Fry',
        'Burgers',
        'Lasagna',
        'Baked Salmon',
        'Chicken Fajitas',
        'Pot Roast'
    ]
};

// Initialize store
const store = new JsonStore(MEALS_FILE, defaultMeals);

// Helper function to get Sunday of a given week
function getSundayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is day 0, so subtract the current day number
    return new Date(d.setDate(diff));
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Load meals data with migration logic
function loadMeals() {
    const meals = store.read();

    // Migrate old weeklyMeals structure to date-based structure
    if (meals.weeklyMeals && !meals.mealsByDate) {
        console.log('Migrating meals from week-based to date-based structure...');
        meals.mealsByDate = {};

        const today = new Date();
        const thisSunday = getSundayOfWeek(today);
        const nextSunday = new Date(thisSunday);
        nextSunday.setDate(nextSunday.getDate() + 7);

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Migrate thisWeek
        if (meals.weeklyMeals.thisWeek) {
            dayNames.forEach((dayName, index) => {
                const meal = meals.weeklyMeals.thisWeek[dayName];
                if (meal && meal.trim() !== '') {
                    const date = new Date(thisSunday);
                    date.setDate(thisSunday.getDate() + index);
                    meals.mealsByDate[formatDate(date)] = meal;
                }
            });
        }

        // Migrate nextWeek
        if (meals.weeklyMeals.nextWeek) {
            dayNames.forEach((dayName, index) => {
                const meal = meals.weeklyMeals.nextWeek[dayName];
                if (meal && meal.trim() !== '') {
                    const date = new Date(nextSunday);
                    date.setDate(nextSunday.getDate() + index);
                    meals.mealsByDate[formatDate(date)] = meal;
                }
            });
        }

        // Remove old structure
        delete meals.weeklyMeals;

        // Save migrated data
        store.write(meals);
        console.log('Migration complete. Meals by date:', meals.mealsByDate);
    }

    // Ensure mealsByDate exists
    if (!meals.mealsByDate) {
        meals.mealsByDate = {};
    }

    return meals;
}

// Get all meals data (weekly meals + meals list)
router.get('/api/meals', (req, res) => {
    const meals = loadMeals();
    res.json(meals);
});

// Update a specific day's meal (now using dates)
router.post('/api/meals/day', (req, res) => {
    const { date, meal } = req.body;

    if (!date) {
        return res.status(400).json({ error: 'Date is required (YYYY-MM-DD format)' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const meals = loadMeals();

    // Update the meal for the specified date
    if (meal && meal.trim() !== '') {
        meals.mealsByDate[date] = meal.trim();

        // If meal is not already in the list, add it
        if (!meals.mealsList.includes(meal.trim())) {
            meals.mealsList.push(meal.trim());
            // Sort the meals list alphabetically
            meals.mealsList.sort();
        }
    } else {
        // Remove meal for this date if meal is empty
        delete meals.mealsByDate[date];
    }

    store.write(meals);
    res.json({ success: true, meals });
});

// Add a new meal to the meals list
router.post('/api/meals/add', (req, res) => {
    const { meal } = req.body;

    if (!meal || meal.trim() === '') {
        return res.status(400).json({ error: 'Meal name is required' });
    }

    const meals = loadMeals();

    // Check if meal already exists
    if (meals.mealsList.includes(meal.trim())) {
        return res.status(400).json({ error: 'Meal already exists' });
    }

    // Add new meal to the list
    meals.mealsList.push(meal.trim());
    // Sort the meals list alphabetically
    meals.mealsList.sort();

    store.write(meals);
    res.json({ success: true, mealsList: meals.mealsList });
});

// Delete a meal from the meals list
router.delete('/api/meals/:mealName', (req, res) => {
    const { mealName } = req.params;

    const meals = loadMeals();

    // Find and remove the meal from the list
    const index = meals.mealsList.indexOf(decodeURIComponent(mealName));
    if (index === -1) {
        return res.status(404).json({ error: 'Meal not found' });
    }

    meals.mealsList.splice(index, 1);

    store.write(meals);
    res.json({ success: true, mealsList: meals.mealsList });
});

// Clear meals for a specific week (now using date range)
router.post('/api/meals/clear', (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD format)' });
    }

    const meals = loadMeals();

    // Remove all meals in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    Object.keys(meals.mealsByDate).forEach(dateStr => {
        const date = new Date(dateStr);
        if (date >= start && date <= end) {
            delete meals.mealsByDate[dateStr];
        }
    });

    store.write(meals);
    res.json({ success: true, meals });
});

module.exports = router;
