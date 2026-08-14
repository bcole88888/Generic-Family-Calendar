const express = require('express');
const router = express.Router();
const { store } = require('../services/chores-data');

// Chores dashboard route
router.get('/', (req, res) => {
    const chores = store.read();
    res.render('chores', {
        title: 'Family Chores',
        chores: chores,
        kids: Object.keys(chores)
    });
});

// Individual kid's chore page
router.get('/:kidName', (req, res) => {
    const { kidName } = req.params;
    const chores = store.read();

    if (!chores[kidName]) {
        return res.status(404).render('error', { message: 'Kid not found' });
    }

    res.render('kid-chores', {
        title: `${kidName}'s Chores`,
        kidName: kidName,
        kidChores: chores[kidName]
    });
});

// API to toggle chore completion
router.post('/api/toggle/:kidName/:choreType/:choreIndex', (req, res) => {
    const { kidName, choreType, choreIndex } = req.params;
    const chores = store.read();

    if (!chores[kidName] || !chores[kidName][choreType]) {
        return res.status(404).json({ error: 'Kid or chore type not found' });
    }

    const choreList = chores[kidName][choreType];
    const index = parseInt(choreIndex);

    if (index < 0 || index >= choreList.length) {
        return res.status(404).json({ error: 'Chore not found' });
    }

    // Toggle completion status
    choreList[index].completed = !choreList[index].completed;

    // Update points
    if (choreList[index].completed) {
        chores[kidName].totalPoints += choreList[index].points;
    } else {
        chores[kidName].totalPoints -= choreList[index].points;
    }

    store.write(chores);
    res.json({ success: true, chore: choreList[index] });
});

// API to reset chores (daily reset)
router.post('/api/reset/:kidName', (req, res) => {
    const { kidName } = req.params;
    const chores = store.read();

    if (!chores[kidName]) {
        return res.status(404).json({ error: 'Kid not found' });
    }

    // Reset daily chores only
    chores[kidName].dailyChores.forEach(chore => {
        if (chore.completed) {
            chores[kidName].totalPoints -= chore.points;
        }
        chore.completed = false;
    });

    store.write(chores);
    res.json({ success: true });
});

// API to get chores data
router.get('/api/:kidName', (req, res) => {
    const { kidName } = req.params;
    const chores = store.read();

    if (!chores[kidName]) {
        return res.status(404).json({ error: 'Kid not found' });
    }

    res.json(chores[kidName]);
});

// API to add a new chore
router.post('/api/add/:kidName/:choreType', (req, res) => {
    const { kidName, choreType } = req.params;
    const { name, points } = req.body;
    const chores = store.read();

    if (!chores[kidName] || !chores[kidName][choreType]) {
        return res.status(404).json({ error: 'Kid or chore type not found' });
    }

    if (!name || !points) {
        return res.status(400).json({ error: 'Name and points are required' });
    }

    // Add new chore
    const newChore = {
        name: name,
        completed: false,
        points: parseInt(points)
    };

    chores[kidName][choreType].push(newChore);
    store.write(chores);

    res.json({ success: true, chore: newChore });
});

// API to edit a chore
router.put('/api/edit/:kidName/:choreType/:choreIndex', (req, res) => {
    const { kidName, choreType, choreIndex } = req.params;
    const { name, points } = req.body;
    const chores = store.read();

    if (!chores[kidName] || !chores[kidName][choreType]) {
        return res.status(404).json({ error: 'Kid or chore type not found' });
    }

    const choreList = chores[kidName][choreType];
    const index = parseInt(choreIndex);

    if (index < 0 || index >= choreList.length) {
        return res.status(404).json({ error: 'Chore not found' });
    }

    // Update chore
    if (name) choreList[index].name = name;
    if (points !== undefined) choreList[index].points = parseInt(points);

    store.write(chores);
    res.json({ success: true, chore: choreList[index] });
});

// API to delete a chore
router.delete('/api/delete/:kidName/:choreType/:choreIndex', (req, res) => {
    const { kidName, choreType, choreIndex } = req.params;
    const chores = store.read();

    if (!chores[kidName] || !chores[kidName][choreType]) {
        return res.status(404).json({ error: 'Kid or chore type not found' });
    }

    const choreList = chores[kidName][choreType];
    const index = parseInt(choreIndex);

    if (index < 0 || index >= choreList.length) {
        return res.status(404).json({ error: 'Chore not found' });
    }

    // Remove chore
    const deletedChore = choreList.splice(index, 1)[0];

    // If chore was completed, subtract points
    if (deletedChore.completed) {
        chores[kidName].totalPoints -= deletedChore.points;
    }

    store.write(chores);
    res.json({ success: true, deletedChore });
});

module.exports = router;