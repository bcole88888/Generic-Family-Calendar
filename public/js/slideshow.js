// Scattered Photo Slideshow functionality

let slideshowPhotos = [];
let activePhotos = [];
let slideshowInterval = null;
let addPhotoInterval = null;
let headerPhotoInterval = null;
let currentHeaderPhotoIndex = 0;

// Configuration - slideshow settings
const SLIDESHOW_CONFIG = {
    intervalMinutes: 2, // Overall cycle time
    enabled: true,
    maxPhotosOnScreen: 10, // Maximum number of photos visible at once
    addPhotoIntervalSeconds: 30, // Add a new photo every 30 seconds (2 per minute)
    photoLifetimeMinutes: 5, // How long each photo stays on screen
    headerPhotoIntervalSeconds: 10 // Change header photo every 10 seconds
};

// Photo size classes for variety
const PHOTO_SIZES = ['size-small', 'size-medium', 'size-large', 'size-wide', 'size-tall'];

// Initialize slideshow
async function initializeSlideshow() {
    console.log('Scattered slideshow initialization started.');
    console.log('SLIDESHOW_CONFIG.enabled:', SLIDESHOW_CONFIG.enabled);

    if (!SLIDESHOW_CONFIG.enabled) {
        console.log('Slideshow is disabled - but header slideshow should still work');
        // Still try to load photos for header slideshow
        try {
            await loadSlideshowPhotos();
            if (slideshowPhotos.length > 0) {
                console.log(`Starting header slideshow only with ${slideshowPhotos.length} photos`);
                startHeaderSlideshow();
            }
        } catch (error) {
            console.error('Error loading photos for header slideshow:', error);
        }
        return;
    }

    try {
        await loadSlideshowPhotos();
        if (slideshowPhotos.length > 0) {
            console.log(`Successfully loaded ${slideshowPhotos.length} photos, starting slideshow`);
            startScatteredSlideshow();
            startHeaderSlideshow();
        } else {
            console.log('No photos found, slideshow will not start');
        }
    } catch (error) {
        console.error('Error initializing slideshow:', error);
    }
}

// Load photos from uploaded files
async function loadSlideshowPhotos() {
    console.log('loadSlideshowPhotos function called.');
    try {
        console.log('Loading photos from uploaded files...');
        const response = await fetch('/photos/api/slideshow/photos');

        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received response from the server:', data);
        slideshowPhotos = data.photos || [];

        console.log(`Loaded ${slideshowPhotos.length} photos for slideshow`);
        return slideshowPhotos;
    } catch (error) {
        console.error('Error loading slideshow photos:', error);
        slideshowPhotos = [];
        return [];
    }
}

// Start the scattered slideshow
function startScatteredSlideshow() {
    if (slideshowPhotos.length === 0) {
        console.log('No photos available for slideshow');
        return;
    }

    console.log(`Starting scattered slideshow with ${slideshowPhotos.length} photos`);

    // Create or get the slideshow container
    let slideshowElement = document.getElementById('background-slideshow');
    if (!slideshowElement) {
        slideshowElement = document.createElement('div');
        slideshowElement.id = 'background-slideshow';
        slideshowElement.className = 'background-slideshow';
        document.body.insertBefore(slideshowElement, document.body.firstChild);
    }

    // Add initial 10 photos quickly
    for (let i = 0; i < Math.min(10, slideshowPhotos.length); i++) {
        setTimeout(() => addScatteredPhoto(), i * 300); // 300ms between initial photos
    }

    // Set up interval to add new photos
    addPhotoInterval = setInterval(() => {
        addScatteredPhoto();
    }, SLIDESHOW_CONFIG.addPhotoIntervalSeconds * 1000);
}

// Start the header slideshow
function startHeaderSlideshow() {
    if (slideshowPhotos.length === 0) {
        console.log('No photos available for header slideshow');
        return;
    }

    console.log(`Starting header slideshow with ${slideshowPhotos.length} photos`);

    // Wait for DOM to be ready, then show first photo
    setTimeout(() => {
        updateHeaderPhoto();
    }, 100);

    // Set up interval to change header photos
    headerPhotoInterval = setInterval(() => {
        updateHeaderPhoto();
    }, SLIDESHOW_CONFIG.headerPhotoIntervalSeconds * 1000);
}

// Update the header photo to the next one
function updateHeaderPhoto() {
    const headerPhotoElement = ensureHeaderPhotoElement();

    if (!headerPhotoElement) {
        console.error('Header photo element could not be created!');
        return;
    }

    if (slideshowPhotos.length === 0) {
        console.log('No photos available for header');
        return;
    }

    // Get the current photo
    const currentPhoto = slideshowPhotos[currentHeaderPhotoIndex];

    // Update the background image with a smooth transition
    headerPhotoElement.style.backgroundImage = `url("${currentPhoto.url}")`;

    // Move to next photo (cycle through all photos)
    currentHeaderPhotoIndex = (currentHeaderPhotoIndex + 1) % slideshowPhotos.length;

    console.log(`Header photo updated to: ${currentPhoto.filename}`);
}

// Add a new scattered photo to the screen
function addScatteredPhoto() {
    if (slideshowPhotos.length === 0) return;

    // Remove oldest photo if we're at max capacity
    if (activePhotos.length >= SLIDESHOW_CONFIG.maxPhotosOnScreen) {
        removeOldestPhoto();
    }

    // Get a random photo
    const photo = slideshowPhotos[Math.floor(Math.random() * slideshowPhotos.length)];

    // Generate random position and properties
    const position = generateRandomPosition();
    const size = PHOTO_SIZES[Math.floor(Math.random() * PHOTO_SIZES.length)];
    const rotation = (Math.random() - 0.5) * 30; // Random rotation between -15 and 15 degrees

    // Create photo element
    const photoElement = createPhotoElement(photo, position, size, rotation);

    // Add to container
    const slideshowElement = document.getElementById('background-slideshow');
    if (slideshowElement) {
        slideshowElement.appendChild(photoElement);

        // Track the photo
        const photoData = {
            element: photoElement,
            addedTime: Date.now(),
            photo: photo
        };
        activePhotos.push(photoData);

        // Animate in
        setTimeout(() => {
            photoElement.classList.add('visible');
        }, 100);

        // Schedule removal
        setTimeout(() => {
            removePhoto(photoData);
        }, SLIDESHOW_CONFIG.photoLifetimeMinutes * 60 * 1000);

        console.log(`Added scattered photo: ${photo.filename} at position (${position.x}%, ${position.y}%)`);
    }
}

// Generate random position avoiding main content areas
function generateRandomPosition() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Define safe zones (areas where we should avoid placing photos) - expanded for larger photos
    const safeZones = [
        // Header area (expanded)
        { x: 0, y: 0, width: 100, height: 25 },
        // Main content center (expanded protection)
        { x: 5, y: 10, width: 90, height: 80 },
        // Bottom connection status area (expanded)
        { x: 70, y: 80, width: 30, height: 20 }
    ];

    let position;
    let attempts = 0;
    const maxAttempts = 50;

    do {
        // Generate random position as percentage (expanded range for smaller photos)
        position = {
            x: Math.random() * 80, // 0-80% of viewport width
            y: Math.random() * 80  // 0-80% of viewport height
        };
        attempts++;
    } while (attempts < maxAttempts && isInSafeZone(position, safeZones));

    return position;
}

// Check if position overlaps with safe zones
function isInSafeZone(position, safeZones) {
    const photoSize = 500; // Updated max photo size for collision detection (half of previous)
    const photoWidthPercent = (photoSize / window.innerWidth) * 100;
    const photoHeightPercent = (photoSize / window.innerHeight) * 100;

    return safeZones.some(zone => {
        return position.x < zone.x + zone.width &&
               position.x + photoWidthPercent > zone.x &&
               position.y < zone.y + zone.height &&
               position.y + photoHeightPercent > zone.y;
    });
}

// Create a photo element with random properties
function createPhotoElement(photo, position, size, rotation) {
    const photoElement = document.createElement('div');
    photoElement.className = `scattered-photo ${size}`;
    photoElement.style.backgroundImage = `url("${photo.url}")`;
    photoElement.style.left = `${position.x}%`;
    photoElement.style.top = `${position.y}%`;
    photoElement.style.transform = `rotate(${rotation}deg)`;
    photoElement.style.zIndex = Math.floor(Math.random() * 10) - 20; // Random z-index between -20 and -10

    return photoElement;
}

// Remove the oldest photo from the screen
function removeOldestPhoto() {
    if (activePhotos.length === 0) return;

    const oldestPhoto = activePhotos[0];
    removePhoto(oldestPhoto);
}

// Remove a specific photo with animation
function removePhoto(photoData) {
    const index = activePhotos.indexOf(photoData);
    if (index === -1) return;

    // Remove from tracking array
    activePhotos.splice(index, 1);

    // Animate out
    photoData.element.classList.add('fade-out');

    // Remove from DOM after animation
    setTimeout(() => {
        if (photoData.element.parentNode) {
            photoData.element.parentNode.removeChild(photoData.element);
        }
    }, 2000);

    console.log(`Removed scattered photo: ${photoData.photo.filename}`);
}

// Go to next slide (for compatibility with existing controls)
function nextSlide() {
    // Add a new photo immediately
    addScatteredPhoto();
}

// Stop slideshow
function stopSlideshow() {
    if (addPhotoInterval) {
        clearInterval(addPhotoInterval);
        addPhotoInterval = null;
    }

    if (headerPhotoInterval) {
        clearInterval(headerPhotoInterval);
        headerPhotoInterval = null;
    }

    // Clear header photo
    const headerPhotoElement = document.getElementById('headerSlideshowPhoto');
    if (headerPhotoElement) {
        headerPhotoElement.style.backgroundImage = '';
    }

    // Remove all active photos
    activePhotos.forEach(photoData => {
        if (photoData.element.parentNode) {
            photoData.element.parentNode.removeChild(photoData.element);
        }
    });
    activePhotos = [];
}

// Configuration functions
function setSlideshowEnabled(enabled) {
    SLIDESHOW_CONFIG.enabled = enabled;

    if (enabled) {
        initializeSlideshow();
    } else {
        stopSlideshow();
        // Remove slideshow element
        const slideshowElement = document.getElementById('background-slideshow');
        if (slideshowElement) {
            slideshowElement.remove();
        }
    }
}

// Refresh slideshow photos
async function refreshSlideshowPhotos() {
    await loadSlideshowPhotos();
    if (slideshowPhotos.length > 0 && SLIDESHOW_CONFIG.enabled) {
        // Restart slideshow with new photos
        stopSlideshow();
        startScatteredSlideshow();
        startHeaderSlideshow();
    }
}

// Set slideshow interval
function setSlideshowInterval(minutes) {
    SLIDESHOW_CONFIG.intervalMinutes = minutes;
    SLIDESHOW_CONFIG.addPhotoIntervalSeconds = Math.max(10, (minutes * 60) / 3); // Add 3 photos per interval

    // Restart slideshow with new interval
    if (addPhotoInterval) {
        stopSlideshow();
        startScatteredSlideshow();
        startHeaderSlideshow();
    }
}

// Ensure header photo element exists
function ensureHeaderPhotoElement() {
    let headerPhotoElement = document.getElementById('headerSlideshowPhoto');

    if (!headerPhotoElement) {
        console.log('Header photo element not found, creating it dynamically...');

        const header = document.querySelector('.header');
        if (!header) {
            console.error('Header element not found!');
            return null;
        }

        const title = header.querySelector('h1');
        const controls = header.querySelector('.header-controls');

        if (!title || !controls) {
            console.error('Header structure not as expected');
            return null;
        }

        // Create the photo container
        const photoContainer = document.createElement('div');
        photoContainer.className = 'header-photo-container';

        // Create the photo element
        headerPhotoElement = document.createElement('div');
        headerPhotoElement.className = 'header-slideshow-photo';
        headerPhotoElement.id = 'headerSlideshowPhoto';

        // Assemble and insert
        photoContainer.appendChild(headerPhotoElement);
        header.insertBefore(photoContainer, controls);

        console.log('Header photo element created successfully');
    }

    return headerPhotoElement;
}

// Initialize slideshow when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Minimal delay to ensure other components are loaded
    setTimeout(() => {
        // Ensure the header photo element exists first
        ensureHeaderPhotoElement();
        initializeSlideshow();
    }, 500);
});

// Export functions for global access
if (typeof window !== 'undefined') {
    window.slideshowControls = {
        setEnabled: setSlideshowEnabled,
        setInterval: setSlideshowInterval,
        refresh: refreshSlideshowPhotos,
        next: nextSlide,
        photos: () => slideshowPhotos,
        currentIndex: () => activePhotos.length,
        config: () => SLIDESHOW_CONFIG,
        addPhoto: addScatteredPhoto,
        updateHeaderPhoto: updateHeaderPhoto,
        nextHeaderPhoto: () => updateHeaderPhoto()
    };

    // Also make functions globally available for easier debugging
    window.setSlideshowEnabled = setSlideshowEnabled;
    window.nextSlide = nextSlide;
    window.refreshSlideshowPhotos = refreshSlideshowPhotos;
    window.addScatteredPhoto = addScatteredPhoto;
    window.updateHeaderPhoto = updateHeaderPhoto;
    window.startHeaderSlideshow = startHeaderSlideshow;
    window.initializeSlideshow = initializeSlideshow;

    // Manual test function
    window.testHeaderPhoto = async function() {
        console.log('Manual test function called');
        await loadSlideshowPhotos();
        console.log('Photos loaded:', slideshowPhotos.length);
        if (slideshowPhotos.length > 0) {
            updateHeaderPhoto();
        }
    };

    // Debug function to check if element exists
    window.checkHeaderElement = function() {
        const el = document.getElementById('headerSlideshowPhoto');
        console.log('headerSlideshowPhoto element:', el);
        console.log('All elements with header in ID:', document.querySelectorAll('[id*="header"]'));
        return el;
    };
}