// Lunch Menu functionality

// Escape user-provided text before inserting into innerHTML
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let allMenusData = {};

/**
 * Initialize lunch menu functionality
 */
function initializeLunchMenu() {
  // Set up upload form handler
  const uploadForm = document.getElementById('lunchMenuUploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleMenuUpload);
  }

  // Set today's date as default in date picker
  const datePicker = document.getElementById('menuDatePicker');
  if (datePicker) {
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
  }

  // Load all menus data
  loadAllMenus();
}

/**
 * Handle menu PDF upload
 */
async function handleMenuUpload(event) {
  event.preventDefault();

  const fileInput = document.getElementById('menuPdfInput');
  const statusDiv = document.getElementById('uploadStatus');

  if (!fileInput.files || fileInput.files.length === 0) {
    showUploadStatus('Please select a file', 'error');
    return;
  }

  const file = fileInput.files[0];

  // Check if file is PDF or Word document
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    showUploadStatus('Please upload a PDF or Word document', 'error');
    return;
  }

  // Show loading state
  showUploadStatus('Uploading and parsing menu...', 'loading');

  const formData = new FormData();
  formData.append('menuPdf', file);

  try {
    const response = await fetch('/lunch-menu/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showUploadStatus(
        `✓ ${result.message || 'Menu uploaded successfully!'}`,
        'success'
      );

      // Clear file input
      fileInput.value = '';

      // Reload menus
      await loadAllMenus();

      // Refresh calendar if on calendar tab
      if (typeof loadCalendar === 'function') {
        loadCalendar();
      }
    } else {
      showUploadStatus(
        `Error: ${result.error || 'Failed to upload menu'}`,
        'error'
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    showUploadStatus('Error uploading menu. Please try again.', 'error');
  }
}

/**
 * Show upload status message
 */
function showUploadStatus(message, type) {
  const statusDiv = document.getElementById('uploadStatus');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `upload-status ${type}`;
  statusDiv.style.display = 'block';

  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

/**
 * Load all menus from server
 */
async function loadAllMenus() {
  try {
    const response = await fetch('/lunch-menu/api/menus');
    const data = await response.json();

    allMenusData = data.menus || {};

    // Regenerate calendar to show lunch menus now that data is loaded
    if (typeof generateCalendar === 'function') {
      generateCalendar();
    }

    return allMenusData;
  } catch (error) {
    console.error('Error loading menus:', error);
    return {};
  }
}

/**
 * Load and display menu for selected date
 */
async function loadMenuForDate() {
  const datePicker = document.getElementById('menuDatePicker');
  const menuPreview = document.getElementById('menuPreview');

  if (!datePicker || !menuPreview) return;

  const selectedDate = datePicker.value;

  if (!selectedDate) {
    menuPreview.innerHTML = '<p class="no-menu-message">Please select a date</p>';
    return;
  }

  try {
    const response = await fetch(`/lunch-menu/api/menu/${selectedDate}`);
    const menuData = await response.json();

    if (menuData.items && menuData.items.length > 0) {
      displayMenuPreview(menuData, menuPreview);
    } else {
      menuPreview.innerHTML = `
        <div class="no-menu-message">
          <i class="fas fa-info-circle"></i>
          <p>No lunch menu found for ${formatDate(selectedDate)}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading menu:', error);
    menuPreview.innerHTML = '<p class="error-message">Error loading menu</p>';
  }
}

/**
 * Display menu preview
 */
function displayMenuPreview(menuData, container) {
  let html = `
    <div class="menu-preview-header">
      <h4>${escapeHtml(menuData.day || '')} - ${formatDate(menuData.date)}</h4>
    </div>
    <div class="menu-items">
  `;

  if (menuData.categories && Object.keys(menuData.categories).length > 0) {
    // Display by categories
    for (const [category, items] of Object.entries(menuData.categories)) {
      if (items && items.length > 0) {
        html += `
          <div class="menu-category">
            <h5>${escapeHtml(category)}</h5>
            <ul>
              ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }
  } else {
    // Display as simple list
    html += `
      <ul class="menu-items-list">
        ${menuData.items.map(item => `<li><i class="fas fa-utensils"></i> ${escapeHtml(item)}</li>`).join('')}
      </ul>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Get lunch menu for a specific date
 */
function getLunchMenuForDate(dateString) {
  return allMenusData[dateString] || null;
}

/**
 * Show all menus view
 */
function showAllMenus() {
  const allMenusView = document.getElementById('allMenusView');
  const allMenusList = document.getElementById('allMenusList');

  if (!allMenusView || !allMenusList) return;

  // Toggle visibility
  if (allMenusView.style.display === 'none') {
    allMenusView.style.display = 'block';

    // Display all menus
    const menuDates = Object.keys(allMenusData).sort();

    if (menuDates.length === 0) {
      allMenusList.innerHTML = '<p class="no-menu-message">No menus uploaded yet</p>';
      return;
    }

    let html = '<div class="menus-grid">';

    menuDates.forEach(date => {
      const menu = allMenusData[date];
      html += `
        <div class="menu-card">
          <div class="menu-card-header">
            <h4>${escapeHtml(menu.day || '')}</h4>
            <span class="menu-date">${formatDate(date)}</span>
          </div>
          <div class="menu-card-body">
            ${menu.items.slice(0, 3).map(item => `<div class="menu-item-preview">${escapeHtml(item)}</div>`).join('')}
            ${menu.items.length > 3 ? `<div class="menu-more">+${menu.items.length - 3} more</div>` : ''}
          </div>
          <div class="menu-card-footer">
            <button class="btn-small btn-danger" onclick="deleteMenu('${date}')">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    allMenusList.innerHTML = html;
  } else {
    allMenusView.style.display = 'none';
  }
}

/**
 * Delete a specific menu
 */
async function deleteMenu(date) {
  if (!confirm(`Delete menu for ${formatDate(date)}?`)) {
    return;
  }

  try {
    const response = await fetch(`/lunch-menu/api/menu/${date}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Remove from local data
      delete allMenusData[date];

      // Refresh displays
      showAllMenus();
      showAllMenus(); // Toggle to refresh

      // Refresh calendar
      if (typeof loadCalendar === 'function') {
        loadCalendar();
      }

      showUploadStatus('Menu deleted successfully', 'success');
    } else {
      showToast('Failed to delete menu', 'error');
    }
  } catch (error) {
    console.error('Error deleting menu:', error);
    showToast('Error deleting menu', 'error');
  }
}

/**
 * Clear all menus
 */
async function clearAllMenus() {
  if (!confirm('Are you sure you want to delete ALL lunch menus? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch('/lunch-menu/api/menus/all', {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      allMenusData = {};

      // Refresh displays
      const allMenusView = document.getElementById('allMenusView');
      if (allMenusView) {
        allMenusView.style.display = 'none';
      }

      const menuPreview = document.getElementById('menuPreview');
      if (menuPreview) {
        menuPreview.innerHTML = '<p class="no-menu-message">Select a date to view the menu</p>';
      }

      // Refresh calendar
      if (typeof loadCalendar === 'function') {
        loadCalendar();
      }

      showUploadStatus('All menus cleared successfully', 'success');
    } else {
      showToast('Failed to clear menus', 'error');
    }
  } catch (error) {
    console.error('Error clearing menus:', error);
    showToast('Error clearing menus', 'error');
  }
}

/**
 * Format date string for display
 */
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Add lunch menu display to calendar day cell
 */
function addLunchMenuToCalendarDay(dayElement, dateString) {
  const menu = getLunchMenuForDate(dateString);

  if (menu && menu.items && menu.items.length > 0) {
    // Create lunch menu indicator
    const lunchIndicator = document.createElement('div');
    lunchIndicator.className = 'lunch-menu-indicator';
    lunchIndicator.innerHTML = `
      <i class="fas fa-hamburger"></i>
      <span class="lunch-preview">${escapeHtml(menu.items[0])}</span>
    `;

    // Add click handler to show full menu
    lunchIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      showLunchMenuModal(menu);
    });

    dayElement.appendChild(lunchIndicator);
  }
}

/**
 * Show lunch menu in a modal (could expand event modal or create new one)
 */
function showLunchMenuModal(menu) {
  // For now, create a simple alert. Can be enhanced later
  let message = `Lunch Menu for ${menu.day || ''} - ${formatDate(menu.date)}:\n\n`;

  if (menu.categories && Object.keys(menu.categories).length > 0) {
    for (const [category, items] of Object.entries(menu.categories)) {
      message += `${category}:\n`;
      items.forEach(item => {
        message += `  • ${item}\n`;
      });
      message += '\n';
    }
  } else {
    menu.items.forEach(item => {
      message += `• ${item}\n`;
    });
  }

  alert(message);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLunchMenu);
} else {
  initializeLunchMenu();
}
