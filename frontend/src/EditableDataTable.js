import React, { useState, useEffect } from 'react';
import './EditableDataTable.css';

const EditableDataTable = ({ extractedData, onConfirm, onCancel }) => {
  const [tableData, setTableData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Convert the course data to table format for editing
    // Group courses by courseCode, startTime, endTime to reconstruct day combinations
    const courseGroups = {};
    
    extractedData.forEach((course, index) => {
      const key = `${course.courseCode}-${course.startTime}-${course.endTime}-${course.room}`;
      if (!courseGroups[key]) {
        courseGroups[key] = {
          courseCode: course.courseCode || '',
          days: [],
          startTime: course.startTime || '',
          endTime: course.endTime || '',
          room: course.room || ''
        };
      }
      courseGroups[key].days.push(course.day);
    });

    // Convert to table format
    const formattedData = Object.values(courseGroups).map((group, index) => {
      // Convert day names back to day codes
      const dayCodeMapping = {
        'Sunday': 'S',
        'Monday': 'M', 
        'Tuesday': 'T',
        'Wednesday': 'W',
        'Thursday': 'R',
        'Friday': 'F',
        'Saturday': 'A'
      };
      
      const dayCodes = group.days
        .map(day => dayCodeMapping[day])
        .filter(code => code)
        .join('');

      return {
        id: index,
        courseCode: group.courseCode,
        day: dayCodes,
        startTime: group.startTime,
        endTime: group.endTime,
        room: group.room
      };
    });
    
    setTableData(formattedData);
  }, [extractedData]);

  const handleCellEdit = (rowIndex, field, value) => {
    const updatedData = [...tableData];
    updatedData[rowIndex][field] = value;
    setTableData(updatedData);
    setIsEditing(true);
  };

  const addNewRow = () => {
    const newRow = {
      id: tableData.length,
      courseCode: '',
      day: '',
      startTime: '',
      endTime: '',
      room: ''
    };
    setTableData([...tableData, newRow]);
    setIsEditing(true);
  };

  const deleteRow = (rowIndex) => {
    const updatedData = tableData.filter((_, index) => index !== rowIndex);
    setTableData(updatedData);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    // Convert table data back to the format expected by RoutineTable
    const confirmedData = [];
    
    const dayCodeMapping = {
      'S': 'Sunday',
      'M': 'Monday', 
      'T': 'Tuesday',
      'W': 'Wednesday',
      'R': 'Thursday',
      'F': 'Friday',
      'A': 'Saturday'
    };
    
    tableData
      .filter(row => row.courseCode.trim() && row.day.trim()) // Filter out empty rows
      .forEach(row => {
        const cleanDayCodes = row.day.trim().toUpperCase();
        
        // Expand day codes to individual entries
        for (let i = 0; i < cleanDayCodes.length; i++) {
          const dayCode = cleanDayCodes[i];
          if (dayCodeMapping[dayCode]) {
            confirmedData.push({
              courseCode: row.courseCode.trim(),
              day: dayCodeMapping[dayCode],
              startTime: row.startTime.trim(),
              endTime: row.endTime.trim(),
              room: row.room.trim()
            });
          }
        }
      });

    onConfirm(confirmedData);
  };

  const handleCancel = () => {
    onCancel();
  };

  const timeToDisplayFormat = (time24) => {
    if (!time24 || !time24.includes(':')) return time24;
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const timeToInternalFormat = (timeDisplay) => {
    if (!timeDisplay || !timeDisplay.includes(':')) return timeDisplay;
    
    const cleanTime = timeDisplay.replace(/\s/g, '').toUpperCase();
    const match = cleanTime.match(/(\d{1,2}):(\d{2})(AM|PM)/);
    
    if (!match) return timeDisplay;
    
    let [, hours, minutes, ampm] = match;
    hours = parseInt(hours);
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  return (
    <div className="editable-data-table">
      <div className="table-header">
        <h2>📋 Review Extracted Schedule Data</h2>
        <p className="table-instructions">
          Please review the extracted course information below. Click on any cell to edit the data.
          Make sure the day codes are correct (M=Monday, T=Tuesday, W=Wednesday, R=Thursday, F=Friday, S=Sunday, A=Saturday).
        </p>
      </div>

      <div className="table-container">
        <table className="data-review-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Day</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Room</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={row.id} className={rowIndex % 2 === 0 ? 'even-row' : 'odd-row'}>
                <td>
                  <input
                    type="text"
                    value={row.courseCode}
                    onChange={(e) => handleCellEdit(rowIndex, 'courseCode', e.target.value)}
                    className="editable-cell"
                    placeholder="e.g., CSE101"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.day}
                    onChange={(e) => handleCellEdit(rowIndex, 'day', e.target.value)}
                    className="editable-cell day-cell"
                    placeholder="e.g., MW, TR"
                    maxLength="10"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={timeToDisplayFormat(row.startTime)}
                    onChange={(e) => handleCellEdit(rowIndex, 'startTime', timeToInternalFormat(e.target.value))}
                    className="editable-cell time-cell"
                    placeholder="e.g., 9:00AM"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={timeToDisplayFormat(row.endTime)}
                    onChange={(e) => handleCellEdit(rowIndex, 'endTime', timeToInternalFormat(e.target.value))}
                    className="editable-cell time-cell"
                    placeholder="e.g., 10:30AM"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.room}
                    onChange={(e) => handleCellEdit(rowIndex, 'room', e.target.value)}
                    className="editable-cell"
                    placeholder="e.g., Room 101"
                  />
                </td>
                <td>
                  <button 
                    onClick={() => deleteRow(rowIndex)}
                    className="delete-row-btn"
                    title="Delete this row"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-actions">
        <button onClick={addNewRow} className="add-row-btn">
          ➕ Add New Course
        </button>
        
        <div className="day-codes-help">
          <p><strong>Day Codes:</strong> M=Monday, T=Tuesday, W=Wednesday, R=Thursday, F=Friday, S=Sunday, A=Saturday</p>
          <p><strong>Multi-day courses:</strong> Use combinations like MW, TR, MWF</p>
        </div>
      </div>

      <div className="confirmation-buttons">
        <button onClick={handleCancel} className="cancel-btn">
          ↩️ Cancel & Upload Different File
        </button>
        <button onClick={handleConfirm} className="confirm-btn">
          ✅ Confirm & Generate Schedule
        </button>
      </div>

      {isEditing && (
        <div className="edit-notice">
          <p>📝 You have made changes to the extracted data. Click "Confirm & Generate Schedule" to proceed.</p>
        </div>
      )}
    </div>
  );
};

export default EditableDataTable;
