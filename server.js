const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

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

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

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

    const courses = [];
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
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

// Generate HTML for schedule export
function generateScheduleHTML(routineData) {
  const timeSlots = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM', '9:00 PM'
  ];

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];
  
  // Create schedule grid
  const schedule = {};
  days.forEach(day => {
    schedule[day] = {};
  });

  // Fill schedule grid with courses
  routineData.forEach(course => {
    const day = course.day;
    const startTime = course.startTime;
    const endTime = course.endTime;
    
    if (schedule[day]) {
      schedule[day][startTime] = {
        courseCode: course.courseCode,
        endTime: endTime,
        room: course.room
      };
    }
  });

  // Generate HTML table
  let tableRows = '';
  
  timeSlots.forEach(timeSlot => {
    let row = `<tr><td class="time-slot">${timeSlot}</td>`;
    
    days.forEach(day => {
      const course = schedule[day][timeSlot];
      if (course) {
        row += `<td class="course-cell">
          <div class="course-code">${course.courseCode}</div>
          <div class="course-room">${course.room}</div>
        </td>`;
      } else {
        row += '<td class="empty-cell"></td>';
      }
    });
    
    row += '</tr>';
    tableRows += row;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Weekly Class Schedule</title>
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        body {
          font-family: Arial, sans-serif;
          background: white;
          padding: 20px;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 24px;
          color: #333;
          margin-bottom: 5px;
        }
        
        .header p {
          font-size: 14px;
          color: #666;
        }
        
        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          table-layout: fixed;
        }
        
        .schedule-table th {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 8px 4px;
          text-align: center;
          font-weight: bold;
          color: #495057;
        }
        
        .schedule-table td {
          border: 1px solid #dee2e6;
          padding: 4px;
          vertical-align: top;
          height: 35px;
        }
        
        .time-slot {
          background-color: #f8f9fa;
          font-weight: bold;
          text-align: center;
          width: 80px;
          font-size: 10px;
        }
        
        .course-cell {
          background-color: #e3f2fd;
          text-align: center;
        }
        
        .course-code {
          font-weight: bold;
          font-size: 10px;
          color: #1976d2;
          margin-bottom: 2px;
        }
        
        .course-room {
          font-size: 9px;
          color: #666;
        }
        
        .empty-cell {
          background-color: #ffffff;
        }
        
        .course-summary {
          margin-top: 20px;
          page-break-inside: avoid;
        }
        
        .course-summary h3 {
          font-size: 16px;
          margin-bottom: 10px;
          color: #333;
        }
        
        .course-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .course-item {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          background-color: #e3f2fd;
          border: 1px solid #bbdefb;
          border-radius: 4px;
          font-size: 10px;
        }
        
        .course-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #1976d2;
          margin-right: 5px;
        }
        
        @media print {
          body { margin: 0; padding: 15px; }
          .schedule-table { font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Weekly Class Schedule</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Sunday</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Saturday</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div class="course-summary">
        <h3>Course Summary</h3>
        <div class="course-list">
          ${[...new Set(routineData.map(course => course.courseCode))].map(courseCode => 
            `<div class="course-item">
              <div class="course-indicator"></div>
              ${courseCode}
            </div>`
          ).join('')}
        </div>
      </div>
    </body>
    </html>
  `;
}

// Server-side export endpoint
app.post('/api/download', async (req, res) => {
  try {
    const { routineData } = req.body;
    const format = req.query.format;

    if (!routineData || !Array.isArray(routineData) || routineData.length === 0) {
      return res.status(400).json({ error: 'No valid routine data provided' });
    }

    if (!format || !['pdf', 'png'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use pdf or png' });
    }

    console.log(`Generating ${format.toUpperCase()} export for ${routineData.length} courses`);

    // Generate HTML content
    const htmlContent = generateScheduleHTML(routineData);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    
    if (format === 'pdf') {
      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=routine.pdf');
      res.send(pdfBuffer);

    } else if (format === 'png') {
      // Set viewport for A4 landscape dimensions and generate PNG
      await page.setViewport({ width: 1123, height: 794 });
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pngBuffer = await page.screenshot({
        fullPage: true,
        type: 'png'
      });

      await browser.close();

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename=routine.png');
      res.send(pngBuffer);
    }

  } catch (error) {
    console.error('Error generating export:', error);
    res.status(500).json({ error: 'Error generating export: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
