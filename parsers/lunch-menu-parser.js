const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

/**
 * Parse a lunch menu document (PDF or Word) and extract menu items by date
 * @param {string} filePath - Path to the document file
 * @returns {Promise<Object>} - Parsed menu data organized by date
 */
async function parseLunchMenuDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return await parseLunchMenuPDF(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    return await parseLunchMenuWord(filePath);
  } else {
    return {
      success: false,
      error: 'Unsupported file type. Please upload a PDF or Word document.',
      menuData: {}
    };
  }
}

/**
 * Parse a lunch menu PDF and extract menu items by date
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} - Parsed menu data organized by date
 */
async function parseLunchMenuPDF(pdfPath) {
  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(pdfPath);

    // Extract text from PDF
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // Parse the text to extract menu items
    const menuData = parseMenuText(text);

    return {
      success: true,
      menuData: menuData,
      rawText: text
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return {
      success: false,
      error: error.message,
      menuData: {}
    };
  }
}

/**
 * Parse a lunch menu Word document and extract menu items by date
 * @param {string} docPath - Path to the Word document file
 * @returns {Promise<Object>} - Parsed menu data organized by date
 */
async function parseLunchMenuWord(docPath) {
  try {
    // Extract text from Word document
    const result = await mammoth.extractRawText({ path: docPath });
    const text = result.value;

    // Parse the text to extract menu items
    const menuData = parseMenuText(text);

    return {
      success: true,
      menuData: menuData,
      rawText: text
    };
  } catch (error) {
    console.error('Error parsing Word document:', error);
    return {
      success: false,
      error: error.message,
      menuData: {}
    };
  }
}

/**
 * Parse menu text and organize by date
 * @param {string} text - Raw text from PDF or Word document
 * @returns {Object} - Menu organized by date
 */
function parseMenuText(text) {
  const menuData = {};

  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentDate = null;
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for date patterns (MM/DD/YYYY, MM/DD, etc.)
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,  // MM/DD/YYYY
      /(\d{1,2})\/(\d{1,2})/,              // MM/DD
      /(\d{1,2})-(\d{1,2})-(\d{2,4})/,    // MM-DD-YYYY
      /(\d{1,2})-(\d{1,2})/                // MM-DD
    ];

    let foundDate = null;
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        foundDate = match[0];
        break;
      }
    }

    // If we found a date, start collecting items for this date
    if (foundDate) {
      currentDate = foundDate;

      // Determine the day of the week from the date
      const dateParts = foundDate.split(/[\/\-]/);
      let month = parseInt(dateParts[0]);
      let day = parseInt(dateParts[1]);
      let year = dateParts.length >= 3 ? parseInt(dateParts[2]) : new Date().getFullYear();

      if (year < 100) {
        year += 2000;
      }

      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dayNames[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1] || '';

      if (!menuData[currentDate]) {
        menuData[currentDate] = {
          day: dayOfWeek,
          date: currentDate,
          items: []
        };
      }
      continue;
    }

    // If we have a current date, add menu items
    if (currentDate) {
      // Skip common headers/footers and day names
      const skipPatterns = [
        /^menu$/i,
        /^lunch$/i,
        /^breakfast$/i,
        /^week of/i,
        /^page \d+$/i,
        /^[\d\/\-]+$/,  // Lines with only dates
        /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,  // Day names alone
        /^choice of/i,   // Common menu phrases
        /^K-\d+/i,       // Grade levels
        /^november|december|january|february|march|april|may|june|july|august|september|october$/i, // Month names
        /institution.*equal opportunity/i,  // Footer text
        /menus are subject to change/i,  // Footer text
        /in addition to/i,  // Footer text
        /variety of/i,  // Footer text
        /signature salad/i,  // Footer text
        /side salad/i  // Footer text
      ];

      let shouldSkip = false;
      for (const pattern of skipPatterns) {
        if (pattern.test(line)) {
          shouldSkip = true;
          break;
        }
      }

      // Also skip very short lines (less than 4 chars) or very long lines (likely descriptions)
      if (!shouldSkip && line.length >= 4 && line.length < 100) {
        // This looks like a menu item
        menuData[currentDate].items.push(line);
      }
    }
  }

  return menuData;
}

/**
 * Parse menu text with a more flexible approach for different formats
 * Tries to detect sections and categories
 * @param {string} text - Raw text from PDF
 * @returns {Object} - Menu organized by date with categories
 */
function parseMenuTextAdvanced(text) {
  const menuData = {};

  // Common categories in school lunch menus
  const categories = ['Entree', 'Main', 'Side', 'Vegetable', 'Fruit', 'Milk', 'Drink', 'Dessert', 'Snack'];

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentDay = null;
  let currentDate = null;
  let currentCategory = null;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  for (const line of lines) {
    // Check for day names
    let foundDay = null;
    for (const day of dayNames) {
      if (line.includes(day)) {
        foundDay = day;
        break;
      }
    }

    if (foundDay) {
      currentDay = foundDay;

      // Extract date if present
      const dateMatch = line.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      if (dateMatch) {
        currentDate = dateMatch[1];
      } else {
        // Use day name as key if no date found
        currentDate = currentDay;
      }

      if (!menuData[currentDate]) {
        menuData[currentDate] = {
          day: currentDay,
          date: currentDate,
          items: [],
          categories: {}
        };
      }
      continue;
    }

    // Check for categories
    let foundCategory = null;
    for (const cat of categories) {
      if (line.toLowerCase().includes(cat.toLowerCase()) && line.length < 30) {
        foundCategory = cat;
        currentCategory = cat;
        break;
      }
    }

    if (foundCategory && currentDate) {
      if (!menuData[currentDate].categories[foundCategory]) {
        menuData[currentDate].categories[foundCategory] = [];
      }
      continue;
    }

    // Add menu item to current date
    if (currentDate && line.length > 3 && line.length < 100) {
      // Filter out common non-menu text
      if (!/^(menu|week|page|school|district)/i.test(line)) {
        if (currentCategory && menuData[currentDate].categories[currentCategory]) {
          menuData[currentDate].categories[currentCategory].push(line);
        }
        menuData[currentDate].items.push(line);
      }
    }
  }

  return menuData;
}

/**
 * Convert date string to ISO format (YYYY-MM-DD)
 * @param {string} dateStr - Date string (MM/DD, MM/DD/YYYY, etc.)
 * @param {number} year - Year to use if not in date string
 * @param {number} month - Month to use for context
 * @returns {string} - ISO date string
 */
function normalizeDate(dateStr, year = new Date().getFullYear(), month = null) {
  const parts = dateStr.split(/[\/\-]/);

  if (parts.length >= 2) {
    let m = parseInt(parts[0]);
    let d = parseInt(parts[1]);
    let y = parts.length >= 3 ? parseInt(parts[2]) : year;

    // Handle 2-digit years
    if (y < 100) {
      y += 2000;
    }

    // Create date string in ISO format
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return dateStr;
}

module.exports = {
  parseLunchMenuDocument,
  parseLunchMenuPDF,
  parseLunchMenuWord,
  parseMenuText,
  parseMenuTextAdvanced,
  normalizeDate
};
