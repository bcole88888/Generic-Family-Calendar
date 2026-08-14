// Kid chores page functionality

let currentKidData = {};
let currentKidName = '';

// Initialize kid chores page
function initializeKidChores(kidName, choreData) {
    currentKidName = kidName;
    currentKidData = choreData;
    updateProgressBars();
    checkAchievements();
}

// Toggle chore completion
async function toggleChore(kidName, choreType, choreIndex) {
    try {
        const response = await fetch(`/chores/api/toggle/${kidName}/${choreType}/${choreIndex}`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();

            // Update local data
            currentKidData[choreType][choreIndex] = result.chore;

            // Update total points and weekly points
            const updatedData = await fetch(`/chores/api/${kidName}`);
            const newData = await updatedData.json();
            currentKidData.totalPoints = newData.totalPoints;
            currentKidData.weeklyPoints = newData.weeklyPoints || 0;

            // Update UI
            updateChoreDisplay(choreType, choreIndex, result.chore);
            updateTotalPoints();
            updateProgressBars();
            checkAchievements();

            // Add celebration effect for completion
            if (result.chore.completed) {
                showCelebration(choreType, choreIndex);
            }
        }
    } catch (error) {
        console.error('Error toggling chore:', error);
    }
}

// Update chore display
function updateChoreDisplay(choreType, choreIndex, chore) {
    const choreItems = document.querySelectorAll(`.chores-section:nth-child(${choreType === 'dailyChores' ? '1' : '2'}) .chore-item`);
    const choreItem = choreItems[choreIndex];

    if (choreItem) {
        if (chore.completed) {
            choreItem.classList.add('completed');
            choreItem.querySelector('i').className = 'fas fa-check-circle';
        } else {
            choreItem.classList.remove('completed');
            choreItem.querySelector('i').className = 'fas fa-circle';
        }
    }
}

// Update total points display
function updateTotalPoints() {
    // Calculate daily points
    const dailyPoints = currentKidData.dailyChores
        .filter(c => c.completed)
        .reduce((sum, c) => sum + c.points, 0);

    const dailyPointsEl = document.getElementById('dailyPointsDisplay');
    if (dailyPointsEl) {
        dailyPointsEl.textContent = dailyPoints;
    }

    const totalPointsEl = document.getElementById('totalPointsDisplay');
    if (totalPointsEl) {
        totalPointsEl.textContent = currentKidData.totalPoints;
    }
}

// Update progress bars
function updateProgressBars() {
    // Daily progress
    const dailyCompleted = currentKidData.dailyChores.filter(c => c.completed).length;
    const dailyTotal = currentKidData.dailyChores.length;
    const dailyPercentage = dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0;

    document.getElementById('dailyProgress').style.width = `${dailyPercentage}%`;
    document.getElementById('dailyText').textContent = `${dailyCompleted}/${dailyTotal}`;

    // Weekly progress
    const weeklyCompleted = currentKidData.weeklyChores.filter(c => c.completed).length;
    const weeklyTotal = currentKidData.weeklyChores.length;
    const weeklyPercentage = weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0;

    document.getElementById('weeklyProgress').style.width = `${weeklyPercentage}%`;
    document.getElementById('weeklyText').textContent = `${weeklyCompleted}/${weeklyTotal}`;
}

// Check for achievements and show encouraging messages
function checkAchievements() {
    const achievements = document.getElementById('achievements');
    const dailyCompleted = currentKidData.dailyChores.filter(c => c.completed).length;
    const dailyTotal = currentKidData.dailyChores.length;
    const weeklyCompleted = currentKidData.weeklyChores.filter(c => c.completed).length;
    const weeklyTotal = currentKidData.weeklyChores.length;

    let achievementHTML = '';

    // Check if ALL chores are complete (both daily and weekly)
    const allChoresComplete =
        dailyCompleted === dailyTotal && dailyTotal > 0 &&
        weeklyCompleted === weeklyTotal && weeklyTotal > 0;

    // Debug logging
    console.log('Chore Status:', {
        dailyCompleted,
        dailyTotal,
        weeklyCompleted,
        weeklyTotal,
        allChoresComplete
    });

    // Trigger fireworks if all chores are complete
    if (allChoresComplete) {
        console.log('Triggering fireworks!');
        triggerFireworks();
    }

    // Check for daily completion
    if (dailyCompleted === dailyTotal && dailyTotal > 0) {
        achievementHTML += `
            <div class="achievement daily-complete">
                <i class="fas fa-trophy"></i>
                <span>All daily chores complete! Great job ${currentKidName}!</span>
            </div>
        `;
    }

    // Check for weekly completion
    if (weeklyCompleted === weeklyTotal && weeklyTotal > 0) {
        achievementHTML += `
            <div class="achievement weekly-complete">
                <i class="fas fa-crown"></i>
                <span>All weekly chores complete! You're amazing ${currentKidName}!</span>
            </div>
        `;
    }

    // Points milestones
    if (currentKidData.totalPoints >= 100) {
        achievementHTML += `
            <div class="achievement points-milestone">
                <i class="fas fa-star"></i>
                <span>Wow! ${currentKidData.totalPoints} points! You're a superstar!</span>
            </div>
        `;
    } else if (currentKidData.totalPoints >= 50) {
        achievementHTML += `
            <div class="achievement points-milestone">
                <i class="fas fa-medal"></i>
                <span>Great job! ${currentKidData.totalPoints} points earned!</span>
            </div>
        `;
    }

    // Encouraging messages based on progress
    if (dailyCompleted > 0 && dailyCompleted < dailyTotal) {
        achievementHTML += `
            <div class="achievement encouragement">
                <i class="fas fa-thumbs-up"></i>
                <span>Keep going ${currentKidName}! You've got this!</span>
            </div>
        `;
    }

    achievements.innerHTML = achievementHTML;
}

// Show celebration animation
function showCelebration(choreType, choreIndex) {
    const choreItems = document.querySelectorAll(`.chores-section:nth-child(${choreType === 'dailyChores' ? '1' : '2'}) .chore-item`);
    const choreItem = choreItems[choreIndex];

    if (choreItem) {
        choreItem.classList.add('celebrate');
        setTimeout(() => {
            choreItem.classList.remove('celebrate');
        }, 1000);
    }

    // Show floating points animation
    showFloatingPoints(choreItem);
}

// Show floating points animation
function showFloatingPoints(element) {
    const points = element.querySelector('.chore-points').textContent;
    const floatingPoints = document.createElement('div');
    floatingPoints.className = 'floating-points';
    floatingPoints.textContent = points;

    const rect = element.getBoundingClientRect();
    floatingPoints.style.left = `${rect.left + rect.width / 2}px`;
    floatingPoints.style.top = `${rect.top}px`;

    document.body.appendChild(floatingPoints);

    setTimeout(() => {
        floatingPoints.remove();
    }, 2000);
}

// === CHORE MANAGEMENT FUNCTIONS ===

let isEditMode = false;
let currentChoreType = '';
let currentChoreIndex = -1;

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    const editModeElements = document.querySelectorAll('.edit-mode-only');
    const editModeBtn = document.getElementById('editModeBtn');

    editModeElements.forEach(el => {
        if (isEditMode) {
            el.classList.add('visible');
        } else {
            el.classList.remove('visible');
        }
    });

    if (isEditMode) {
        editModeBtn.innerHTML = '<i class="fas fa-times"></i> Done Editing';
        editModeBtn.classList.add('btn-cancel');
    } else {
        editModeBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Chores';
        editModeBtn.classList.remove('btn-cancel');
    }
}

// Show add chore modal
function showAddChoreModal(choreType) {
    currentChoreType = choreType;
    currentChoreIndex = -1;

    document.getElementById('modalTitle').textContent =
        `Add ${choreType === 'dailyChores' ? 'Daily' : 'Weekly'} Chore`;
    document.getElementById('choreName').value = '';
    document.getElementById('chorePoints').value = '';
    document.getElementById('choreModal').style.display = 'block';

    document.getElementById('saveChoreBtn').onclick = addChore;
}

// Edit chore
function editChore(kidName, choreType, choreIndex, name, points) {
    currentChoreType = choreType;
    currentChoreIndex = choreIndex;

    document.getElementById('modalTitle').textContent =
        `Edit ${choreType === 'dailyChores' ? 'Daily' : 'Weekly'} Chore`;
    document.getElementById('choreName').value = name;
    document.getElementById('chorePoints').value = points;
    document.getElementById('choreModal').style.display = 'block';

    document.getElementById('saveChoreBtn').onclick = updateChore;
}

// Add new chore
async function addChore() {
    const name = document.getElementById('choreName').value;
    const points = document.getElementById('chorePoints').value;

    if (!name || !points) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`/chores/api/add/${currentKidName}/${currentChoreType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, points: parseInt(points) })
        });

        if (response.ok) {
            closeChoreModal();
            location.reload(); // Reload to show new chore
        } else {
            alert('Failed to add chore');
        }
    } catch (error) {
        console.error('Error adding chore:', error);
        alert('Error adding chore');
    }
}

// Update existing chore
async function updateChore() {
    const name = document.getElementById('choreName').value;
    const points = document.getElementById('chorePoints').value;

    if (!name || !points) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`/chores/api/edit/${currentKidName}/${currentChoreType}/${currentChoreIndex}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, points: parseInt(points) })
        });

        if (response.ok) {
            closeChoreModal();
            location.reload(); // Reload to show updated chore
        } else {
            alert('Failed to update chore');
        }
    } catch (error) {
        console.error('Error updating chore:', error);
        alert('Error updating chore');
    }
}

// Delete chore
async function deleteChore(kidName, choreType, choreIndex) {
    if (!confirm('Are you sure you want to delete this chore?')) {
        return;
    }

    try {
        const response = await fetch(`/chores/api/delete/${kidName}/${choreType}/${choreIndex}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            location.reload(); // Reload to show updated list
        } else {
            alert('Failed to delete chore');
        }
    } catch (error) {
        console.error('Error deleting chore:', error);
        alert('Error deleting chore');
    }
}

// Close modal
function closeChoreModal() {
    document.getElementById('choreModal').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function (event) {
    const modal = document.getElementById('choreModal');
    if (event.target == modal) {
        closeChoreModal();
    }
}

// === FIREWORKS ANIMATION ===

let fireworksShown = false;

// Trigger fireworks animation when all chores are complete
function triggerFireworks() {
    console.log('triggerFireworks called, fireworksShown:', fireworksShown);

    // Only show once per session
    if (fireworksShown) {
        console.log('Fireworks already shown this session');
        return;
    }
    fireworksShown = true;

    const overlay = document.getElementById('fireworksOverlay');
    const container = document.getElementById('fireworksContainer');
    const message = document.getElementById('fireworksMessage');

    console.log('Firework elements:', { overlay, container, message });

    // Check if elements exist
    if (!overlay || !container || !message) {
        console.error('Firework elements not found in DOM!');
        fireworksShown = false; // Reset so it can try again
        return;
    }

    // Activate overlay and message
    overlay.classList.add('active');
    message.classList.add('active');
    container.classList.add('active');

    // Create multiple fireworks bursts
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
    const numberOfBursts = 15;

    for (let i = 0; i < numberOfBursts; i++) {
        setTimeout(() => {
            createFirework(container, colors);
        }, i * 200);
    }

    // Clean up after 3 seconds
    setTimeout(() => {
        overlay.classList.remove('active');
        message.classList.remove('active');
        container.classList.remove('active');
        container.innerHTML = '';
        // Reset so fireworks can show again if user unchecks and rechecks
        setTimeout(() => {
            fireworksShown = false;
        }, 1000);
    }, 3000);
}

// Create a single firework explosion
function createFirework(container, colors) {
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight * (0.3 + Math.random() * 0.4);

    const particleCount = 40;
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        particle.style.backgroundColor = color;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 100 + Math.random() * 100;
        const dx = Math.cos(angle) * velocity;
        const dy = Math.sin(angle) * velocity;

        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);

        // Use CSS variables for particle animation
        particle.style.animation = `none`;
        particle.offsetHeight; // Trigger reflow
        particle.style.animation = `particleExplosion 1s ease-out forwards`;

        // Apply transform for explosion effect
        const finalX = x + dx;
        const finalY = y + dy;

        particle.animate([
            { transform: `translate(0, 0) scale(1)`, opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 }
        ], {
            duration: 1000,
            easing: 'ease-out'
        });

        container.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}