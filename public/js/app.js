// Main application JavaScript

// Escape user-provided text before inserting into innerHTML
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let currentWeekOffset = 0;
let calendarEvents = [];
let googleTasks = [];
let weeklyMeals = {};
let dailyForecasts = {};

// Toast notification system
function showToast(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Deduplication: skip if a toast with the same message is already visible
    const existing = container.querySelectorAll('.toast');
    for (const toast of existing) {
        if (toast.dataset.message === message) return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.message = message;

    const icon = type === 'error' ? 'fa-exclamation-circle' :
                 type === 'success' ? 'fa-check-circle' :
                 type === 'warning' ? 'fa-exclamation-triangle' :
                 'fa-info-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// Initialize the application
function initializeApp() {
    console.log('initializeApp called');
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadAuthStatus();
    loadCalendarEvents();
    loadChoresSummary();
    loadMeals();
    loadWeather();
    loadDailyForecasts();
    loadHourlyWeather();
    generateCalendar();
    updateChristmasCountdown();
    updateChristmasTheme();
    console.log('About to call updateElfMessage');
    updateElfMessage();
    updateBirthdayCountdown();
    updateHolidayCountdown();

    // Refresh events every hour
    setInterval(loadCalendarEvents, 60 * 60 * 1000);
    // Check auth status every minute
    setInterval(loadAuthStatus, 60 * 1000);
    // Refresh weather every 30 minutes
    setInterval(loadWeather, 30 * 60 * 1000);
    // Refresh daily forecasts every 30 minutes
    setInterval(loadDailyForecasts, 30 * 60 * 1000);
    // Refresh hourly forecast every 15 minutes so "Now" stays current
    setInterval(loadHourlyWeather, 15 * 60 * 1000);
    // Update Christmas countdown at midnight
    setInterval(updateChristmasCountdown, 60 * 60 * 1000);
    // Update elf message at midnight
    setInterval(updateElfMessage, 60 * 60 * 1000);
    // Update Christmas theme at midnight
    setInterval(updateChristmasTheme, 60 * 60 * 1000);
    // Update birthday countdown at midnight
    setInterval(updateBirthdayCountdown, 60 * 60 * 1000);
    // Update holiday countdown at midnight
    setInterval(updateHolidayCountdown, 60 * 60 * 1000);
}

// Update current date and time
function updateDateTime() {
    const now = new Date();
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', timeOptions);
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', dateOptions);
}

// Tab switching functionality
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.nav-icon').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');

    // Add active to clicked button
    event.target.classList.add('active');

    // Load specific content if needed
    if (tabName === 'chores') {
        loadChoresSummary();
    } else if (tabName === 'meals') {
        loadMealsTab();
    }
}

// Load authentication status
async function loadAuthStatus() {
    try {
        const response = await fetch('/api/auth-status');
        if (!response.ok) {
            showToast('Unable to check calendar connection', 'error');
            return;
        }
        const authStatus = await response.json();
        updateAuthButtons(authStatus);
    } catch (error) {
        console.error('Error loading auth status:', error);
        showToast('Unable to check calendar connection', 'error');
    }
}

// Update authentication buttons based on status
function updateAuthButtons(authStatus) {
    const googleButton = document.querySelector('.google-connection');
    const appleStatus = document.getElementById('appleStatus');

    console.log('updateAuthButtons called', authStatus);
    console.log('googleButton found:', !!googleButton);

    if (googleButton) {
        if (authStatus.google.authenticated) {
            console.log('Google is authenticated');
            googleButton.innerHTML = '<i class="fas fa-check-circle"></i>';
            googleButton.classList.add('connected');
            googleButton.title = 'Google Calendar Connected (Click to reconnect)';
            googleButton.onclick = authorizeGoogle;
            console.log('Set onclick handler to authorizeGoogle');
        } else {
            console.log('Google is NOT authenticated');
            googleButton.innerHTML = '<i class="fab fa-google"></i>';
            googleButton.classList.remove('connected');
            googleButton.title = 'Connect Google Calendar';
            googleButton.onclick = authorizeGoogle;
        }
    }

    if (appleStatus) {
        if (authStatus.apple.configured) {
            appleStatus.classList.add('connected');
            appleStatus.title = 'Apple Calendar Connected';
        } else {
            appleStatus.classList.remove('connected');
            appleStatus.title = 'Apple Calendar Not Configured';
        }
    }
}

// Deduplicate events based on title, start time, and end time
function deduplicateEvents(events) {
    const seen = new Map();
    const deduplicated = [];

    for (const event of events) {
        // Create a unique key based on title, start, and end time
        // Normalize times to the nearest minute to handle slight variations
        const startTime = new Date(event.start).getTime();
        const endTime = new Date(event.end).getTime();
        const normalizedTitle = event.title.trim().toLowerCase();

        // Round to nearest minute (60000ms) to handle slight time differences
        const roundedStart = Math.round(startTime / 60000) * 60000;
        const roundedEnd = Math.round(endTime / 60000) * 60000;

        const key = `${normalizedTitle}|${roundedStart}|${roundedEnd}`;

        if (!seen.has(key)) {
            // First occurrence - keep it
            seen.set(key, event);
            deduplicated.push(event);
        } else {
            // Duplicate found - prefer Google Calendar if available
            const existing = seen.get(key);
            if (event.source === 'google' && existing.source !== 'google') {
                // Replace with Google version
                const index = deduplicated.indexOf(existing);
                deduplicated[index] = event;
                seen.set(key, event);
            }
        }
    }

    return deduplicated;
}

// Load calendar events from API
async function loadCalendarEvents() {
    try {
        const response = await fetch('/api/events');
        if (!response.ok) {
            showToast('Unable to load calendar events', 'error');
            return;
        }
        const data = await response.json();
        const rawEvents = data.events || [];

        // Deduplicate events
        calendarEvents = deduplicateEvents(rawEvents);

        // Store tasks
        googleTasks = data.tasks || [];

        // Store meals data
        weeklyMeals = data.meals || {};

        // Log deduplication stats
        if (rawEvents.length > calendarEvents.length) {
            console.log(`Deduplicated events: ${rawEvents.length} → ${calendarEvents.length} (removed ${rawEvents.length - calendarEvents.length} duplicates)`);
        }

        updateTodaysEvents();
        updateTodaysLunchMenu();
        updateTasksList();
        generateCalendar();

        // Update source indicators
        if (data.sources) {
            console.log(`Loaded events: Google=${data.sources.google.eventCount}, Apple=${data.sources.apple.eventCount}`);
            if (data.sources.google.taskCount !== undefined) {
                console.log(`Loaded tasks: ${data.sources.google.taskCount}`);
            }
        }
    } catch (error) {
        console.error('Error loading calendar events:', error);
        showToast('Unable to load calendar events', 'error');
    }
}

// Get meal for a specific date
function getMealForDate(date) {
    // Format date as YYYY-MM-DD to match the new structure
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Check if we have the new date-based meal structure
    if (weeklyMeals && typeof weeklyMeals === 'object') {
        // New date-based structure (direct lookup by date)
        const meal = weeklyMeals[dateStr] || '';
        return meal;
    }

    return '';
}

// Load meals data from the server for the main app
async function loadMeals() {
    try {
        const response = await fetch('/meals/api/meals');
        if (!response.ok) {
            showToast('Unable to load meal plan', 'error');
            return;
        }
        const mealsData = await response.json();

        // Store meals data in the global variable used by calendar
        // New structure uses mealsByDate instead of weeklyMeals
        weeklyMeals = mealsData.mealsByDate || {};

        console.log('Loaded meals data:', weeklyMeals);

        // Regenerate calendar to show updated meals
        generateCalendar();
    } catch (error) {
        console.error('Error loading meals:', error);
        showToast('Unable to load meal plan', 'error');
    }
}

// Update today's events display
function updateTodaysEvents() {
    const today = new Date();

    // Get local date string (YYYY-MM-DD) without timezone conversion
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const todaysEvents = calendarEvents.filter(event => {
        const eventStart = new Date(event.start);

        // For all-day events, compare dates using UTC
        if (event.allDay) {
            const eventYear = eventStart.getUTCFullYear();
            const eventMonth = String(eventStart.getUTCMonth() + 1).padStart(2, '0');
            const eventDay = String(eventStart.getUTCDate()).padStart(2, '0');
            const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
            return eventDateStr === todayStr;
        } else {
            // For timed events, use local date
            const eventYear = eventStart.getFullYear();
            const eventMonth = String(eventStart.getMonth() + 1).padStart(2, '0');
            const eventDay = String(eventStart.getDate()).padStart(2, '0');
            const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
            return eventDateStr === todayStr;
        }
    });

    // Sort: all-day events first, then by start time earliest to latest
    todaysEvents.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.start) - new Date(b.start);
    });

    const eventsContainer = document.getElementById('todaysEvents');

    if (todaysEvents.length === 0) {
        eventsContainer.innerHTML = '<p class="no-events">No events today</p>';
        return;
    }

    eventsContainer.innerHTML = todaysEvents.map(event => {
        const startTime = event.allDay ? 'All day' :
            new Date(event.start).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

        // Escape quotes in event data for JSON
        const eventData = JSON.stringify(event).replace(/"/g, '&quot;');

        // Map source to a display label
        const settings = window.APP_SETTINGS || {};
        const sourceName = event.source === 'google' ? (settings.googleCalendarLabel || 'Google Calendar') :
                          event.source === 'apple' ? (settings.appleCalendarLabel || 'Apple Calendar') :
                          event.source;

        // Check if event is for one of the kids
        const kidClass = getKidClassForTitle(event.title);

        return `
            <div class="event-item ${event.source} ${kidClass}" onclick='showEventDetails(${eventData})'>
                <div class="event-time">${startTime}</div>
                <div class="event-title">${escapeHtml(event.title)}</div>
                <div class="event-source">${escapeHtml(sourceName)}</div>
            </div>
        `;
    }).join('');
}

// Update today's lunch menu display
async function updateTodaysLunchMenu() {
    const menuContainer = document.getElementById('todaysLunchMenu');

    if (!menuContainer) return;

    try {
        const response = await fetch('/lunch-menu/api/menu/today');
        if (!response.ok) {
            showToast('Unable to load lunch menu', 'error');
            menuContainer.innerHTML = '<p class="no-lunch-menu">Unable to load lunch menu</p>';
            return;
        }
        const menu = await response.json();

        if (menu.items && menu.items.length > 0) {
            let html = '<div class="lunch-menu-items">';
            menu.items.forEach(item => {
                html += `<div class="lunch-menu-item"><i class="fas fa-utensils"></i> ${escapeHtml(item)}</div>`;
            });
            html += '</div>';
            menuContainer.innerHTML = html;
        } else {
            menuContainer.innerHTML = '<p class="no-lunch-menu">No lunch menu available for today</p>';
        }
    } catch (error) {
        console.error('Error loading today\'s lunch menu:', error);
        showToast('Unable to load lunch menu', 'error');
        menuContainer.innerHTML = '<p class="no-lunch-menu">Unable to load lunch menu</p>';
    }
}

// Update today's lunch menu in the inline calendar section
async function updateTodaysLunchMenuInline() {
    const menuContainer = document.getElementById('todaysLunchMenuInline');

    if (!menuContainer) return;

    try {
        const response = await fetch('/lunch-menu/api/menu/today');
        if (!response.ok) {
            menuContainer.innerHTML = '<p class="no-lunch-menu">Unable to load lunch menu</p>';
            return;
        }
        const menu = await response.json();

        if (menu.items && menu.items.length > 0) {
            let html = '<div class="lunch-menu-items-inline">';
            menu.items.forEach(item => {
                html += `<div class="lunch-menu-item-inline"><i class="fas fa-utensils"></i> ${item}</div>`;
            });
            html += '</div>';
            menuContainer.innerHTML = html;
        } else {
            menuContainer.innerHTML = '<p class="no-lunch-menu">No lunch menu available for today</p>';
        }
    } catch (error) {
        console.error('Error loading today\'s lunch menu:', error);
        menuContainer.innerHTML = '<p class="no-lunch-menu">Unable to load lunch menu</p>';
    }
}

// Google Calendar authorization
function authorizeGoogle() {
    console.log('authorizeGoogle function called');
    console.log('Redirecting to /auth/google');
    window.location.href = '/auth/google';
}

// Show authentication message
function showAuthMessage(status) {
    if (status === 'success') {
        showToast('Google Calendar connected successfully!', 'success');
    } else {
        showToast('Failed to connect Google Calendar', 'error');
    }
}

// Manual refresh function
async function manualRefresh() {
    const refreshBtn = document.querySelector('.btn-refresh');
    if (!refreshBtn) return;

    // Add refreshing state
    refreshBtn.classList.add('refreshing');

    try {
        await loadCalendarEvents();
        console.log('Manual refresh completed');
    } catch (error) {
        console.error('Manual refresh failed:', error);
    } finally {
        // Remove refreshing state after a short delay
        setTimeout(() => {
            refreshBtn.classList.remove('refreshing');
        }, 500);
    }
}

// Navigate to kid's chores page
function goToKidChores(kidName) {
    window.location.href = `/chores/${kidName}`;
}

// Show event details in modal
function showEventDetails(event) {
    const modal = document.getElementById('eventModal');

    // Set title
    document.getElementById('modalEventTitle').textContent = event.title;

    // Set time
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    let timeText = '';

    if (event.allDay) {
        timeText = 'All day';
    } else {
        const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        timeText = `${dateStr} • ${startTime} - ${endTime}`;
    }
    document.getElementById('modalEventTime').textContent = timeText;

    // Set location (if available)
    const locationContainer = document.getElementById('modalLocationContainer');
    const locationText = document.getElementById('modalEventLocation');
    if (event.location && event.location.trim()) {
        locationText.textContent = event.location;
        locationContainer.style.display = 'flex';
    } else {
        locationContainer.style.display = 'none';
    }

    // Set description (if available)
    const descriptionContainer = document.getElementById('modalDescriptionContainer');
    const descriptionText = document.getElementById('modalEventDescription');
    if (event.description && event.description.trim()) {
        descriptionText.textContent = event.description;
        descriptionContainer.style.display = 'flex';
    } else {
        descriptionContainer.style.display = 'none';
    }

    // Set source
    const sourceText = event.source === 'google' ? 'Google Calendar' : 'Apple Calendar';
    document.getElementById('modalEventSource').textContent = sourceText;

    // Show modal
    modal.style.display = 'flex';
}

// Close event modal
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('eventModal');
    if (event.target === modal) {
        closeEventModal();
    }
}

// Update tasks list display
function updateTasksList() {
    const tasksContainer = document.getElementById('tasksList');

    if (!googleTasks || googleTasks.length === 0) {
        tasksContainer.innerHTML = '<p class="no-events">No tasks</p>';
        return;
    }

    // Sort tasks by due date
    const sortedTasks = [...googleTasks].sort((a, b) => {
        return new Date(a.due) - new Date(b.due);
    });

    tasksContainer.innerHTML = sortedTasks.map(task => {
        const dueDate = new Date(task.due);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(dueDate);
        taskDate.setHours(0, 0, 0, 0);

        let dueDateText = '';
        const daysDiff = Math.floor((taskDate - today) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            dueDateText = 'Due today';
        } else if (daysDiff === 1) {
            dueDateText = 'Due tomorrow';
        } else if (daysDiff === -1) {
            dueDateText = 'Due yesterday';
        } else if (daysDiff < 0) {
            dueDateText = `Overdue by ${Math.abs(daysDiff)} days`;
        } else if (daysDiff <= 7) {
            dueDateText = `Due in ${daysDiff} days`;
        } else {
            dueDateText = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }

        const taskData = JSON.stringify(task).replace(/"/g, '&quot;');

        return `
            <div class="task-item" onclick='showTaskDetails(${taskData})'>
                <div class="task-checkbox">
                    <i class="far fa-square"></i>
                </div>
                <div class="task-details">
                    <div class="task-title">${task.title}</div>
                    <div class="task-due">${dueDateText}</div>
                    ${task.taskList ? `<div class="task-list-name">${task.taskList}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Show task details in modal
function showTaskDetails(task) {
    const modal = document.getElementById('eventModal');

    // Set title
    document.getElementById('modalEventTitle').textContent = task.title;

    // Set due date
    const dueDate = new Date(task.due);
    const dateStr = dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('modalEventTime').textContent = `Due: ${dateStr}`;

    // Hide location
    document.getElementById('modalLocationContainer').style.display = 'none';

    // Set notes (if available)
    const descriptionContainer = document.getElementById('modalDescriptionContainer');
    const descriptionText = document.getElementById('modalEventDescription');
    if (task.notes && task.notes.trim()) {
        descriptionText.textContent = task.notes;
        descriptionContainer.style.display = 'flex';
    } else {
        descriptionContainer.style.display = 'none';
    }

    // Set source
    const sourceText = task.taskList ? `Google Tasks: ${task.taskList}` : 'Google Tasks';
    document.getElementById('modalEventSource').textContent = sourceText;

    // Show modal
    modal.style.display = 'flex';
}

// Load chores summary for main page
async function loadChoresSummary() {
    const kids = (window.APP_SETTINGS && window.APP_SETTINGS.kids) || [];

    for (const kid of kids) {
        try {
            const response = await fetch(`/chores/api/${kid}`);
            const data = await response.json();

            // Update points display
            const pointsElement = document.getElementById(`${kid.toLowerCase()}-points`);
            if (pointsElement) {
                pointsElement.textContent = data.totalPoints;
            }

            // Update progress bar
            const progressElement = document.getElementById(`${kid.toLowerCase()}-progress`);
            if (progressElement) {
                const dailyCompleted = data.dailyChores.filter(c => c.completed).length;
                const dailyTotal = data.dailyChores.length;
                const progressPercentage = dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0;
                progressElement.style.width = `${progressPercentage}%`;
            }
        } catch (error) {
            console.error(`Error loading chores for ${kid}:`, error);
            showToast('Unable to load chores', 'error');
        }
    }
}

// Load weather data from API
async function loadWeather() {
    try {
        const response = await fetch('/weather/api/current');
        if (!response.ok) {
            showToast('Unable to load weather data', 'error');
            updateWeatherDisplay({
                current: { temperature: '--', icon: 'fas fa-exclamation-triangle' },
                today: { high: '--', low: '--' },
                error: true
            });
            return;
        }
        const data = await response.json();

        if (data.error) {
            console.error('Weather API error:', data.error);
            showToast('Unable to load weather data', 'warning');
            updateWeatherDisplay({
                current: { temperature: '--', icon: 'fas fa-exclamation-triangle' },
                today: { high: '--', low: '--' },
                error: true
            });
            return;
        }

        updateWeatherDisplay(data);
        console.log('Weather data loaded successfully for', data.location);
    } catch (error) {
        console.error('Error loading weather:', error);
        showToast('Unable to load weather data', 'error');
        updateWeatherDisplay({
            current: { temperature: '--', icon: 'fas fa-exclamation-triangle' },
            today: { high: '--', low: '--' },
            error: true
        });
    }
}

// Update weather display elements
function updateWeatherDisplay(weatherData) {
    const weatherIcon = document.getElementById('weatherIcon');
    const currentTemp = document.getElementById('currentTemp');
    const todayIcon = document.getElementById('todayIcon');
    const todayDescription = document.getElementById('todayDescription');
    const todayRange = document.getElementById('todayRange');
    const tomorrowIcon = document.getElementById('tomorrowIcon');
    const tomorrowDescription = document.getElementById('tomorrowDescription');
    const tomorrowRange = document.getElementById('tomorrowRange');

    if (weatherData.error) {
        currentTemp.textContent = '--°';
        weatherIcon.className = 'fas fa-exclamation-triangle';
        todayDescription.textContent = 'Weather unavailable';
        todayRange.textContent = 'H: --° L: --°';
        todayIcon.className = 'fas fa-exclamation-triangle';
        tomorrowDescription.textContent = 'Weather unavailable';
        tomorrowRange.textContent = 'H: --° L: --°';
        tomorrowIcon.className = 'fas fa-exclamation-triangle';
        return;
    }

    // Update current weather
    currentTemp.textContent = `${weatherData.current.temperature}°`;
    weatherIcon.className = weatherData.current.icon;

    // Update today's forecast
    todayIcon.className = weatherData.today.icon;
    todayDescription.textContent = weatherData.today.description;
    todayRange.textContent = `H: ${weatherData.today.high}° L: ${weatherData.today.low}°`;

    // Update tomorrow's forecast
    tomorrowIcon.className = weatherData.tomorrow.icon;
    tomorrowDescription.textContent = weatherData.tomorrow.description;
    tomorrowRange.textContent = `H: ${weatherData.tomorrow.high}° L: ${weatherData.tomorrow.low}°`;
}

// Load daily forecast data for calendar cells
async function loadDailyForecasts() {
    try {
        const response = await fetch('/weather/api/forecast');
        const data = await response.json();

        if (data.error) {
            console.error('Forecast API error:', data.error);
            return;
        }

        dailyForecasts = data.forecasts || {};
        console.log('Daily forecasts loaded for', Object.keys(dailyForecasts).length, 'days');
        generateCalendar();
    } catch (error) {
        console.error('Error loading daily forecasts:', error);
        showToast('Unable to load weather data', 'error');
    }
}

// Load the next 6 hours of weather for the top banner
async function loadHourlyWeather() {
    const strip = document.getElementById('hourlyWeatherStrip');
    if (!strip) return;

    try {
        const response = await fetch('/weather/api/hourly');
        const data = await response.json();

        if (!response.ok || data.error || !Array.isArray(data.hours) || data.hours.length === 0) {
            strip.innerHTML = '<div class="hourly-weather-loading">Hourly forecast unavailable</div>';
            return;
        }

        strip.innerHTML = data.hours.map(hour => {
            const precip = Number(hour.precipProbability) || 0;
            return `
            <div class="hourly-weather-cell${hour.label === 'Now' ? ' now' : ''}">
                <div class="hourly-weather-time">${escapeHtml(hour.label)}</div>
                <i class="${escapeHtml(hour.icon)}" title="${escapeHtml(hour.description)}"></i>
                <div class="hourly-weather-temp">${escapeHtml(hour.temperature)}°</div>
                <div class="hourly-weather-precip${precip === 0 ? ' zero' : ''}">
                    <i class="fas fa-droplet"></i> ${precip}%
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading hourly weather:', error);
        strip.innerHTML = '<div class="hourly-weather-loading">Hourly forecast unavailable</div>';
    }
}

// Update Christmas countdown banner
function updateChristmasCountdown() {
    const banner = document.getElementById('christmasCountdown');
    const countdownText = document.getElementById('countdownText');

    if (!banner || !countdownText) return;

    const now = new Date();
    const currentYear = now.getFullYear();

    // Only show the countdown banner in December (Dec 1-25)
    // Hide if not December, or if after Christmas Day
    if (now.getMonth() !== 11 || now.getDate() > 25) {
        banner.classList.add('hidden');
        return;
    }

    // Christmas is December 25
    const christmas = new Date(currentYear, 11, 25); // Month is 0-indexed

    // Calculate days until Christmas
    const timeDiff = christmas.getTime() - now.getTime();
    const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    // Check if today is Christmas
    const isChristmas = now.getMonth() === 11 && now.getDate() === 25;

    if (isChristmas) {
        // It's Christmas Day!
        banner.classList.add('christmas-day');
        countdownText.innerHTML = '<span class="days-number">Merry Christmas!</span>';
    } else if (daysUntil === 1) {
        // Christmas Eve
        countdownText.innerHTML = '<span class="days-number">1</span> day until Christmas!';
    } else {
        // Show countdown
        countdownText.innerHTML = `<span class="days-number">${daysUntil}</span> days until Christmas!`;
    }
}

// Update Elf on a Shelf goodbye message - shows only on December 24th
function updateElfMessage() {
    const banner = document.getElementById('elfMessageBanner');

    console.log('updateElfMessage called');
    console.log('Banner element found:', !!banner);

    if (!banner) {
        console.log('Banner element not found!');
        return;
    }

    const now = new Date();
    console.log('Current date:', now);
    console.log('Month:', now.getMonth(), 'Date:', now.getDate());

    // Check if today is December 24th (Christmas Eve)
    const isChristmasEve = now.getMonth() === 11 && now.getDate() === 24;
    console.log('Is Christmas Eve:', isChristmasEve);

    if (isChristmasEve) {
        console.log('Setting banner display to block');
        banner.style.display = 'block';
    } else {
        console.log('Setting banner display to none');
        banner.style.display = 'none';
    }
}

// Update Christmas theme - applies festive colors on December 25th
function updateChristmasTheme() {
    const now = new Date();

    // Check if today is December 25th (Christmas Day)
    const isChristmas = now.getMonth() === 11 && now.getDate() === 25;

    if (isChristmas) {
        document.body.classList.add('christmas-theme');
        console.log('Christmas theme activated!');
    } else {
        document.body.classList.remove('christmas-theme');
    }
}

// Update birthday countdown banner - shows when less than 22 days until a birthday
function updateBirthdayCountdown() {
    const banner = document.getElementById('birthdayCountdown');
    const birthdayText = document.getElementById('birthdayText');
    const leftIcon = document.getElementById('birthdayIconLeft');
    const rightIcon = document.getElementById('birthdayIconRight');

    if (!banner || !birthdayText) return;

    // Family birthdays are configured on the Settings page; month is 0-indexed (0 = January)
    const familyBirthdays = (window.APP_SETTINGS && window.APP_SETTINGS.birthdays) || [];
    if (familyBirthdays.length === 0) {
        banner.style.display = 'none';
        return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    // Find the next upcoming birthday within 22 days
    let upcomingBirthdays = [];

    for (const birthday of familyBirthdays) {
        // Calculate this year's birthday
        let birthdayDate = new Date(currentYear, birthday.month, birthday.day);

        // If birthday has passed this year, use next year's date
        if (birthdayDate < now) {
            birthdayDate = new Date(currentYear + 1, birthday.month, birthday.day);
        }

        // Calculate days until birthday
        const timeDiff = birthdayDate.getTime() - now.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // Check if today is the birthday
        const isToday = now.getMonth() === birthday.month && now.getDate() === birthday.day;

        if (isToday || (daysUntil > 0 && daysUntil < 22)) {
            upcomingBirthdays.push({
                name: birthday.name,
                daysUntil: isToday ? 0 : daysUntil,
                isToday: isToday
            });
        }
    }

    // Sort by days until (soonest first)
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    if (upcomingBirthdays.length === 0) {
        banner.style.display = 'none';
        banner.classList.remove('birthday-today');
        return;
    }

    // Show banner
    banner.style.display = 'block';

    // Get the closest birthday
    const closest = upcomingBirthdays[0];

    if (closest.isToday) {
        // It's someone's birthday today!
        banner.classList.add('birthday-today');
        leftIcon.textContent = '🎉';
        rightIcon.textContent = '🎉';
        birthdayText.innerHTML = `<span class="birthday-name">Happy Birthday ${closest.name}!</span>`;
    } else {
        banner.classList.remove('birthday-today');
        leftIcon.textContent = '🎂';
        rightIcon.textContent = '🎁';

        if (closest.daysUntil === 1) {
            birthdayText.innerHTML = `<span class="days-number">1</span> day until <span class="birthday-name">${closest.name}'s</span> birthday!`;
        } else {
            birthdayText.innerHTML = `<span class="days-number">${closest.daysUntil}</span> days until <span class="birthday-name">${closest.name}'s</span> birthday!`;
        }
    }
}

// Calculate Easter Sunday for a given year (Anonymous Gregorian algorithm)
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

// Update holiday countdown banner (Valentine's Day, Easter, 4th of July)
function updateHolidayCountdown() {
    const banner = document.getElementById('holidayCountdown');
    const countdownText = document.getElementById('holidayCountdownText');
    const leftIcon = document.getElementById('holidayIconLeft');
    const rightIcon = document.getElementById('holidayIconRight');

    if (!banner || !countdownText) return;

    const now = new Date();
    const currentYear = now.getFullYear();

    // Define holidays with their themes
    const holidays = [
        {
            name: "Valentine's Day",
            getDate: (yr) => new Date(yr, 1, 14), // Feb 14
            iconLeft: '💕',
            iconRight: '❤️',
            todayIconLeft: '💖',
            todayIconRight: '💖',
            todayMessage: "Happy Valentine's Day!",
            cssClass: 'holiday-valentines'
        },
        {
            name: 'Easter',
            getDate: (yr) => getEasterDate(yr),
            iconLeft: '🐰',
            iconRight: '🥚',
            todayIconLeft: '🐣',
            todayIconRight: '🐣',
            todayMessage: 'Happy Easter!',
            cssClass: 'holiday-easter'
        },
        {
            name: '4th of July',
            getDate: (yr) => new Date(yr, 6, 4), // July 4
            iconLeft: '🇺🇸',
            iconRight: '🎆',
            todayIconLeft: '🎇',
            todayIconRight: '🎇',
            todayMessage: 'Happy 4th of July!',
            cssClass: 'holiday-july4th'
        }
    ];

    let closest = null;

    for (const holiday of holidays) {
        let holidayDate = holiday.getDate(currentYear);

        // If holiday has passed this year, check next year
        if (holidayDate < now && !(holidayDate.getMonth() === now.getMonth() && holidayDate.getDate() === now.getDate())) {
            holidayDate = holiday.getDate(currentYear + 1);
        }

        const isToday = now.getMonth() === holidayDate.getMonth() && now.getDate() === holidayDate.getDate() && now.getFullYear() === holidayDate.getFullYear();
        const timeDiff = holidayDate.getTime() - now.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (isToday || (daysUntil > 0 && daysUntil <= 21)) {
            if (!closest || (isToday ? 0 : daysUntil) < (closest.isToday ? 0 : closest.daysUntil)) {
                closest = {
                    ...holiday,
                    daysUntil: isToday ? 0 : daysUntil,
                    isToday: isToday
                };
            }
        }
    }

    // Remove all holiday-specific classes
    banner.classList.remove('holiday-valentines', 'holiday-easter', 'holiday-july4th', 'holiday-today');

    if (!closest) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'block';
    banner.classList.add(closest.cssClass);

    if (closest.isToday) {
        banner.classList.add('holiday-today');
        leftIcon.textContent = closest.todayIconLeft;
        rightIcon.textContent = closest.todayIconRight;
        countdownText.innerHTML = `<span class="days-number">${closest.todayMessage}</span>`;
    } else if (closest.daysUntil === 1) {
        leftIcon.textContent = closest.iconLeft;
        rightIcon.textContent = closest.iconRight;
        countdownText.innerHTML = `<span class="days-number">1</span> day until ${closest.name}!`;
    } else {
        leftIcon.textContent = closest.iconLeft;
        rightIcon.textContent = closest.iconRight;
        countdownText.innerHTML = `<span class="days-number">${closest.daysUntil}</span> days until ${closest.name}!`;
    }
}

