const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins temporarily for debugging
  credentials: true
}));
app.use(express.json());

// Health check endpoint for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is working correctly',
    timestamp: new Date().toISOString()
  });
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Day code mapping - CRITICAL for correct parsing
const DAY_MAPPING = {
  'S': 'Sunday',
  'M': 'Monday', 
  'T': 'Tuesday',
  'W': 'Wednesday',
  'R': 'Thursday',
  'A': 'Saturday'
};

// Function to parse time-weekday string
function parseTimeWeekDay(timeWeekDayStr) {
  if (!timeWeekDayStr || timeWeekDayStr.trim() === '') {
    return [];
  }

  // Extract day codes and time portion
  const match = timeWeekDayStr.match(/^([SMTWRA]+)\s+(.+)$/);
  if (!match) {
    return [];
  }

  const dayCodesStr = match[1];
  const timeStr = match[2];

  // Parse time range (e.g., "10:10AM-11:40AM")
  const timeMatch = timeStr.match(/(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);
  if (!timeMatch) {
    return [];
  }

  const startTime12 = timeMatch[1];
  const endTime12 = timeMatch[2];

  // Convert to 24-hour format
  const startTime = convertTo24Hour(startTime12);
  const endTime = convertTo24Hour(endTime12);

  // Split day codes and map to full day names
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

// Function to convert 12-hour time to 24-hour format
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

// API endpoint to handle file upload and parsing
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('=== File Upload Started ===');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

    // Parse the uploaded file
    const workbook = xlsx.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON format
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('Raw data rows:', data.length);
    console.log('First 3 rows:', data.slice(0, 3));

    // Find the header row containing "Course(s)"
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

    // Find column indices
    const headerRow = data[headerRowIndex];
    console.log('Header row found at index:', headerRowIndex);
    console.log('Header row:', headerRow);
    
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

    // Extract course data
    const courses = [];
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      
      // Stop if course name column is empty
      if (!row || !row[courseNameCol] || row[courseNameCol].toString().trim() === '') {
        break;
      }

      const courseName = row[courseNameCol].toString().trim();
      const timeWeekDay = row[timeWeekDayCol] ? row[timeWeekDayCol].toString().trim() : '';
      const room = row[roomCol] ? row[roomCol].toString().trim() : '';

      // Parse time and day information
      const timeSlots = parseTimeWeekDay(timeWeekDay);

      // Create course objects for each day
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

    console.log('Final courses array length:', courses.length);
    console.log('Sample courses:', courses.slice(0, 3));
    console.log('=== File Upload Completed ===');

    res.json(courses);

  } catch (error) {
    console.error('Error parsing file:', error);
    res.status(500).json({ error: 'Error parsing file: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Function to generate HTML for schedule
function generateScheduleHTML(courses) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [];
  
  // Generate time slots from 8 AM to 7 PM
  for (let hour = 8; hour <= 19; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // Enhanced color palette for better printing
  const colors = [
    '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#FC427B', '#2ED573', '#3742FA', '#F79F1F', '#A55EEA',
    '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7', '#74B9FF'
  ];
  
  const courseColors = {};
  let colorIndex = 0;

  // Assign colors to courses
  courses.forEach(course => {
    if (!courseColors[course.courseCode]) {
      courseColors[course.courseCode] = colors[colorIndex % colors.length];
      colorIndex++;
    }
  });

  // Group courses by day
  const coursesByDay = {};
  days.forEach(day => {
    coursesByDay[day] = courses.filter(course => course.day === day);
  });

  // Helper function to convert time string to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper function to calculate position and height
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
        <h1>📅 Weekly Class Schedule</h1>
        <p>Generated by RoutineGen • ${new Date().toLocaleDateString()}</p>
      </div>
      
      <button class="print-btn no-print" onclick="window.print()">🖨️ Print This Schedule</button>
      
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

// Helper function to adjust color brightness
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

// Export schedule as HTML (for PDF conversion on frontend)
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

// Export schedule as CSV
app.post('/api/export/csv', express.json(), (req, res) => {
  try {
    const { courses } = req.body;
    
    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid courses data' });
    }

    // Create CSV content
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
