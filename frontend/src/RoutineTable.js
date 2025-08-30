import React from 'react';

const RoutineTable = ({ routineData }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [];
  
  for (let hour = 8; hour <= 19; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculatePosition = (startTime, endTime) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const baseMinutes = timeToMinutes('08:00');
    
    const top = ((startMinutes - baseMinutes) / 60) * 60; // 60px per hour
    const height = ((endMinutes - startMinutes) / 60) * 60;
    
    return { top, height };
  };

  const colors = [
    '#FFB6C1', '#87CEEB', '#98FB98', '#F0E68C', '#DDA0DD',
    '#FFE4B5', '#B0E0E6', '#FAFAD2', '#FFE4E1', '#E0E6FF'
  ];
  
  const courseColors = {};
  let colorIndex = 0;

  const coursesByDay = {};
  days.forEach(day => {
    coursesByDay[day] = routineData.filter(course => course.day === day);
  });

  routineData.forEach(course => {
    if (!courseColors[course.courseCode]) {
      courseColors[course.courseCode] = colors[colorIndex % colors.length];
      colorIndex++;
    }
  });

  return (
    <div className="routine-table">
      <div className="schedule-grid">
        {/* Header row with days */}
        <div className="header-cell time-header">Time</div>
        {days.map(day => (
          <div key={day} className="header-cell day-header">
            {day}
          </div>
        ))}

        {/* Time column and day columns */}
        {timeSlots.map(timeSlot => (
          <React.Fragment key={timeSlot}>
            <div className="time-cell">
              {timeSlot}
            </div>
            {days.map(day => (
              <div key={`${day}-${timeSlot}`} className="schedule-cell">
                {/* This cell will be used for positioning */}
              </div>
            ))}
          </React.Fragment>
        ))}

        {/* Course blocks positioned absolutely */}
        {days.map(day => (
          <div key={`courses-${day}`} className={`day-column day-${day.toLowerCase()}`}>
            {coursesByDay[day].map((course, index) => {
              const position = calculatePosition(course.startTime, course.endTime);
              return (
                <div
                  key={`${course.courseCode}-${index}`}
                  className="course-block"
                  style={{
                    top: `${position.top + 40}px`, // Offset for header
                    height: `${position.height}px`,
                    backgroundColor: courseColors[course.courseCode],
                    left: '2px',
                    right: '2px',
                    position: 'absolute'
                  }}
                >
                  <div className="course-content">
                    <div className="course-code">{course.courseCode}</div>
                    <div className="course-time">
                      {course.startTime} - {course.endTime}
                    </div>
                    <div className="course-room">{course.room}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
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
