const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const settingsStore = require('../services/settings-store');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'slideshow');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Get all uploaded photos for slideshow
function getSlideshowPhotos() {
    const slideshowDir = path.join(__dirname, '..', 'public', 'uploads', 'slideshow');

    if (!fs.existsSync(slideshowDir)) {
        return [];
    }

    const files = fs.readdirSync(slideshowDir);
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
    });

    return imageFiles.map(file => {
        const filePath = path.join(slideshowDir, file);
        const stats = fs.statSync(filePath);
        return {
            id: file,
            url: `/uploads/slideshow/${file}`,
            filename: file,
            creationTime: stats.mtime.toISOString(),
            size: stats.size
        };
    }).sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime)); // Sort by newest first
}

// API endpoint to get photos for slideshow
router.get('/api/slideshow/photos', (req, res) => {
    try {
        const photos = getSlideshowPhotos();

        res.json({
            photos: photos,
            count: photos.length
        });
    } catch (error) {
        console.error('Error fetching slideshow photos:', error);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

// API endpoint to upload photos
router.post('/api/upload', upload.array('photos', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: `/uploads/slideshow/${file.filename}`
        }));

        res.json({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} photo(s)`,
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Error uploading photos:', error);
        res.status(500).json({ error: 'Failed to upload photos' });
    }
});

// API endpoint to delete a photo
router.delete('/api/photos/:filename', (req, res) => {
    try {
        const slideshowDir = path.join(__dirname, '..', 'public', 'uploads', 'slideshow');
        // Strip any path components to prevent directory traversal
        const filename = path.basename(req.params.filename);
        const filePath = path.join(slideshowDir, filename);

        // Ensure the resolved path stays inside the slideshow directory
        if (path.dirname(filePath) !== slideshowDir) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Photo deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// Configuration page route
router.get('/config', (req, res) => {
    res.render('slideshow-config', { appTitle: settingsStore.read().appTitle });
});

// Upload page route
router.get('/upload', (req, res) => {
    res.render('photo-upload', { appTitle: settingsStore.read().appTitle });
});

module.exports = router;