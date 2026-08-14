const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseLunchMenuDocument, normalizeDate } = require('../parsers/lunch-menu-parser');
const JsonStore = require('../services/json-store');

// Configure multer for PDF and Word document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'lunch-menus');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'menu-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDFs and Word documents
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Path to lunch menu data file
const dataFilePath = path.join(__dirname, '..', 'data', 'lunch-menu.json');
const store = new JsonStore(dataFilePath, { menus: {} });

/**
 * Load lunch menu data from file
 */
function loadMenuData() {
  return store.read();
}

/**
 * Save lunch menu data to file (atomic write)
 */
function saveMenuData(data) {
  return store.write(data);
}

/**
 * GET /lunch-menu/api/menus
 * Get all lunch menus
 */
router.get('/api/menus', (req, res) => {
  try {
    const data = loadMenuData();
    res.json(data);
  } catch (error) {
    console.error('Error getting menus:', error);
    res.status(500).json({ error: 'Failed to load menus' });
  }
});

/**
 * GET /lunch-menu/api/menu/today
 * Get today's menu
 */
router.get('/api/menu/today', (req, res) => {
  try {
    // Get today's date in local timezone (not UTC)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const data = loadMenuData();

    if (data.menus[today]) {
      res.json(data.menus[today]);
    } else {
      res.json({ date: today, items: [], message: 'No menu found for today' });
    }
  } catch (error) {
    console.error('Error getting today\'s menu:', error);
    res.status(500).json({ error: 'Failed to load today\'s menu' });
  }
});

/**
 * GET /lunch-menu/api/menu/:date
 * Get menu for a specific date (YYYY-MM-DD format)
 */
router.get('/api/menu/:date', (req, res) => {
  try {
    const date = req.params.date;
    const data = loadMenuData();

    if (data.menus[date]) {
      res.json(data.menus[date]);
    } else {
      res.json({ date: date, items: [], message: 'No menu found for this date' });
    }
  } catch (error) {
    console.error('Error getting menu for date:', error);
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

/**
 * POST /lunch-menu/api/upload
 * Upload a lunch menu PDF or Word document and parse it
 */
router.post('/api/upload', upload.single('menuPdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Parse the document (PDF or Word)
    const parseResult = await parseLunchMenuDocument(filePath);

    if (!parseResult.success) {
      return res.status(500).json({
        error: 'Failed to parse PDF',
        details: parseResult.error
      });
    }

    // Load existing menu data
    const data = loadMenuData();

    // Add or update menus from parsed data
    const year = new Date().getFullYear();
    let addedCount = 0;

    for (const [dateKey, menuInfo] of Object.entries(parseResult.menuData)) {
      // Try to normalize the date
      const normalizedDate = normalizeDate(dateKey, year);

      // Store the menu
      data.menus[normalizedDate] = {
        day: menuInfo.day,
        date: normalizedDate,
        items: menuInfo.items,
        categories: menuInfo.categories || {},
        uploadedAt: new Date().toISOString(),
        sourceFile: req.file.filename
      };
      addedCount++;
    }

    // Save updated data
    if (saveMenuData(data)) {
      res.json({
        success: true,
        message: `Successfully parsed and added ${addedCount} menu(s)`,
        menusAdded: addedCount,
        fileName: req.file.filename,
        rawText: parseResult.rawText
      });
    } else {
      res.status(500).json({ error: 'Failed to save menu data' });
    }
  } catch (error) {
    console.error('Error uploading menu:', error);
    res.status(500).json({ error: 'Failed to upload and parse menu', details: error.message });
  }
});

/**
 * POST /lunch-menu/api/menu
 * Manually add or update a menu for a specific date
 */
router.post('/api/menu', (req, res) => {
  try {
    const { date, day, items, categories } = req.body;

    if (!date || !items) {
      return res.status(400).json({ error: 'Date and items are required' });
    }

    const data = loadMenuData();

    data.menus[date] = {
      day: day || '',
      date: date,
      items: Array.isArray(items) ? items : [items],
      categories: categories || {},
      updatedAt: new Date().toISOString()
    };

    if (saveMenuData(data)) {
      res.json({ success: true, message: 'Menu saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save menu' });
    }
  } catch (error) {
    console.error('Error saving menu:', error);
    res.status(500).json({ error: 'Failed to save menu', details: error.message });
  }
});

/**
 * DELETE /lunch-menu/api/menu/:date
 * Delete menu for a specific date
 */
router.delete('/api/menu/:date', (req, res) => {
  try {
    const date = req.params.date;
    const data = loadMenuData();

    if (data.menus[date]) {
      delete data.menus[date];

      if (saveMenuData(data)) {
        res.json({ success: true, message: 'Menu deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to save changes' });
      }
    } else {
      res.status(404).json({ error: 'Menu not found for this date' });
    }
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ error: 'Failed to delete menu', details: error.message });
  }
});

/**
 * DELETE /lunch-menu/api/menus/all
 * Clear all menus
 */
router.delete('/api/menus/all', (req, res) => {
  try {
    const data = { menus: {} };

    if (saveMenuData(data)) {
      res.json({ success: true, message: 'All menus cleared' });
    } else {
      res.status(500).json({ error: 'Failed to clear menus' });
    }
  } catch (error) {
    console.error('Error clearing menus:', error);
    res.status(500).json({ error: 'Failed to clear menus', details: error.message });
  }
});

/**
 * GET /lunch-menu/api/date-range
 * Get menus for a date range
 */
router.get('/api/date-range', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const data = loadMenuData();
    const filteredMenus = {};

    for (const [date, menu] of Object.entries(data.menus)) {
      if (date >= startDate && date <= endDate) {
        filteredMenus[date] = menu;
      }
    }

    res.json({ menus: filteredMenus });
  } catch (error) {
    console.error('Error getting date range:', error);
    res.status(500).json({ error: 'Failed to get menus for date range' });
  }
});

module.exports = router;
