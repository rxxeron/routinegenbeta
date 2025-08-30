import React from 'react';

const RoutineTable = ({ routineData }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Create time slots: each hour divided into 6 slots (10-minute intervals)
  const timeSlots = [];
  for (let hour = 8; hour <= 19; hour++) {
    for (let segment = 0; segment < 6; segment++) {
      const minutes = segment * 10;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      timeSlots.push(timeStr);
    }
  }

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Function to find which time slot index a course should start at
  const getTimeSlotIndex = (timeStr) => {
    const minutes = timeToMinutes(timeStr);
    const baseMinutes = timeToMinutes('08:00');
    const slotIndex = Math.floor((minutes - baseMinutes) / 10);
    return Math.max(0, slotIndex);
  };

  // Function to calculate how many 10-minute slots a course spans
  const getCourseDuration = (startTime, endTime) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return Math.ceil((endMinutes - startMinutes) / 10);
  };

  const colors = [
    '#FFB6C1', '#87CEEB', '#98FB98', '#F0E68C', '#DDA0DD',
    '#FFE4B5', '#B0E0E6', '#FAFAD2', '#FFE4E1', '#E0E6FF'
  ];
  
  const courseColors = {};
  let colorIndex = 0;

  // Group courses by day
  const coursesByDay = {};
  days.forEach(day => {
    coursesByDay[day] = routineData.filter(course => course.day === day);
  });

  // Assign colors to courses
  routineData.forEach(course => {
    if (!courseColors[course.courseCode]) {
      courseColors[course.courseCode] = colors[colorIndex % colors.length];
      colorIndex++;
    }
  });

  return (
    <div className="routine-table">
      <div className="schedule-grid">
        {/* Header row */}
        <div className="header-cell time-header">Time</div>
        {days.map(day => (
          <div key={day} className="header-cell day-header">
            {day}
          </div>
        ))}

        {/* Generate grid cells - show only hour markers for reference */}
        {timeSlots.map((timeSlot, index) => {
          const isHourMark = timeSlot.endsWith(':00');
          
          return (
            <React.Fragment key={timeSlot}>
              {/* Time column - show only hour marks */}
              <div className="time-cell">
                {isHourMark ? timeSlot : ''}
              </div>
              
              {/* Day columns */}
              {days.map(day => {
                // Check if any course should be rendered at this slot
                const coursesToRender = coursesByDay[day].filter(course => {
                  const courseStartSlot = getTimeSlotIndex(course.startTime);
                  return courseStartSlot === index;
                });

                return (
                  <div key={`${day}-${timeSlot}`} className="schedule-cell">
                    {coursesToRender.map((course, courseIndex) => {
                      const duration = getCourseDuration(course.startTime, course.endTime);
                      const height = duration * 10; // 10px per 10-minute slot
                      
                      // Use different sizing strategies for desktop vs mobile
                      const isMobileDevice = window.innerWidth < 768;
                      let codeFontSize, timeFontSize, roomFontSize;
                      
                      if (isMobileDevice) {
                        // Mobile: Calculate optimal font sizes to fit content
                        const containerWidth = window.innerWidth < 480 ? 35 : 50;
                        
                        // Calculate based on content length and available space for mobile
                        const courseText = course.courseCode;
                        const timeText = `${course.startTime.substring(0, 5)}-${course.endTime.substring(0, 5)}`;
                        const roomText = course.room;
                        
                        // Calculate optimal sizes based on text length and container size
                        codeFontSize = Math.min(12, Math.max(6, (containerWidth * 0.8) / Math.max(courseText.length * 0.6, 4)));
                        timeFontSize = Math.min(14, Math.max(7, (containerWidth * 0.9) / Math.max(timeText.length * 0.5, 6)));
                        roomFontSize = Math.min(12, Math.max(6, (containerWidth * 0.8) / Math.max(roomText.length * 0.6, 4)));
                      } else {
                        // Desktop: Use generous, readable sizes based on height
                        codeFontSize = Math.max(10, Math.min(16, height / 5));
                        timeFontSize = Math.max(12, Math.min(18, height / 3.5));
                        roomFontSize = Math.max(10, Math.min(16, height / 4.5));
                      }
                      
                      // More generous content thresholds, especially for mobile
                      const isMobileDisplay = window.innerWidth < 480;
                      const isTabletDisplay = window.innerWidth < 768;
                      
                      const showTime = isMobileDisplay ? height > 15 : isTabletDisplay ? height > 18 : height > 20;
                      const showRoom = isMobileDisplay ? height > 30 : isTabletDisplay ? height > 32 : height > 35;
                      
                      return (
                        <div
                          key={`${course.courseCode}-${courseIndex}`}
                          className="course-block"
                          style={{
                            height: `${height}px`,
                            backgroundColor: courseColors[course.courseCode],
                            position: 'absolute',
                            width: 'calc(100% - 2px)',
                            left: '1px',
                            top: '0',
                            zIndex: 1
                          }}
                        >
                          <div className="course-content">
                            <div 
                              className="course-code"
                              style={{ 
                                fontSize: `${codeFontSize}px`,
                                lineHeight: '1.1',
                                marginBottom: showTime ? '2px' : '0',
                                fontWeight: 'normal',
                                opacity: 0.7
                              }}
                            >
                              {isMobileDevice ? course.courseCode : course.courseCode}
                            </div>
                            {showTime && (
                              <div 
                                className="course-time"
                                style={{ 
                                  fontSize: `${timeFontSize}px`,
                                  lineHeight: '1.1',
                                  marginBottom: showRoom ? '2px' : '0',
                                  fontWeight: 'bold',
                                  color: '#1a1a1a'
                                }}
                              >
                                {isMobileDevice
                                  ? `${course.startTime.substring(0, 5)}-${course.endTime.substring(0, 5)}`
                                  : `${course.startTime} - ${course.endTime}`
                                }
                              </div>
                            )}
                            {showRoom && (
                              <div 
                                className="course-room"
                                style={{ 
                                  fontSize: `${roomFontSize}px`,
                                  lineHeight: '1.1',
                                  fontWeight: 'bold',
                                  color: '#2c5aa0'
                                }}
                              >
                                {course.room}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      
      {routineData.length > 0 && (
        <div className="schedule-summary">
          <h3>Course Summary</h3>
          <div className="course-list">
            {Object.keys(courseColors).map(courseCode => (
              <div key={courseCode} className="course-summary-item">
                <div 
                  className="course-color-indicator" 
                  style={{ backgroundColor: courseColors[courseCode] }}
                ></div>
                <span>{courseCode}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineTable;
