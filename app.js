const express = require('express');
const path = require('path');
require('dotenv').config();

// Import chore scheduler
const { initChoreScheduler } = require('./services/chore-scheduler');
const settingsStore = require('./services/settings-store');
const choresData = require('./services/chores-data');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Make sure every kid in Settings has a chores entry (handles first run and
// settings.json being edited/restored without the chores data file).
settingsStore.read().kids.forEach(kid => choresData.ensureKid(kid));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Cache compiled templates in production; disable in dev so edits reload
app.set('view cache', isProduction);

// Optional HTTP Basic Auth. Enabled only when BASIC_AUTH_USER/PASS are set,
// so a trusted-LAN kiosk keeps working with no config change.
if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS) {
    const expectedUser = process.env.BASIC_AUTH_USER;
    const expectedPass = process.env.BASIC_AUTH_PASS;

    app.use((req, res, next) => {
        const header = req.headers.authorization || '';
        const [scheme, encoded] = header.split(' ');

        if (scheme === 'Basic' && encoded) {
            const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
            if (user === expectedUser && pass === expectedPass) {
                return next();
            }
        }

        res.set('WWW-Authenticate', 'Basic realm="Family Calendar"');
        return res.status(401).send('Authentication required');
    });
    console.log('HTTP Basic Auth enabled');
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const calendarRoutes = require('./routes/calendar');
const choreRoutes = require('./routes/chores');
const mealsRoutes = require('./routes/meals');
const weatherRoutes = require('./routes/weather');
const photosRoutes = require('./routes/photos');
const lunchMenuRoutes = require('./routes/lunch-menu');
const settingsRoutes = require('./routes/settings');

app.use('/', calendarRoutes);
app.use('/chores', choreRoutes);
app.use('/meals', mealsRoutes);
app.use('/weather', weatherRoutes);
app.use('/photos', photosRoutes);
app.use('/lunch-menu', lunchMenuRoutes);
app.use('/settings', settingsRoutes);

// Main route
app.get('/', (req, res) => {
    const settings = settingsStore.read();
    res.render('index', {
        title: settings.appTitle,
        kids: settings.kids,
        logoIcon: settings.logoIcon || '/images/family-hub-icon.png',
        publicSettings: settingsStore.publicSettings(settings)
    });
});

// 404 handler for unmatched routes
app.use((req, res) => {
    if (req.accepts('html')) {
        return res.status(404).render('error', { message: 'Page not found' });
    }
    res.status(404).json({ error: 'Not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const status = err.status || 500;
    const message = isProduction ? 'Something went wrong' : err.message;
    if (req.accepts('html')) {
        return res.status(status).render('error', { message });
    }
    res.status(status).json({ error: message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Family Calendar app listening on port ${PORT}`);
    console.log(`Access the calendar at http://localhost:${PORT}`);

    // Initialize the daily chore reset scheduler
    initChoreScheduler();
});

module.exports = app;
