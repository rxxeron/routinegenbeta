import React from 'react';

const RoutineTable = ({ schedule, courses }) => {
  if (!schedule || schedule.length === 0) {
    return <div>No schedule to display</div>;
  }

  // Debug: Check Sunday course details
  console.log('All schedule data:', schedule);
  const uniqueDays = [...new Set(schedule.map(course => course.day))];
  console.log('Unique days in data:', uniqueDays);
  const sundayCourses = schedule.filter(course => course.day === 'Sunday');
  console.log('Sunday courses found:', sundayCourses);
  sundayCourses.forEach(course => {
    console.log('Sunday course details:', {
      courseCode: course.courseCode,
      day: course.day,
      startTime: course.startTime,
      endTime: course.endTime,
      room: course.room
    });
  });

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', 
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Get unique courses for color assignment
  const uniqueCourses = [...new Set(schedule.map(course => course.courseCode))];
  const courseColors = [
    '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#FC427B', '#2ED573', '#3742FA', '#F79F1F', '#A55EEA',
    '#26DE81', '#FD79A8', '#FDCB6E', '#6C5CE7', '#74B9FF'
  ];

  // Calculate position within hour using 6-point reference (10-minute intervals)
  const calculatePositionInHour = (timeStr) => {
    // Extract minutes from time string (handles both 12-hour and 24-hour formats)
    let minutes;
    if (timeStr.includes(':')) {
      const timeParts = timeStr.split(':');
      minutes = parseInt(timeParts[1], 10);
    } else {
      minutes = 0;
    }
    
    // Ensure minutes is valid
    if (isNaN(minutes)) {
      console.warn('Invalid time format for positioning:', timeStr);
      return 0;
    }
    
    // Each 10-minute interval is 1/6 of an hour (16.67% of cell height)
    // 0 min = 0%, 10 min = 16.67%, 20 min = 33.33%, 30 min = 50%, 40 min = 66.67%, 50 min = 83.33%
    const positionPercentage = (minutes / 60) * 100;
    
    console.log(`Position calculation for ${timeStr}: ${minutes} minutes = ${positionPercentage}% offset`);
    return positionPercentage;
  };

  // Calculate course height and position based on duration
  const getCourseMetrics = (course) => {
    const parseTimeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTimeToMinutes(course.startTime);
    const endMinutes = parseTimeToMinutes(course.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    // Responsive cell height calculation based on CSS breakpoints
    const windowWidth = window.innerWidth;
    let cellHeight;
    if (windowWidth <= 400) {
      cellHeight = 45; // Extra extra small mobile (400px breakpoint)
    } else if (windowWidth <= 480) {
      cellHeight = 50; // Extra small mobile (480px breakpoint) 
    } else if (windowWidth <= 768) {
      cellHeight = 60; // Small mobile (768px breakpoint)
    } else {
      cellHeight = 80; // Desktop/tablet
    }
    
    // Height proportional to duration
    const height = (durationMinutes / 60) * cellHeight;
    
    // Calculate top position within the starting hour cell using 6-point reference
    const startPosition = calculatePositionInHour(course.startTime);
    const topOffset = (startPosition / 100) * cellHeight; // Convert percentage to pixels
    
    // Debug logging for mobile positioning
    if (windowWidth <= 768) {
      console.log(`Mobile course metrics for ${course.courseCode}:`, {
        windowWidth,
        startTime: course.startTime,
        endTime: course.endTime,
        durationMinutes,
        cellHeight,
        height,
        startPosition: `${startPosition}%`,
        topOffset: `${topOffset}px`,
        debugInfo: `6-point positioning: ${course.startTime} -> ${startPosition}% offset`
      });
    }
    
    return { height, topOffset };
  };

  const getCourseForSlot = (day, timeSlot) => {
    const foundCourse = schedule.find(course => {
      // Make day matching more flexible to handle abbreviations
      const courseDay = course.day;
      const normalizedCourseDay = courseDay ? courseDay.toString().toLowerCase().trim() : '';
      const normalizedDay = day.toLowerCase().trim();
      
      // Create comprehensive day mapping for abbreviations
      const dayMatches = normalizedCourseDay === normalizedDay || 
                        (normalizedDay === 'sunday' && (normalizedCourseDay === 's' || normalizedCourseDay === 'sun' || normalizedCourseDay === 'sunday')) ||
                        (normalizedDay === 'monday' && (normalizedCourseDay === 'm' || normalizedCourseDay === 'mon' || normalizedCourseDay === 'monday')) ||
                        (normalizedDay === 'tuesday' && (normalizedCourseDay === 't' || normalizedCourseDay === 'tue' || normalizedCourseDay === 'tuesday')) ||
                        (normalizedDay === 'wednesday' && (normalizedCourseDay === 'w' || normalizedCourseDay === 'wed' || normalizedCourseDay === 'wednesday')) ||
                        (normalizedDay === 'thursday' && (normalizedCourseDay === 'th' || normalizedCourseDay === 'thu' || normalizedCourseDay === 'thursday')) ||
                        (normalizedDay === 'friday' && (normalizedCourseDay === 'f' || normalizedCourseDay === 'fri' || normalizedCourseDay === 'friday')) ||
                        (normalizedDay === 'saturday' && (normalizedCourseDay === 'sa' || normalizedCourseDay === 'sat' || normalizedCourseDay === 'saturday'));
      
      if (!dayMatches) {
        return false;
      }
      
      // Convert times for comparison
      const slotTime24 = convertTo24Hour(timeSlot);
      const courseStart = course.startTime;
      const courseEnd = course.endTime;
      
      if (!courseStart || !courseEnd) {
        return false;
      }
      
      // Parse times into minutes for easier comparison
      const parseTimeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const slotMinutes = parseTimeToMinutes(slotTime24);
      const courseStartMinutes = parseTimeToMinutes(courseStart);
      const courseEndMinutes = parseTimeToMinutes(courseEnd);
      
      // Show course if it overlaps with this hour slot
      const slotEndMinutes = slotMinutes + 60; // End of current hour slot
      
      // Course overlaps with this slot if:
      // Course starts before slot ends AND course ends after slot starts
      const overlaps = courseStartMinutes < slotEndMinutes && courseEndMinutes > slotMinutes;
      
      // But only show in the starting hour to avoid duplicates
      const slotHour = Math.floor(slotMinutes / 60);
      const courseStartHour = Math.floor(courseStartMinutes / 60);
      
      return overlaps && slotHour === courseStartHour;
    });
    
    return foundCourse;
  };

  const convertTo24Hour = (time12h) => {
    const [timePart, modifier] = time12h.split(' ');
    let [hours, minutes] = timePart.split(':');
    
    hours = parseInt(hours, 10);
    
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  return (
    <div className="schedule-container">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Time</th>
            {days.map(day => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot, timeIndex) => (
            <tr key={timeSlot}>
              <td className="time-cell">{timeSlot}</td>
              {days.map((day, dayIndex) => {
                const course = getCourseForSlot(day, timeSlot);
                
                if (course) {
                  const colorIndex = uniqueCourses.findIndex(uc => uc === course.courseCode);
                  const color = courseColors[colorIndex % courseColors.length];
                  const { height, topOffset } = getCourseMetrics(course);
                  
                  return (
                    <td key={`${day}-${timeSlot}`} className="schedule-cell" style={{ position: 'relative' }}>
                      <div 
                        className="course-block" 
                        style={{
                          backgroundColor: color,
                          border: `1px solid ${color}`,
                          color: '#fff',
                          padding: window.innerWidth <= 768 ? '3px' : '6px',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          fontSize: window.innerWidth <= 768 ? '0.55rem' : '11px',
                          lineHeight: '1.1',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          position: 'absolute',
                          top: `${topOffset}px`,
                          left: '2px',
                          right: '2px',
                          height: `${height}px`,
                          zIndex: 2,
                          boxSizing: 'border-box',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div className="course-name" style={{ marginBottom: '1px', fontWeight: 'bold' }}>
                          {course.courseCode}
                        </div>
                        <div className="course-time" style={{ opacity: 0.95, fontWeight: '500' }}>
                          {course.startTime} - {course.endTime}
                        </div>
                        <div className="course-room" style={{ opacity: 0.9, fontWeight: '500' }}>
                          {course.room}
                        </div>
                      </div>
                    </td>
                  );
                }
                
                return <td key={`${day}-${timeSlot}`} className="schedule-cell"></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Course Summary Section */}
      <div className="schedule-summary">
        <h3>📚 Course Summary</h3>
        <div className="course-legend">
          {uniqueCourses.map((courseCode, index) => (
            <div 
              key={courseCode}
              className="course-legend-item"
              style={{
                backgroundColor: courseColors[index % courseColors.length],
                color: '#fff'
              }}
            >
              <span className="course-color-indicator">●</span>
              <span className="course-code-legend">{courseCode}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoutineTable;
