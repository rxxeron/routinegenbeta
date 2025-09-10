const fs = require('fs');
const path = require('path');

// Import the parsing functions (simulate server.js environment)
const DAY_MAPPING = {
  'S': 'Sunday',
  'M': 'Monday', 
  'T': 'Tuesday',
  'W': 'Wednesday',
  'R': 'Thursday',
  'F': 'Friday',
  'A': 'Saturday'
};

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

function extractStructuredCourseData(textContent) {
  console.log('Attempting structured course data extraction...');
  const courses = [];
  
  // Look for university advising slip pattern
  const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentCourse = null;
  let roomInfo = '';
  
  // First pass: identify all course codes and their positions
  const coursePositions = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for course codes (including lab courses)
    const courseCodePattern = /^([A-Z]{2,4}\d{3,4})(?:\s+Lab)?$/;
    const courseMatch = line.match(courseCodePattern);
    
    if (courseMatch) {
      coursePositions.push({
        index: i,
        courseCode: line.trim(),
        line: line
      });
    }
  }
  
  console.log('Found course positions:', coursePositions);
  
  // Second pass: look for time patterns and associate with nearest course
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`Processing line ${i}: "${line}"`);
    
    // Pattern: Time and day information (e.g., "15000.00 MW 4:50PM-6:20PM", "24000.00 TR 10:10AM-11:40AM")
    const timePattern = /(\d+\.\d+)\s+([SMTWRFA]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/;
    const timeMatch = line.match(timePattern);
    
    if (timeMatch) {
      const [, tuition, dayString, startTime, endTime] = timeMatch;
      
      console.log('Found time info:', { tuition, dayString, startTime, endTime });
      
      // Find the most recent course code before this time entry
      let associatedCourse = null;
      for (let j = coursePositions.length - 1; j >= 0; j--) {
        if (coursePositions[j].index < i) {
          associatedCourse = coursePositions[j];
          break;
        }
      }
      
      if (!associatedCourse) {
        console.log('No associated course found for time entry');
        continue;
      }
      
      console.log('Associated with course:', associatedCourse.courseCode);
      
      // Parse days
      const days = [];
      for (let j = 0; j < dayString.length; j++) {
        const dayCode = dayString[j];
        if (DAY_MAPPING[dayCode]) {
          days.push(DAY_MAPPING[dayCode]);
        }
      }
      
      // Look for room info after this time entry
      roomInfo = '';
      for (let k = i + 1; k < Math.min(i + 5, lines.length); k++) {
        const nextLine = lines[k];
        // Room pattern (e.g., "221", "AB3-302", "FUB-801")
        const roomPattern = /^([A-Z]*\d+[A-Z]*-?\d*)$|^([A-Z]+-\d+)$/;
        if (roomPattern.test(nextLine) && 
            !nextLine.includes('.') && 
            !nextLine.match(/^\d{4}-\d-\d{2}-\d{3}$/) && // not student ID
            nextLine !== 'Room' &&
            nextLine !== 'Remarks') {
          roomInfo = nextLine;
          console.log('Found room:', roomInfo);
          break;
        }
      }
      
      // Create course entries for each day
      days.forEach(day => {
        const courseEntry = {
          courseCode: associatedCourse.courseCode,
          day: day,
          startTime: convertTo24Hour(startTime.replace(/\s/g, '')),
          endTime: convertTo24Hour(endTime.replace(/\s/g, '')),
          room: roomInfo,
          tuition: tuition
        };
        
        courses.push(courseEntry);
        console.log('Added structured course:', courseEntry);
      });
      
      continue;
    }
    
    // Pattern: Day and time only (e.g., "S 8:00AM-10:00AM")
    const dayTimePattern = /^([SMTWRFA])\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)$/;
    const dayTimeMatch = line.match(dayTimePattern);
    
    if (dayTimeMatch) {
      const [, dayCode, startTime, endTime] = dayTimeMatch;
      
      console.log('Found day-time info:', { dayCode, startTime, endTime });
      
      // Find the most recent course code before this time entry
      let associatedCourse = null;
      for (let j = coursePositions.length - 1; j >= 0; j--) {
        if (coursePositions[j].index < i) {
          associatedCourse = coursePositions[j];
          break;
        }
      }
      
      if (!associatedCourse) {
        console.log('No associated course found for day-time entry');
        continue;
      }
      
      console.log('Associated with course:', associatedCourse.courseCode);
      
      // Parse day
      const day = DAY_MAPPING[dayCode];
      if (!day) {
        console.log('Unknown day code:', dayCode);
        continue;
      }
      
      // Look for room info after this time entry
      roomInfo = '';
      for (let k = i + 1; k < Math.min(i + 5, lines.length); k++) {
        const nextLine = lines[k];
        // Room pattern
        const roomPattern = /^([A-Z]*\d+[A-Z]*-?\d*)$|^([A-Z]+-\d+)$/;
        if (roomPattern.test(nextLine) && 
            !nextLine.includes('.') && 
            !nextLine.match(/^\d{4}-\d-\d{2}-\d{3}$/) &&
            nextLine !== 'Room' &&
            nextLine !== 'Remarks') {
          roomInfo = nextLine;
          console.log('Found room:', roomInfo);
          break;
        }
      }
      
      const courseEntry = {
        courseCode: associatedCourse.courseCode,
        day: day,
        startTime: convertTo24Hour(startTime.replace(/\s/g, '')),
        endTime: convertTo24Hour(endTime.replace(/\s/g, '')),
        room: roomInfo
      };
      
      courses.push(courseEntry);
      console.log('Added day-time course:', courseEntry);
      
      continue;
    }
  }
  
  console.log(`Structured parsing found ${courses.length} courses`);
  return courses;
}

// Test the parser with the Document AI output
async function testDocumentAIParser() {
  console.log('🧪 Testing Document AI parser...\n');
  
  try {
    // Read the Document AI output
    const jpgJsonPath = path.join(__dirname, 'jpg.json');
    const documentJson = JSON.parse(fs.readFileSync(jpgJsonPath, 'utf8'));
    
    console.log('📄 Document AI text content:');
    console.log('Length:', documentJson.text.length);
    console.log('Preview:', documentJson.text.substring(0, 500));
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test structured parsing
    const courses = extractStructuredCourseData(documentJson.text);
    
    console.log('\n🎯 Parsing Results:');
    console.log(`Found ${courses.length} course entries`);
    
    if (courses.length > 0) {
      console.log('\n📚 Extracted Courses:');
      courses.forEach((course, index) => {
        console.log(`${index + 1}. ${course.courseCode}`);
        console.log(`   Day: ${course.day}`);
        console.log(`   Time: ${course.startTime} - ${course.endTime}`);
        console.log(`   Room: ${course.room || 'Not specified'}`);
        if (course.section) console.log(`   Section: ${course.section}`);
        if (course.credits) console.log(`   Credits: ${course.credits}`);
        if (course.tuition) console.log(`   Tuition: ${course.tuition}`);
        console.log('');
      });
      
      // Generate a summary schedule
      console.log('📅 Weekly Schedule Summary:');
      const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayOrder.forEach(day => {
        const dayCourses = courses.filter(c => c.day === day);
        if (dayCourses.length > 0) {
          console.log(`\n${day}:`);
          dayCourses
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .forEach(course => {
              console.log(`  ${course.startTime}-${course.endTime}: ${course.courseCode} (${course.room})`);
            });
        }
      });
    } else {
      console.log('❌ No courses were extracted. Check the parsing patterns.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testDocumentAIParser();
