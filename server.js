const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

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
async function parsePDFContent(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error('Failed to parse PDF: ' + error.message);
  }
}

// Function to parse image files using OCR
async function parseImageContent(buffer, mimetype) {
  try {
    // Convert image to supported format if needed
    let processedBuffer = buffer;
    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      processedBuffer = await sharp(buffer).png().toBuffer();
    }
    
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
      logger: m => console.log('OCR Progress:', m)
    });
    
    return text;
  } catch (error) {
    throw new Error('Failed to parse image: ' + error.message);
  }
}

// Function to extract course data from text content
function extractCourseDataFromText(textContent) {
  const lines = textContent.split('\n');
  const courses = [];
  
  // Look for patterns that match course information
  // This is a basic implementation - you may need to adjust based on your specific PDF/image format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for course pattern: Course code followed by time and days
    const courseMatch = line.match(/([A-Z]{2,4}\d{3,4}.*?)\s+([SMTWRFA]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);
    
    if (courseMatch) {
      const [, courseCode, dayString, startTime, endTime] = courseMatch;
      
      // Parse days
      const days = [];
      for (let j = 0; j < dayString.length; j++) {
        const dayCode = dayString[j];
        if (DAY_MAPPING[dayCode]) {
          days.push(DAY_MAPPING[dayCode]);
        }
      }
      
      // Create course entries for each day
      days.forEach(day => {
        courses.push({
          courseCode: courseCode.trim(),
          day: day,
          startTime: convertTo24Hour(startTime),
          endTime: convertTo24Hour(endTime),
          room: '' // Room info may need additional parsing
        });
      });
    }
  }
  
  return courses;
}

// Helper function to extract text from PDF
async function extractTextFromPDF(buffer) {
  try {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Helper function to extract text from images using OCR
async function extractTextFromImage(buffer, mimetype) {
  try {
    // Convert image to PNG if needed for better OCR results
    let processedBuffer = buffer;
    if (mimetype !== 'image/png') {
      processedBuffer = await sharp(buffer).png().toBuffer();
    }
    
    const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
      logger: m => console.log('OCR Progress:', m)
    });
    
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
}

// Helper function to parse text data into structured format
function parseTextToScheduleData(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Find header row
  let headerRowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('course') || 
        lines[i].toLowerCase().includes('time') ||
        lines[i].toLowerCase().includes('subject')) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error('Could not find course header in the extracted text');
  }
  
  const data = [];
  // Convert text lines to array format similar to Excel parsing
  lines.forEach(line => {
    // Split by common separators (tabs, multiple spaces, commas)
    const row = line.split(/\t|,|\s{2,}/).map(cell => cell.trim());
    if (row.length > 1) {
      data.push(row);
    }
  });
  
  return data;
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
      const text = await parseImageContent(req.file.buffer, req.file.mimetype);
      courses = extractCourseDataFromText(text);
    } else if (req.file.mimetype.includes('sheet') || req.file.mimetype.includes('excel') || 
               req.file.originalname.toLowerCase().endsWith('.csv') ||
               req.file.originalname.toLowerCase().endsWith('.xlsx') ||
               req.file.originalname.toLowerCase().endsWith('.xls')) {
      console.log('Processing Excel/CSV file...');
      
      const workbook = xlsx.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      let headerRowIndex = -1;
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row.some(cell => cell && cell.toString().includes('Course(s)'))) {
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

    if (courses.length === 0) {
      return res.status(400).json({ error: 'No course data found in the file. Please check the file format.' });
    }

    res.json(courses);

  } catch (error) {
    console.error('Error parsing file:', error);
    res.status(500).json({ error: 'Error parsing file: ' + error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
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
