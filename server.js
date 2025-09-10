const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Local PDF parsing function
async function parsePDFContent(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF content');
  }
}

// Local image parsing function using Tesseract OCR
async function parseImageContent(buffer) {
  try {
    // Convert image to a format Tesseract can handle
    const processedBuffer = await sharp(buffer)
      .resize(2000, null, { 
        withoutEnlargement: false,
        fit: 'inside'
      })
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
      logger: m => console.log(m)
    });
    
    return text;
  } catch (error) {
    console.error('Error parsing image:', error);
    throw new Error('Failed to parse image content');
  }
}

// Function to extract course data from text
function extractCourseDataFromText(textContent) {
  console.log('=== LOCAL TEXT PARSER ===');
  const courses = [];
  const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extract course information from the structured table
  const courseData = new Map();
  let currentCourseCode = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for course codes in various formats
    if (line.match(/^[A-Z]{2,4}\d{3,4}$/)) {
      currentCourseCode = line;
      console.log(`Found course: ${currentCourseCode}`);
      
      if (!courseData.has(currentCourseCode)) {
        courseData.set(currentCourseCode, {
          courseCode: currentCourseCode,
          schedules: [],
          rooms: []
        });
      }
    }
    
    // Spaced course code (ICE 109 -> ICE109)
    else if (line.match(/^[A-Z]{2,4}\s+\d{3,4}$/)) {
      currentCourseCode = line.replace(/\s+/g, '');
      console.log(`Found spaced course: ${line} -> ${currentCourseCode}`);
      
      if (!courseData.has(currentCourseCode)) {
        courseData.set(currentCourseCode, {
          courseCode: currentCourseCode,
          schedules: [],
          rooms: []
        });
      }
    }
    
    // Look for time patterns when we have a current course
    if (currentCourseCode && courseData.has(currentCourseCode)) {
      // Enhanced time pattern matching
      const timePattern = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
      const timeMatches = line.match(timePattern);
      
      if (timeMatches) {
        timeMatches.forEach(timeMatch => {
          const schedule = `${timeMatch}`;
          if (!courseData.get(currentCourseCode).schedules.includes(schedule)) {
            courseData.get(currentCourseCode).schedules.push(schedule);
            console.log(`Added schedule for ${currentCourseCode}: ${schedule}`);
          }
        });
      }
      
      // Look for room patterns
      const roomPatterns = [
        /Room\s*[:\-]?\s*([A-Z0-9\-\s]+)/gi,
        /\b([A-Z]{1,3}[-\s]?\d{2,4}[A-Z]?)\b/g,
        /\b(LT[-\s]?\d+)\b/gi,
        /\b(LAB[-\s]?\d+)\b/gi,
        /\b(ROOM[-\s]?\d+)\b/gi
      ];
      
      roomPatterns.forEach(pattern => {
        const roomMatches = line.match(pattern);
        if (roomMatches) {
          roomMatches.forEach(match => {
            const room = match.replace(/Room\s*[:\-]?\s*/gi, '').trim();
            if (room && !courseData.get(currentCourseCode).rooms.includes(room)) {
              courseData.get(currentCourseCode).rooms.push(room);
              console.log(`Added room for ${currentCourseCode}: ${room}`);
            }
          });
        }
      });
    }
  }
  
  // Convert map to array
  courseData.forEach((data, courseCode) => {
    if (data.schedules.length > 0 || data.rooms.length > 0) {
      courses.push({
        courseCode: courseCode,
        schedule: data.schedules.join(', ') || 'TBA',
        room: data.rooms.join(', ') || 'TBA'
      });
    }
  });
  
  console.log(`Extracted ${courses.length} courses from text`);
  return courses;
}

// Calculate extraction confidence based on local parsing
function calculateExtractionConfidence(courses, textContent) {
  if (!courses || courses.length === 0) {
    return 0;
  }
  
  const lines = textContent.split('\n');
  let confidence = 0;
  
  // Base confidence on number of courses found
  confidence += Math.min(courses.length * 10, 50);
  
  // Check for schedule data completeness
  const coursesWithSchedules = courses.filter(course => 
    course.schedule && course.schedule !== 'TBA' && course.schedule.includes(':')
  ).length;
  confidence += (coursesWithSchedules / courses.length) * 30;
  
  // Check for room data completeness
  const coursesWithRooms = courses.filter(course => 
    course.room && course.room !== 'TBA'
  ).length;
  confidence += (coursesWithRooms / courses.length) * 20;
  
  return Math.min(Math.round(confidence), 100);
}

// Get extraction method based on file type
function getExtractionMethod(fileType) {
  if (fileType === 'application/pdf') {
    return 'Local PDF Parser';
  } else if (fileType.startsWith('image/')) {
    return 'Tesseract OCR';
  } else {
    return 'Excel Parser';
  }
}

// Parse Excel/CSV files
function parseExcelFile(buffer, originalname) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Find the header row
    let headerRowIndex = -1;
    const possibleHeaders = ['course', 'subject', 'code', 'time', 'schedule', 'room'];
    
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (Array.isArray(row)) {
        const rowString = row.join(' ').toLowerCase();
        if (possibleHeaders.some(header => rowString.includes(header))) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find Course(s) header in the uploaded file');
    }

    const headers = jsonData[headerRowIndex].map(h => h ? h.toString().toLowerCase() : '');
    const courses = [];

    // Find column indices
    const courseCodeIndex = headers.findIndex(h => h.includes('course') || h.includes('subject') || h.includes('code'));
    const scheduleIndex = headers.findIndex(h => h.includes('time') || h.includes('schedule'));
    const roomIndex = headers.findIndex(h => h.includes('room') || h.includes('location'));

    // Process data rows
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (Array.isArray(row) && row.length > 0) {
        const courseCode = courseCodeIndex >= 0 ? (row[courseCodeIndex] || '').toString().trim() : '';
        const schedule = scheduleIndex >= 0 ? (row[scheduleIndex] || '').toString().trim() : '';
        const room = roomIndex >= 0 ? (row[roomIndex] || '').toString().trim() : '';

        if (courseCode) {
          courses.push({
            courseCode,
            schedule: schedule || 'TBA',
            room: room || 'TBA'
          });
        }
      }
    }

    return courses;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

// Main upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const { buffer, originalname, mimetype } = req.file;
    let courses = [];
    let textContent = '';
    let extractionMethod = getExtractionMethod(mimetype);

    console.log(`Processing file: ${originalname} (${mimetype})`);

    // Process based on file type - local parsing only
    if (mimetype === 'application/pdf') {
      console.log('Using local PDF parser');
      textContent = await parsePDFContent(buffer);
      courses = extractCourseDataFromText(textContent);
    } else if (mimetype.startsWith('image/')) {
      console.log('Using Tesseract OCR');
      textContent = await parseImageContent(buffer);
      courses = extractCourseDataFromText(textContent);
    } else if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype === 'text/csv') {
      console.log('Using Excel parser');
      courses = parseExcelFile(buffer, originalname);
      textContent = courses.map(c => `${c.courseCode} ${c.schedule} ${c.room}`).join('\n');
    } else {
      throw new Error('Unsupported file type');
    }

    // Calculate confidence
    const confidence = calculateExtractionConfidence(courses, textContent);
    
    // Determine if verification is needed (threshold: 70%)
    const needsVerification = confidence < 70 || courses.length === 0;

    console.log(`Extraction completed: ${courses.length} courses found (${confidence}% confidence)`);

    res.json({
      success: true,
      courses,
      metadata: {
        filename: originalname,
        extractionMethod,
        confidence,
        needsVerification,
        coursesFound: courses.length
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process file',
      metadata: {
        filename: req.file?.originalname || 'unknown',
        extractionMethod: 'Failed',
        confidence: 0,
        needsVerification: true,
        coursesFound: 0
      }
    });
  }
});

// API upload endpoint (for frontend compatibility)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded' 
      });
    }

    const { buffer, originalname, mimetype } = req.file;
    console.log(`📄 API Upload: ${originalname} (${mimetype})`);

    let courses = [];
    let extractionMethod = 'Local Parsing';
    
    // Handle different file types
    if (mimetype === 'application/pdf') {
      console.log('Processing PDF with local parser...');
      const text = await parsePDFContent(buffer);
      courses = extractCourseDataFromText(text);
      extractionMethod = 'Local PDF Parser';
    } else if (mimetype.startsWith('image/')) {
      console.log('Processing image with local OCR...');
      const text = await parseImageContent(buffer);
      courses = extractCourseDataFromText(text);
      extractionMethod = 'Local Tesseract OCR';
    } else if (mimetype.includes('sheet') || mimetype.includes('excel') || originalname.toLowerCase().endsWith('.csv')) {
      console.log('Processing Excel/CSV file...');
      const result = parseExcelFile(buffer, originalname);
      courses = result.courses;
      extractionMethod = 'Local Excel/CSV Parser';
    } else {
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload CSV, Excel, PDF, or Image files.' 
      });
    }

    if (courses.length === 0) {
      return res.status(400).json({ 
        error: 'No course data found in the file. Please check the file format.',
        fileType: mimetype,
        fileName: originalname
      });
    }

    // Return with metadata format that frontend expects
    const response = {
      courses: courses,
      metadata: {
        fileName: originalname,
        fileType: mimetype,
        extractedCount: courses.length,
        extractionMethod: extractionMethod,
        needsVerification: mimetype === 'application/pdf' || mimetype.startsWith('image/'),
        confidence: calculateExtractionConfidence(courses, ''),
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Successfully extracted ${courses.length} courses using ${extractionMethod}`);
    res.json(response);

  } catch (error) {
    console.error('API Upload error:', error);
    res.status(500).json({ 
      error: 'Error processing file: ' + error.message,
      fileType: req.file?.mimetype || 'unknown',
      fileName: req.file?.originalname || 'unknown'
    });
  }
});

// Debug endpoint for Vercel troubleshooting
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'Debug info',
    node_version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    env_vars: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      VERCEL: process.env.VERCEL || 'false'
    },
    dependencies_loaded: {
      express: !!express,
      cors: !!cors,
      multer: !!multer,
      xlsx: !!xlsx,
      pdfParse: !!pdfParse,
      tesseract: !!Tesseract,
      sharp: !!sharp
    }
  });
});

// API Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    parsing_methods: {
      pdf: 'pdf-parse (local)',
      images: 'Tesseract OCR (local)',
      excel_csv: 'xlsx parser (local)'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      pdfParser: 'available',
      tesseractOCR: 'available',
      excelParser: 'available'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available parsing methods:');
  console.log('- PDF: pdf-parse (local)');
  console.log('- Images: Tesseract OCR (local)');
  console.log('- Excel/CSV: xlsx parser (local)');
});

module.exports = app;
