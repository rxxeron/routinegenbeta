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
                      
                      // Calculate dynamic font sizes based on available height and width
                      const containerWidth = window.innerWidth < 480 ? 35 : window.innerWidth < 768 ? 50 : 80;
                      const widthFactor = containerWidth / 80; // Base width factor
                      
                      const baseFontSize = Math.max(6, Math.min(16, height / 5 * widthFactor));
                      const codeFontSize = Math.max(7, Math.min(18, height / 3.5 * widthFactor));
                      const timeFontSize = Math.max(5, Math.min(14, height / 7 * widthFactor));
                      const roomFontSize = Math.max(5, Math.min(12, height / 9 * widthFactor));
                      
                      // Determine content strategy based on height and available space
                      const showTime = height > 25;
                      const showRoom = height > 40;
                      const showFullContent = height > 60;
                      
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
                            zIndex: 1,
                            fontSize: `${baseFontSize}px`
                          }}
                        >
                          <div className="course-content">
                            <div 
                              className="course-code"
                              style={{ 
                                fontSize: `${codeFontSize}px`,
                                lineHeight: '1.1',
                                marginBottom: showTime ? '1px' : '0'
                              }}
                            >
                              {showFullContent ? course.courseCode : 
                               height < 30 ? course.courseCode.substring(0, 8) :
                               height < 50 ? course.courseCode.substring(0, 12) :
                               course.courseCode}
                            </div>
                            {showTime && (
                              <div 
                                className="course-time"
                                style={{ 
                                  fontSize: `${timeFontSize}px`,
                                  lineHeight: '1',
                                  marginBottom: showRoom ? '1px' : '0'
                                }}
                              >
                                {height < 40 
                                  ? `${course.startTime.substring(0, 5)}`
                                  : showFullContent 
                                  ? `${course.startTime} - ${course.endTime}`
                                  : `${course.startTime.substring(0, 5)}-${course.endTime.substring(0, 5)}`
                                }
                              </div>
                            )}
                            {showRoom && (
                              <div 
                                className="course-room"
                                style={{ 
                                  fontSize: `${roomFontSize}px`,
                                  lineHeight: '1'
                                }}
                              >
                                {height < 60 ? course.room.substring(0, 8) : course.room}
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
