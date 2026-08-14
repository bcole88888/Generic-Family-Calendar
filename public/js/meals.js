// Meals functionality

// Escape user-provided text before inserting into innerHTML
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let mealsData = {
    mealsByDate: {}, // New date-based structure: { "YYYY-MM-DD": "Meal Name" }
    mealsList: []
};

let selectedDate = null;
let mealsWeekOffset = 0; // 0 = this week, 1 = next week

// Days of the week (starting with Sunday to match calendar)
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper function to get Sunday of current week
function getSundayOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is day 0, so subtract the current day number
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper function to format date as YYYY-MM-DD
function formatMealDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get dates for current displayed week
function getWeekDates() {
    const today = new Date();
    const sunday = getSundayOfWeek(today);
    sunday.setDate(sunday.getDate() + (mealsWeekOffset * 7));

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Load meals data from the server and render the UI
async function loadMealsTab() {
    try {
        const response = await fetch('/meals/api/meals');
        mealsData = await response.json();
        renderWeeklyMeals();
        renderMealsList();
    } catch (error) {
        console.error('Error loading meals:', error);
    }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Give the main app time to load
        setTimeout(() => {
            if (document.getElementById('weeklyMealsGrid')) {
                loadMealsTab();
            }
        }, 100);
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        if (document.getElementById('weeklyMealsGrid')) {
            loadMealsTab();
        }
    }, 100);
}

// Render the weekly meals grid
function renderWeeklyMeals() {
    const grid = document.getElementById('weeklyMealsGrid');
    if (!grid) return;

    const weekDates = getWeekDates();

    grid.innerHTML = weekDates.map((date, index) => {
        const dateStr = formatMealDate(date);
        const dayName = daysOfWeek[index];
        const meal = mealsData.mealsByDate[dateStr] || '';
        const isEmpty = !meal || meal.trim() === '';

        // Format display date (e.g., "Mon 11/11")
        const displayDate = `${dayName.substring(0, 3)} ${date.getMonth() + 1}/${date.getDate()}`;

        return `
            <div class="day-card"
                 data-date="${dateStr}"
                 onclick="selectDayForMeal('${dateStr}', '${dayName}')"
                 ondragover="handleDragOver(event)"
                 ondrop="handleDrop(event)"
                 ondragenter="handleDragEnter(event)"
                 ondragleave="handleDragLeave(event)">
                <h4>
                    <i class="fas fa-calendar-day"></i>
                    ${displayDate}
                </h4>
                <div class="meal-name ${isEmpty ? 'empty' : ''}">
                    ${isEmpty ? 'No meal planned' : escapeHtml(meal)}
                </div>
                ${!isEmpty ? `
                    <div class="meal-actions">
                        <button class="btn-edit" onclick="event.stopPropagation(); selectDayForMeal('${dateStr}', '${dayName}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-clear" onclick="event.stopPropagation(); clearDayMeal('${dateStr}')">
                            <i class="fas fa-times"></i> Clear
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Render the meals list
function renderMealsList() {
    const listContainer = document.getElementById('mealsList');
    if (!listContainer) return;

    if (mealsData.mealsList.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>No saved meals yet. Add your first meal!</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = mealsData.mealsList.map(meal => `
        <div class="meal-item" draggable="true" data-meal="${escapeHtml(meal)}" ondragstart="handleDragStart(event)">
            <span class="meal-item-name">${escapeHtml(meal)}</span>
            <div class="meal-item-actions">
                <button onclick="deleteMealFromList('${meal.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Select a day to set a meal
function selectDayForMeal(dateStr, dayName) {
    selectedDate = dateStr;
    const modal = document.getElementById('mealModal');
    const modalTitle = document.getElementById('modalTitle');
    const mealSelect = document.getElementById('mealSelect');
    const newMealInput = document.getElementById('newMealInput');

    // Format the date for display
    const date = new Date(dateStr + 'T00:00:00');
    const displayDate = `${dayName} ${date.getMonth() + 1}/${date.getDate()}`;

    modalTitle.textContent = `Set Meal for ${displayDate}`;

    // Populate the select dropdown
    mealSelect.innerHTML = '<option value="">-- Select a meal --</option>' +
        mealsData.mealsList.map(meal =>
            `<option value="${escapeHtml(meal)}">${escapeHtml(meal)}</option>`
        ).join('');

    // Set current meal if exists
    const currentMeal = mealsData.mealsByDate[dateStr] || '';
    if (currentMeal && mealsData.mealsList.includes(currentMeal)) {
        mealSelect.value = currentMeal;
    }

    newMealInput.value = '';

    modal.style.display = 'flex';
}

// Close meal modal
function closeMealModal() {
    const modal = document.getElementById('mealModal');
    modal.style.display = 'none';
    selectedDate = null;
}

// Save meal for the selected day
async function saveMealForDay() {
    if (!selectedDate) return;

    const mealSelect = document.getElementById('mealSelect');
    const newMealInput = document.getElementById('newMealInput');

    // Determine which input to use
    const meal = newMealInput.value.trim() || mealSelect.value;

    if (!meal) {
        alert('Please select or enter a meal');
        return;
    }

    try {
        const response = await fetch('/meals/api/meals/day', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: selectedDate,
                meal: meal
            })
        });

        const data = await response.json();

        if (data.success) {
            mealsData = data.meals;
            renderWeeklyMeals();
            renderMealsList();
            closeMealModal();

            // Update the main calendar if available
            if (typeof loadMeals === 'function') {
                loadMeals();
            }
        } else {
            alert('Error saving meal');
        }
    } catch (error) {
        console.error('Error saving meal:', error);
        alert('Error saving meal');
    }
}

// Clear meal for a specific day
async function clearDayMeal(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;

    if (!confirm(`Clear meal for ${displayDate}?`)) {
        return;
    }

    try {
        const response = await fetch('/meals/api/meals/day', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: dateStr,
                meal: ''
            })
        });

        const data = await response.json();

        if (data.success) {
            mealsData = data.meals;
            renderWeeklyMeals();

            // Update the main calendar if available
            if (typeof loadMeals === 'function') {
                loadMeals();
            }
        } else {
            alert('Error clearing meal');
        }
    } catch (error) {
        console.error('Error clearing meal:', error);
        alert('Error clearing meal');
    }
}

// Show add meal dialog
function showAddMealDialog() {
    const modal = document.getElementById('addMealModal');
    const input = document.getElementById('addMealInput');
    input.value = '';
    modal.style.display = 'flex';
}

// Close add meal dialog
function closeAddMealDialog() {
    const modal = document.getElementById('addMealModal');
    modal.style.display = 'none';
}

// Add a new meal to the list
async function addNewMeal() {
    const input = document.getElementById('addMealInput');
    const meal = input.value.trim();

    if (!meal) {
        alert('Please enter a meal name');
        return;
    }

    try {
        const response = await fetch('/meals/api/meals/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ meal })
        });

        const data = await response.json();

        if (data.success) {
            mealsData.mealsList = data.mealsList;
            renderMealsList();
            closeAddMealDialog();
        } else {
            alert(data.error || 'Error adding meal');
        }
    } catch (error) {
        console.error('Error adding meal:', error);
        alert('Error adding meal');
    }
}

// Delete a meal from the list
async function deleteMealFromList(mealName) {
    if (!confirm(`Delete "${mealName}" from the list?`)) {
        return;
    }

    try {
        const response = await fetch(`/meals/api/meals/${encodeURIComponent(mealName)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            mealsData.mealsList = data.mealsList;
            renderMealsList();
        } else {
            alert('Error deleting meal');
        }
    } catch (error) {
        console.error('Error deleting meal:', error);
        alert('Error deleting meal');
    }
}

// Clear all weekly meals
async function clearWeeklyMeals() {
    const weekLabel = mealsWeekOffset === 0 ? 'This Week' : 'Next Week';
    if (!confirm(`Clear all meals for ${weekLabel}?`)) {
        return;
    }

    try {
        const weekDates = getWeekDates();
        const startDate = formatMealDate(weekDates[0]);
        const endDate = formatMealDate(weekDates[6]);

        const response = await fetch('/meals/api/meals/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startDate: startDate,
                endDate: endDate
            })
        });

        const data = await response.json();

        if (data.success) {
            mealsData = data.meals;
            renderWeeklyMeals();

            // Update the main calendar if available
            if (typeof loadMeals === 'function') {
                loadMeals();
            }
        } else {
            alert('Error clearing meals');
        }
    } catch (error) {
        console.error('Error clearing meals:', error);
        alert('Error clearing meals');
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const mealModal = document.getElementById('mealModal');
    const addMealModal = document.getElementById('addMealModal');

    if (event.target === mealModal) {
        closeMealModal();
    }
    if (event.target === addMealModal) {
        closeAddMealDialog();
    }
};

// Drag and Drop functionality
let draggedMeal = null;

function handleDragStart(event) {
    draggedMeal = event.target.getAttribute('data-meal');
    event.target.style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/html', event.target.outerHTML);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

function handleDragEnter(event) {
    event.preventDefault();
    if (event.target.closest('.day-card')) {
        event.target.closest('.day-card').classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    event.preventDefault();
    // Only remove the class if we're actually leaving the day-card
    const dayCard = event.target.closest('.day-card');
    if (dayCard && !dayCard.contains(event.relatedTarget)) {
        dayCard.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    const dayCard = event.target.closest('.day-card');
    if (dayCard) {
        dayCard.classList.remove('drag-over');
        const dateStr = dayCard.getAttribute('data-date');

        if (draggedMeal && dateStr) {
            // Assign meal to day using existing API
            assignMealToDay(dateStr, draggedMeal);
        }
    }

    // Reset dragged meal
    draggedMeal = null;

    // Reset opacity of all meal items
    document.querySelectorAll('.meal-item').forEach(item => {
        item.style.opacity = '';
    });
}

// Function to assign meal to day (reuses existing save logic)
async function assignMealToDay(dateStr, meal) {
    try {
        const response = await fetch('/meals/api/meals/day', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: dateStr,
                meal: meal
            })
        });

        const data = await response.json();

        if (data.success) {
            mealsData = data.meals;
            renderWeeklyMeals();
            renderMealsList();

            // Update the main calendar if available
            if (typeof loadMeals === 'function') {
                loadMeals();
            }

            // Show visual feedback
            const date = new Date(dateStr + 'T00:00:00');
            const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
            showToast(`${meal} assigned to ${displayDate}!`, 'success', 3000);
        } else {
            showToast('Error assigning meal', 'error');
        }
    } catch (error) {
        console.error('Error assigning meal:', error);
        showToast('Error assigning meal', 'error');
    }
}



// Week switching functionality
function switchWeek(week) {
    if (week === 'thisWeek') {
        mealsWeekOffset = 0;
    } else if (week === 'nextWeek') {
        mealsWeekOffset = 1;
    } else {
        console.error('Invalid week:', week);
        return;
    }

    // Update button states
    document.querySelectorAll('.week-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(week + 'Btn').classList.add('active');

    // Update clear button text
    const clearWeekText = document.getElementById('clearWeekText');
    if (clearWeekText) {
        clearWeekText.textContent = mealsWeekOffset === 0 ? 'This Week' : 'Next Week';
    }

    // Re-render the meals grid for the selected week
    renderWeeklyMeals();
}

// Add Enter key support for inputs
document.addEventListener('DOMContentLoaded', function() {
    const newMealInput = document.getElementById('newMealInput');
    const addMealInput = document.getElementById('addMealInput');

    if (newMealInput) {
        newMealInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveMealForDay();
            }
        });
    }

    if (addMealInput) {
        addMealInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewMeal();
            }
        });
    }
});
