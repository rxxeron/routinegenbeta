const fs = require('fs');
const path = require('path');

// Test the text parsing function directly
async function testTextParsing() {
  try {
    console.log('🧪 Testing Document AI text parsing directly...\n');
    
    // Read the JPG JSON file
    const jpgJsonPath = path.join(__dirname, 'jpg.json');
    const documentJson = JSON.parse(fs.readFileSync(jpgJsonPath, 'utf8'));
    
    // Import parsing functions from server (simulate the environment)
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

    function extractCourseDataFromDocumentAI(documentJson) {
      console.log('Processing Document AI response...');
      
      let textContent = '';
      if (documentJson && documentJson.text) {
        textContent = documentJson.text;
      }
      
      // Try structured parsing first for university advising slips
      const structuredCourses = extractStructuredCourseData(textContent);
      if (structuredCourses.length > 0) {
        console.log('✅ Successfully extracted courses using structured parsing');
        return structuredCourses;
      }
      
      // Fallback to general text parsing
      console.log('Falling back to general text parsing...');
      return extractCourseDataFromText(textContent);
    }

    function extractStructuredCourseData(textContent) {
      console.log('=== ADVANCED DOCUMENT AI PARSER ===');
      const courses = [];
      const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Step 1: Extract course information
      const courseData = new Map();
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Format 1: Standard course code
        if (line.match(/^[A-Z]{2,4}\d{3,4}$/)) {
          console.log(`Found course: ${line}`);
          courseData.set(line, { courseCode: line });
        }
        // Format 2: Spaced course code
        else if (line.match(/^[A-Z]{2,4}\s+\d{3,4}$/)) {
          const courseCode = line.replace(/\s+/g, '');
          console.log(`Found spaced course: ${line} -> ${courseCode}`);
          courseData.set(courseCode, { courseCode: courseCode });
        }
        // Format 3: Lab courses
        else if (line.match(/^[A-Z]{2,4}\d{3,4}\s+Lab$/)) {
          console.log(`Found lab course: ${line}`);
          courseData.set(line, { courseCode: line });
        }
      }
      
      console.log('Course data:', Array.from(courseData.keys()));
      
      // Step 2: Extract schedule patterns
      const schedulePatterns = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Tuition + Days + Time pattern
        const tuitionPattern = /^(\d+\.\d+)\s+([SMTWRFA]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)$/;
        const tuitionMatch = line.match(tuitionPattern);
        
        if (tuitionMatch) {
          const [, tuition, days, startTime, endTime] = tuitionMatch;
          schedulePatterns.push({
            tuition, days, startTime, endTime, lineIndex: i, line
          });
          console.log(`Schedule found: ${line}`);
        }
        
        // Day + Time only pattern
        const dayTimePattern = /^([SMTWRFA])\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)$/;
        const dayTimeMatch = line.match(dayTimePattern);
        
        if (dayTimeMatch) {
          const [, day, startTime, endTime] = dayTimeMatch;
          schedulePatterns.push({
            days: day, startTime, endTime, lineIndex: i, line
          });
          console.log(`Day schedule found: ${line}`);
        }
      }
      
      console.log('Schedule patterns:', schedulePatterns.length);
      
      // Step 3: Extract room information
      const roomPatterns = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.match(/^([A-Z]*\d+[A-Z]*-?\d*|[A-Z]+-\d+)$/) && 
            !line.includes('.') && 
            !line.match(/^\d{4}-\d-\d{2}-\d{3}$/) && 
            line !== 'Room' && line !== 'Remarks' &&
            !line.match(/^\d+\.\d+$/)) {
          roomPatterns.push({ room: line, lineIndex: i });
          console.log(`Room found: ${line} at line ${i}`);
        }
      }
      
      // Step 4: Associate schedules with courses
      console.log('=== ASSOCIATING SCHEDULES WITH COURSES ===');
      
      const courseList = Array.from(courseData.keys());
      
      schedulePatterns.forEach((schedule, scheduleIndex) => {
        console.log(`\nProcessing schedule ${scheduleIndex}: ${schedule.line}`);
        
        // Find closest course before this schedule
        let associatedCourse = null;
        let bestDistance = Infinity;
        
        courseList.forEach(courseCode => {
          for (let i = 0; i < lines.length; i++) {
            if (lines[i] === courseCode || lines[i].replace(/\s+/g, '') === courseCode) {
              const distance = schedule.lineIndex - i;
              if (distance > 0 && distance < bestDistance) {
                bestDistance = distance;
                associatedCourse = courseCode;
              }
              break;
            }
          }
        });
        
        if (associatedCourse) {
          console.log(`Associated with course: ${associatedCourse} (distance: ${bestDistance})`);
          
          // Parse days
          const dayArray = [];
          for (let j = 0; j < schedule.days.length; j++) {
            const dayCode = schedule.days[j];
            if (DAY_MAPPING[dayCode]) {
              dayArray.push(DAY_MAPPING[dayCode]);
            }
          }
          
          // Find best room
          let room = '';
          let bestRoomDistance = Infinity;
          
          roomPatterns.forEach(roomPattern => {
            const roomDistance = Math.abs(roomPattern.lineIndex - schedule.lineIndex);
            if (roomDistance < bestRoomDistance && roomDistance <= 10) {
              bestRoomDistance = roomDistance;
              room = roomPattern.room;
            }
          });
          
          // Create course entries
          dayArray.forEach(day => {
            const courseEntry = {
              courseCode: associatedCourse,
              day: day,
              startTime: convertTo24Hour(schedule.startTime.replace(/\s/g, '')),
              endTime: convertTo24Hour(schedule.endTime.replace(/\s/g, '')),
              room: room,
              tuition: schedule.tuition || ''
            };
            
            courses.push(courseEntry);
            console.log('Added course:', courseEntry);
          });
        } else {
          console.log(`No associated course found for schedule: ${schedule.line}`);
        }
      });
      
      console.log(`\nAdvanced parsing found ${courses.length} courses`);
      return courses;
    }

    function extractCourseDataFromText(textContent) {
      // Fallback parsing logic (simplified)
      console.log('Using fallback text parsing...');
      return [];
    }
    
    // Test the parsing
    console.log('📄 Document AI text content:');
    console.log('Length:', documentJson.text.length);
    console.log('\n' + '='.repeat(80) + '\n');
    
    const courses = extractCourseDataFromDocumentAI(documentJson);
    
    console.log('\n🎯 Parsing Results:');
    console.log(`Found ${courses.length} course entries`);
    
    if (courses.length > 0) {
      console.log('\n📚 Extracted Courses:');
      courses.forEach((course, index) => {
        console.log(`${index + 1}. ${course.courseCode}`);
        console.log(`   Day: ${course.day}`);
        console.log(`   Time: ${course.startTime} - ${course.endTime}`);
        console.log(`   Room: ${course.room || 'Not specified'}`);
        if (course.tuition) console.log(`   Tuition: ${course.tuition}`);
        console.log('');
      });
      
      // Generate schedule summary
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
      console.log('\n❌ No courses were extracted.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testTextParsing();
