const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

// Google Document AI setup
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'routinegenparse';
const GOOGLE_LOCATION = process.env.GOOGLE_LOCATION || 'us';
const GOOGLE_PROCESSOR_ID = process.env.GOOGLE_PROCESSOR_ID || '674477949cb16d50';

// Initialize Document AI client
let documentaiClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  // For Vercel deployment - use environment variable
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  documentaiClient = new DocumentProcessorServiceClient({ credentials });
} else {
  // For local development - use service account file
  const GOOGLE_KEY_PATH = path.join(__dirname, 'google-service-account.json');
  if (fs.existsSync(GOOGLE_KEY_PATH)) {
    documentaiClient = new DocumentProcessorServiceClient({ keyFile: GOOGLE_KEY_PATH });
  } else {
    console.warn('Google Document AI credentials not found. Document AI features will be disabled.');
  }
}

async function parseWithDocumentAI(buffer, mimetype) {
  if (!documentaiClient) {
    throw new Error('Google Document AI client not initialized. Please check credentials.');
  }
  
  const name = `projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/processors/${GOOGLE_PROCESSOR_ID}`;
  const request = {
    name,
    rawDocument: {
      content: buffer,
      mimeType: mimetype,
    },
  };
  try {
    const [result] = await documentaiClient.processDocument(request);
    return result.document;
  } catch (error) {
    console.error('Document AI error:', error);
    throw new Error('Failed to parse document with Google Document AI: ' + error.message);
  }
}

function extractCourseDataFromDocumentAI(documentJson) {
  let textContent = '';
  if (documentJson && documentJson.text) {
    textContent = documentJson.text;
  }
  return extractCourseDataFromText(textContent);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is working correctly',
    timestamp: new Date().toISOString()
  });
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const DAY_MAPPING = {
  'S': 'Sunday',
  'M': 'Monday', 
  'T': 'Tuesday',
  'W': 'Wednesday',
  'R': 'Thursday',
  'F': 'Friday',
  'A': 'Saturday'
};
function parseTimeWeekDay(timeWeekDayStr) {
  if (!timeWeekDayStr || timeWeekDayStr.trim() === '') {
    return [];
  }

  const match = timeWeekDayStr.match(/^([SMTWRA]+)\s+(.+)$/);
  if (!match) {
    return [];
  }

  const dayCodesStr = match[1];
  const timeStr = match[2];

  const timeMatch = timeStr.match(/(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);
  if (!timeMatch) {
    return [];
  }

  const startTime12 = timeMatch[1];
  const endTime12 = timeMatch[2];
  const startTime = convertTo24Hour(startTime12);
  const endTime = convertTo24Hour(endTime12);

  const days = [];
  for (let i = 0; i < dayCodesStr.length; i++) {
    const dayCode = dayCodesStr[i];
    if (DAY_MAPPING[dayCode]) {
      days.push(DAY_MAPPING[dayCode]);
    }
  }

  return days.map(day => ({
    day,
    startTime,
    endTime
  }));
}

function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(/([AP]M)/);
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Function to parse PDF files
// Function to parse PDF files
async function parsePDFContent(buffer) {
  try {
    console.log('Parsing PDF content...');
    const data = await pdfParse(buffer);
    console.log('PDF parsed successfully. Text length:', data.text.length);
    console.log('PDF text preview:', data.text.substring(0, 300));
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF: ' + error.message);
  }
}

// Function to parse image files using OCR
async function parseImageContent(buffer, mimetype) {
  try {
    console.log('Processing image with OCR...');
    console.log('Image mimetype:', mimetype);
    console.log('Image buffer size:', buffer.length);
    
    // Convert image to supported format if needed
    let processedBuffer = buffer;
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      console.log('Converting JPEG to PNG for better OCR...');
      processedBuffer = await sharp(buffer).png().toBuffer();
    }
    
    console.log('Starting Tesseract OCR...');
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    console.log('OCR completed. Text length:', text.length);
    console.log('OCR text preview:', text.substring(0, 300));
    return text;
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to parse image: ' + error.message);
  }
}

// Function to extract course data from text content
function extractCourseDataFromText(textContent) {
  console.log('Extracting course data from text...');
  console.log('Text content length:', textContent.length);
  console.log('First 500 characters of text:', textContent.substring(0, 500));
  
  const lines = textContent.split('\n');
  const courses = [];
  
  // Multiple regex patterns to try different formats
  const patterns = [
    // Pattern 1: Course code, day codes, time range (e.g., "CSE101 TR 10:00AM-11:30AM")
    /([A-Z]{2,4}\d{3,4}[A-Za-z\s]*)\s+([SMTWRFA]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/,
    
    // Pattern 2: More flexible course code, day codes, time range
    /([A-Z]{2,6}\d{3,4}[A-Za-z\s]*)\s+([SMTWRFA]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/,
    
    // Pattern 3: Course code with spaces, then days and times
    /([A-Z]{2,4}\s*\d{3,4}[A-Za-z\s]*)\s+([SMTWRFA]+)\s+(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)/,
    
    // Pattern 4: Look for Time-WeekDay pattern (like Excel format)
    /([A-Z]{2,6}\d{3,4}[A-Za-z\s]*).+?([SMTWRFA]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/,
    
    // Pattern 5: Look for course followed by day and time on same or next line
    /([A-Z]{2,4}\d{3,4}[A-Za-z\s]*).{0,50}([SMTWRFA]+).{0,20}(\d{1,2}:\d{2}[AP]M).{0,5}(\d{1,2}:\d{2}[AP]M)/
  ];
  
  console.log('Processing', lines.length, 'lines of text...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 5) continue; // Skip very short lines
    
    console.log(`Line ${i}: "${line}"`);
    
    // Try each pattern
    for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
      const pattern = patterns[patternIndex];
      const courseMatch = line.match(pattern);
      
      if (courseMatch) {
        console.log(`✅ Match found with pattern ${patternIndex + 1}:`, courseMatch);
        
        const [, courseCode, dayString, startTime, endTime] = courseMatch;
        
        // Clean up the extracted data
        const cleanCourseCode = courseCode.trim().replace(/\s+/g, ' ');
        const cleanDayString = dayString.trim();
        const cleanStartTime = startTime.trim().replace(/\s/g, '');
        const cleanEndTime = endTime.trim().replace(/\s/g, '');
        
        console.log('Extracted data:', {
          courseCode: cleanCourseCode,
          dayString: cleanDayString,
          startTime: cleanStartTime,
          endTime: cleanEndTime
        });
        
        // Parse days
        const days = [];
        for (let j = 0; j < cleanDayString.length; j++) {
          const dayCode = cleanDayString[j];
          if (DAY_MAPPING[dayCode]) {
            days.push(DAY_MAPPING[dayCode]);
          }
        }
        
        console.log('Mapped days:', days);
        
        // Create course entries for each day
        days.forEach(day => {
          const courseEntry = {
            courseCode: cleanCourseCode,
            day: day,
            startTime: convertTo24Hour(cleanStartTime),
            endTime: convertTo24Hour(cleanEndTime),
            room: '' // Room info may need additional parsing
          };
          
          courses.push(courseEntry);
          console.log('Added course:', courseEntry);
        });
        
        break; // Found a match, no need to try other patterns for this line
      }
    }
  }
  
  console.log('Total courses extracted:', courses.length);
  return courses;
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size, 'Type:', req.file.mimetype);

    let courses = [];
    
    // Handle different file types
    if (req.file.mimetype === 'application/pdf') {
      console.log('Processing PDF file...');
      const text = await parsePDFContent(req.file.buffer);
      courses = extractCourseDataFromText(text);
    } else if (req.file.mimetype.startsWith('image/')) {
      console.log('Processing image file with OCR...');
      // Use Google Document AI for PDFs and images
      if (req.file.mimetype === 'application/pdf' || req.file.mimetype.startsWith('image/')) {
        console.log('Processing file with Google Document AI...');
        try {
          const documentJson = await parseWithDocumentAI(req.file.buffer, req.file.mimetype);
          courses = extractCourseDataFromDocumentAI(documentJson);
        } catch (err) {
          console.error('Document AI processing failed, falling back to local parsing:', err);
          // Fallback to local parsing if Document AI fails
          if (req.file.mimetype === 'application/pdf') {
            const text = await parsePDFContent(req.file.buffer);
            courses = extractCourseDataFromText(text);
          } else if (req.file.mimetype.startsWith('image/')) {
            const text = await parseImageContent(req.file.buffer, req.file.mimetype);
            courses = extractCourseDataFromText(text);
          }
        }
      } else if (req.file.mimetype.includes('sheet') || req.file.mimetype.includes('excel') || 
             req.file.originalname.toLowerCase().endsWith('.csv') ||
             req.file.originalname.toLowerCase().endsWith('.xlsx') ||
             req.file.originalname.toLowerCase().endsWith('.xls')) {
        console.log('Processing Excel/CSV file...');
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        let sheetName = workbook.SheetNames[0];
        let data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        
        // Find the row with headers
        let headerRowIndex = -1;
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (row && row.length > 0 && row[0].toString().trim().toLowerCase() === 'course(s)') {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.log('Could not find Course(s) header');
          return res.status(400).json({ error: 'Could not find Course(s) header in the file' });
        }

        const headerRow = data[headerRowIndex];
        
        let courseNameCol = -1;
        let timeWeekDayCol = -1;
        let roomCol = -1;

        for (let i = 0; i < headerRow.length; i++) {
          const cell = headerRow[i];
          if (cell && cell.toString().includes('Course(s)')) {
            courseNameCol = i;
            console.log('Course column found at:', i);
          } else if (cell && cell.toString().includes('Time-WeekDay')) {
            timeWeekDayCol = i;
            console.log('Time-WeekDay column found at:', i);
          } else if (cell && cell.toString().includes('Room')) {
            roomCol = i;
            console.log('Room column found at:', i);
          }
        }

        console.log('Column indices - Course:', courseNameCol, 'Time:', timeWeekDayCol, 'Room:', roomCol);

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          
          if (!row || !row[courseNameCol] || row[courseNameCol].toString().trim() === '') {
            break;
          }

          const courseName = row[courseNameCol].toString().trim();
          const timeWeekDay = row[timeWeekDayCol] ? row[timeWeekDayCol].toString().trim() : '';
          const room = row[roomCol] ? row[roomCol].toString().trim() : '';

          const timeSlots = parseTimeWeekDay(timeWeekDay);

          timeSlots.forEach(slot => {
            courses.push({
              courseCode: courseName,
              day: slot.day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: room
            });
          });
        }
      } else {
        return res.status(400).json({ 
          error: 'Unsupported file type. Please upload CSV, Excel (.xlsx/.xls), PDF, or Image (JPG/PNG) files.' 
        });
      }
    } else {
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload CSV, Excel (.xlsx/.xls), PDF, or Image (JPG/PNG) files.' 
      });
    }

    if (courses.length === 0) {
      console.log('❌ No courses were extracted from the file');
      return res.status(400).json({ 
        error: 'No course data found in the file. Please check the file format.',
        details: 'The file was processed but no recognizable course schedule data was found. Make sure the file contains course codes, day codes (M,T,W,R,F,S,A), and time information.',
        fileType: req.file.mimetype,
        fileName: req.file.originalname
      });
    }

    console.log(`✅ Successfully extracted ${courses.length} course entries`);
    res.json(courses);

  } catch (error) {
    console.error('❌ Error parsing file:', error);
    res.status(500).json({ 
      error: 'Error parsing file: ' + error.message,
      details: 'There was an error processing your file. Please try again or contact support.',
      fileType: req.file ? req.file.mimetype : 'unknown',
      fileName: req.file ? req.file.originalname : 'unknown'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Test endpoint to help debug text parsing
app.post('/api/test-parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('🧪 Testing file parsing...');
    console.log('File:', req.file.originalname, 'Type:', req.file.mimetype);

    let extractedText = '';
    
    if (req.file.mimetype === 'application/pdf') {
      extractedText = await parsePDFContent(req.file.buffer);
    } else if (req.file.mimetype.startsWith('image/')) {
      extractedText = await parseImageContent(req.file.buffer, req.file.mimetype);
    } else {
      return res.status(400).json({ error: 'Only PDF and Image files supported for testing' });
    }

    const courses = extractCourseDataFromText(extractedText);

    res.json({
      success: true,
      extractedText: extractedText,
      textLength: extractedText.length,
      coursesFound: courses.length,
      courses: courses,
      preview: extractedText.substring(0, 500)
    });

  } catch (error) {
    console.error('Test parsing error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});
function generateScheduleHTML(courses) {
  // Check if there are any Friday courses
  const hasFridayCourses = courses.some(course => course.day === 'Friday');
  
  // Build days array starting with Sunday, include Friday only if there are Friday courses
  let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  if (hasFridayCourses) {
    days.push('Friday');
  }
  days.push('Saturday');
  
  const timeSlots = [];

  for (let hour = 8; hour <= 19; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  const colors = [
    '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#FC427B', '#2ED573', '#3742FA', '#F79F1F', '#A55EEA',
    '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7', '#74B9FF'
  ];
  
  const courseColors = {};
  let colorIndex = 0;

  courses.forEach(course => {
    if (!courseColors[course.courseCode]) {
      courseColors[course.courseCode] = colors[colorIndex % colors.length];
      colorIndex++;
    }
  });

  const coursesByDay = {};
  days.forEach(day => {
    coursesByDay[day] = courses.filter(course => course.day === day);
  });

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculatePosition = (startTime, endTime) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const baseMinutes = timeToMinutes('08:00');
    
    const top = ((startMinutes - baseMinutes) / 60) * 50; // 50px per hour for compact view
    const height = ((endMinutes - startMinutes) / 60) * 50;
    
    return { top, height };
  };

  let courseBlocksHTML = '';
  days.forEach((day, dayIndex) => {
    coursesByDay[day].forEach((course, index) => {
      const position = calculatePosition(course.startTime, course.endTime);
      const leftPosition = 70 + (dayIndex * ((1000 - 70) / 7));
      
      courseBlocksHTML += `
        <div style="
          position: absolute;
          top: ${position.top + 35}px;
          left: ${leftPosition + 2}px;
          width: ${((1000 - 70) / 7) - 4}px;
          height: ${position.height}px;
          background: linear-gradient(135deg, ${courseColors[course.courseCode]}, ${adjustBrightness(courseColors[course.courseCode], -20)});
          border: 2px solid ${adjustBrightness(courseColors[course.courseCode], -40)};
          border-radius: 6px;
          padding: 6px;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
          text-align: center;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        ">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px; line-height: 1.2;">
            ${course.courseCode}
          </div>
          <div style="font-size: 9px; margin-bottom: 3px; opacity: 0.9; line-height: 1.2;">
            ${course.startTime} - ${course.endTime}
          </div>
          <div style="font-size: 8px; opacity: 0.8; font-style: italic; line-height: 1.2;">
            ${course.room}
          </div>
        </div>
      `;
    });
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Weekly Schedule</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 15px; 
          background: white;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 24px;
          font-weight: bold;
        }
        .header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .schedule-container {
          position: relative;
          width: 1000px;
          margin: 0 auto;
        }
        .schedule-grid {
          display: grid;
          grid-template-columns: 70px repeat(7, 1fr);
          border: 2px solid #3498db;
          border-radius: 8px;
          overflow: hidden;
          min-height: 550px;
          width: 1000px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header-cell {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          padding: 8px 4px;
          font-weight: bold;
          text-align: center;
          border-right: 1px solid #2980b9;
          font-size: 12px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .time-cell {
          background: linear-gradient(135deg, #ecf0f1, #bdc3c7);
          padding: 6px 4px;
          text-align: center;
          font-size: 10px;
          font-weight: bold;
          border-right: 1px solid #95a5a6;
          border-bottom: 1px solid #95a5a6;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2c3e50;
        }
        .schedule-cell {
          border-right: 1px solid #bdc3c7;
          border-bottom: 1px solid #bdc3c7;
          background: linear-gradient(135deg, #ffffff, #f8f9fa);
          height: 50px;
        }
        .print-btn {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          margin: 20px auto;
          display: block;
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
          transition: all 0.3s ease;
        }
        .print-btn:hover {
          background: linear-gradient(135deg, #c0392b, #a93226);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
        }
        .legend {
          margin-top: 20px;
          padding: 15px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }
        .legend h3 {
          margin: 0 0 10px 0;
          color: #2c3e50;
          font-size: 16px;
        }
        .course-legend {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px;
          background: white;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid rgba(0,0,0,0.2);
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Weekly Class Schedule</h1>
        <p>Generated by RoutineGen • ${new Date().toLocaleDateString()}</p>
      </div>
      
      <button class="print-btn no-print" onclick="window.print()">Print This Schedule</button>
      
      <div class="schedule-container">
        <div class="schedule-grid">
          <div class="header-cell">⏰ Time</div>
          ${days.map(day => `<div class="header-cell">📚 ${day}</div>`).join('')}
          ${timeSlots.map(timeSlot => `
            <div class="time-cell">${timeSlot}</div>
            ${days.map(() => '<div class="schedule-cell"></div>').join('')}
          `).join('')}
        </div>
        ${courseBlocksHTML}
      </div>
      
      <div class="legend no-print">
        <h3>📋 Course Legend</h3>
        <div class="course-legend">
          ${Object.keys(courseColors).map(courseCode => `
            <div class="legend-item">
              <div class="legend-color" style="background: linear-gradient(135deg, ${courseColors[courseCode]}, ${adjustBrightness(courseColors[courseCode], -20)});"></div>
              <span style="font-weight: bold; color: #2c3e50;">${courseCode}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
}

function adjustBrightness(color, amount) {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

app.post('/api/export/html', express.json(), (req, res) => {
  try {
    const { courses } = req.body;
    
    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid courses data' });
    }

    const html = generateScheduleHTML(courses);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Error generating HTML:', error);
    res.status(500).json({ error: 'Error generating HTML: ' + error.message });
  }
});

app.post('/api/export/csv', express.json(), (req, res) => {
  try {
    const { courses } = req.body;
    
    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid courses data' });
    }

    let csvContent = 'Course Code,Day,Start Time,End Time,Room\n';
    courses.forEach(course => {
      csvContent += `"${course.courseCode}","${course.day}","${course.startTime}","${course.endTime}","${course.room}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=weekly-schedule.csv');
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Error generating CSV: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
