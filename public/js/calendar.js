// Calendar functionality

// Number of distinct .kid-color-N classes defined in styles.css
const KID_COLOR_COUNT = 6;

// Map an event title to a per-kid color class (title must start with the kid's name),
// based on that kid's position in the Settings kids list. Shared by calendar.js and app.js.
function getKidClassForTitle(title) {
    const kids = (window.APP_SETTINGS && window.APP_SETTINGS.kids) || [];
    const titleLower = title.toLowerCase();
    const index = kids.findIndex(kid => titleLower.startsWith(kid.toLowerCase()));
    return index === -1 ? '' : `kid-color-${(index % KID_COLOR_COUNT) + 1}`;
}

// Get weather forecast for a specific date
function getWeatherForDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (typeof dailyForecasts !== 'undefined' && dailyForecasts[dateStr]) {
        return dailyForecasts[dateStr];
    }
    return null;
}

// Show/hide the summer banner and update its countdown to August 10, 2026
function updateSummerBanner() {
    const banner = document.getElementById('summerBanner');
    if (!banner) return;

    const today = new Date();
    if (!isSummerBreak(today)) {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = '';

    const countdownEl = document.getElementById('summerCountdown');
    if (!countdownEl) return;

    const target = new Date(2026, 7, 10); // August 10, 2026
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.max(0, Math.round((target - startOfToday) / 86400000));

    if (days === 0) {
        countdownEl.textContent = '🎒 Back to school today!';
    } else {
        countdownEl.innerHTML = `<span class="summer-days">${days}</span> day${days === 1 ? '' : 's'} until back to school 🎒`;
    }
}

// Generate two-week calendar view
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const weekDisplay = document.getElementById('weekDisplay');

    updateSummerBanner();

    // Calculate the start of the first week (Sunday)
    const today = new Date();
    const startOfFirstWeek = new Date(today);
    startOfFirstWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 14)); // 14 days for two-week periods

    // Calculate the start of the second week
    const startOfSecondWeek = new Date(startOfFirstWeek);
    startOfSecondWeek.setDate(startOfFirstWeek.getDate() + 7);

    // Update week display
    const endOfSecondWeek = new Date(startOfSecondWeek);
    endOfSecondWeek.setDate(startOfSecondWeek.getDate() + 6);

    const formatOptions = { month: 'short', day: 'numeric' };
    if (currentWeekOffset === 0) {
        weekDisplay.textContent = 'This Week & Next Week';
    } else {
        weekDisplay.textContent = `${startOfFirstWeek.toLocaleDateString('en-US', formatOptions)} - ${endOfSecondWeek.toLocaleDateString('en-US', formatOptions)}`;
    }

    // Generate calendar grid
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let gridHTML = '';

    // Header row
    gridHTML += '<div class="calendar-row header-row">';
    daysOfWeek.forEach(day => {
        gridHTML += `<div class="calendar-header-cell">${day}</div>`;
    });
    gridHTML += '</div>';

    // Generate two weeks of calendar cells
    for (let week = 0; week < 2; week++) {
        const weekStart = week === 0 ? startOfFirstWeek : startOfSecondWeek;

        // Determine if this is current week, next week, or other
        const today = new Date();
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() - today.getDay());

        let weekLabel;
        if (currentWeekOffset === 0) {
            weekLabel = week === 0 ? 'This Week' : 'Next Week';
        } else {
            // For other time periods, use dates
            const endOfWeek = new Date(weekStart);
            endOfWeek.setDate(weekStart.getDate() + 6);
            weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }

        // Week label row
        gridHTML += `<div class="week-label-row">
            <div class="week-label">${weekLabel}</div>
        </div>`;

        // Calendar cells for this week
        gridHTML += '<div class="calendar-row calendar-body">';
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + i);

            const isToday = currentDate.toDateString() === today.toDateString();
            const dayEvents = getEventsForDate(currentDate);
            const dayMeal = getMealForDate(currentDate);
            const lunchMenu = getLunchForDate(currentDate);
            const dayWeather = getWeatherForDate(currentDate);

            let weatherHTML = '';
            if (dayWeather) {
                weatherHTML = `
                    <div class="date-weather">
                        <i class="${dayWeather.icon}"></i>
                        <span>${dayWeather.high}°/${dayWeather.low}°</span>
                    </div>`;
            }

            gridHTML += `
                <div class="calendar-cell ${isToday ? 'today' : ''}">
                    <div class="calendar-date">
                        <div class="date-info">
                            <span class="date-number">${currentDate.getDate()}</span>
                            <span class="date-month">${currentDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                        </div>
                        ${weatherHTML}
                    </div>
                    <div class="calendar-events">
                        ${dayEvents.map(event => createEventHTML(event)).join('')}
                    </div>
                    ${lunchMenu ? `
                    <div class="calendar-lunch">
                        <span class="lunch-label">🍔 Lunch:</span>
                        <span class="lunch-choice" title="${lunchMenu.allItems}">${lunchMenu.preview}</span>
                    </div>
                    ` : ''}
                    ${dayMeal ? `
                    <div class="calendar-dinner">
                        <span class="dinner-label">🍽️ Dinner:</span>
                        <span class="dinner-choice">${dayMeal}</span>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        gridHTML += '</div>';

        // Add lunch menu section between the two weeks (hidden during summer break)
        if (week === 0 && !isSummerBreak(today)) {
            gridHTML += `
                <div class="lunch-menu-between-weeks">
                    <h3><i class="fas fa-hamburger"></i> Today's School Lunch</h3>
                    <div id="todaysLunchMenuInline" class="lunch-menu-display">
                        <!-- Today's lunch menu will be loaded here -->
                    </div>
                </div>
            `;
        }
    }

    calendarGrid.innerHTML = gridHTML;

    // Load today's lunch menu into the inline section
    updateTodaysLunchMenuInline();
}

// Get events for a specific date
function getEventsForDate(date) {
    // Get local date string (YYYY-MM-DD) without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return calendarEvents.filter(event => {
        const eventStart = new Date(event.start);

        // For all-day events, compare dates directly without time
        if (event.allDay) {
            const eventYear = eventStart.getUTCFullYear();
            const eventMonth = String(eventStart.getUTCMonth() + 1).padStart(2, '0');
            const eventDay = String(eventStart.getUTCDate()).padStart(2, '0');
            const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
            return eventDateStr === dateStr;
        } else {
            // For timed events, use local date
            const eventYear = eventStart.getFullYear();
            const eventMonth = String(eventStart.getMonth() + 1).padStart(2, '0');
            const eventDay = String(eventStart.getDate()).padStart(2, '0');
            const eventDateStr = `${eventYear}-${eventMonth}-${eventDay}`;
            return eventDateStr === dateStr;
        }
    }).sort((a, b) => {
        // All-day events first, then sort by start time earliest to latest
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return new Date(a.start) - new Date(b.start);
    });
}

// Create HTML for an event
function createEventHTML(event) {
    const startTime = event.allDay ? '' :
        new Date(event.start).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

    const truncatedTitle = event.title.length > 25 ?
        event.title.substring(0, 25) + '...' : event.title;

    // Check if this is a birthday event
    const isBirthday = event.title.toLowerCase().includes('birthday');
    const birthdayIcon = isBirthday ? '🎂 ' : '';

    // Check if event is for one of the kids
    const kidClass = getKidClassForTitle(event.title);

    // Escape quotes in event data for JSON
    const eventData = JSON.stringify(event).replace(/"/g, '&quot;');

    return `
        <div class="calendar-event ${event.source} ${kidClass}" title="${event.title}" onclick='showEventDetails(${eventData})'>
            <div class="event-time">${startTime}</div>
            <div class="event-title">${birthdayIcon}${truncatedTitle}</div>
        </div>
    `;
}

// Navigation functions
function previousTwoWeeks() {
    currentWeekOffset--;
    generateCalendar();
}

function nextTwoWeeks() {
    currentWeekOffset++;
    generateCalendar();
}

// Keep old function names for backward compatibility
function previousWeek() {
    previousTwoWeeks();
}

function nextWeek() {
    nextTwoWeeks();
}

// Go to current week
function goToCurrentWeek() {
    currentWeekOffset = 0;
    generateCalendar();
}

// School is out for summer between May 22 and August 9 (inclusive)
function isSummerBreak(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (month === 5 && day >= 22) return true;
    if (month === 6 || month === 7) return true;
    if (month === 8 && day <= 9) return true;
    return false;
}

// Get lunch menu for a specific date
function getLunchForDate(date) {
    if (isSummerBreak(date)) return null;

    // Format date as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Get menu from lunch-menu.js if available
    if (typeof getLunchMenuForDate === 'function') {
        const menu = getLunchMenuForDate(dateStr);
        if (menu && menu.items && menu.items.length > 0) {
            // Create preview (first item) and full list for tooltip
            const preview = menu.items[0];
            const allItems = menu.items.join(', ');
            return {
                preview: preview,
                allItems: allItems,
                full: menu
            };
        }
    }

    return null;
}

