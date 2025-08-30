import React, { useState } from 'react';
import FileUpload from './FileUpload';
import RoutineTable from './RoutineTable';
import './App.css';

function App() {
  const [routineData, setRoutineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDataReceived = (data) => {
    setRoutineData(data);
    setError('');
    setSuccessMessage(`✅ Successfully loaded ${data.length} courses! Opening colorful PDF...`);
    
    if (data && data.length > 0) {
      setTimeout(() => {
        handleExportPDF(data);
        setSuccessMessage('');
      }, 2000);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setRoutineData([]);
    setSuccessMessage('');
  };

  const handleLoadingChange = (isLoading) => {
    setLoading(isLoading);
  };

  const handleExportPDF = async (dataToExport = null) => {
    const dataToUse = dataToExport || routineData;
    if (!dataToUse || dataToUse.length === 0) {
      setError('No schedule data to export');
      return;
    }
    // Store original styles
    const scheduleElement = document.querySelector('.schedule-grid');
    const routineContainer = scheduleElement?.closest('.routine-container');
    const routineTable = scheduleElement?.closest('.routine-table');
    const originalStyles = {
      schedule: scheduleElement ? scheduleElement.style.cssText : '',
      container: routineContainer ? routineContainer.style.cssText : '',
      table: routineTable ? routineTable.style.cssText : ''
    };
    try {
      setLoading(true);
      if (!window.jsPDF) {
        setError('PDF library not loaded. Please refresh the page and try again.');
        return;
      }
      // Force full width, no margin/padding for export
      if (scheduleElement) {
        scheduleElement.style.width = '100vw';
        scheduleElement.style.maxWidth = '100vw';
        scheduleElement.style.margin = '0';
        scheduleElement.style.padding = '0';
      }
      if (routineContainer) {
        routineContainer.style.width = '100vw';
        routineContainer.style.maxWidth = '100vw';
        routineContainer.style.margin = '0';
        routineContainer.style.padding = '0';
      }
      if (routineTable) {
        routineTable.style.width = '100vw';
        routineTable.style.maxWidth = '100vw';
        routineTable.style.margin = '0';
        routineTable.style.padding = '0';
      }
      // Wait for style to apply
      await new Promise(r => setTimeout(r, 100));
      const canvas = await window.html2canvas(scheduleElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: scheduleElement.scrollWidth,
        height: scheduleElement.scrollHeight
      });
      
      // Detect if user is on mobile device
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const { jsPDF } = window.jsPDF;
      const pdf = new jsPDF({
        orientation: isMobileDevice ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Always use full page - scale to fit entire page with small margins
      const margin = 10; // 10mm margin on all sides
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2) - 20; // Extra space for title
      
      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Weekly Class Schedule', pdfWidth / 2, 15, { align: 'center' });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Add full-page image that fills the available space
      pdf.addImage(imgData, 'PNG', margin, margin + 15, availableWidth, availableHeight);
      const uniqueCourses = [...new Set(dataToUse.map(course => course.courseCode))];
      if (uniqueCourses.length > 0) {
        pdf.setFontSize(10);
        pdf.text('Courses: ' + uniqueCourses.join(', '), 10, pdfHeight - 10);
      }
      pdf.save(`weekly-schedule-${isMobileDevice ? 'portrait' : 'landscape'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF: ' + error.message);
    } finally {
      // Restore original styles
      if (scheduleElement) scheduleElement.style.cssText = originalStyles.schedule;
      if (routineContainer) routineContainer.style.cssText = originalStyles.container;
      if (routineTable) routineTable.style.cssText = originalStyles.table;
      setLoading(false);
    }
  };

  const handleExportPNG = async () => {
    if (routineData.length === 0) {
      setError('No schedule data to export');
      return;
    }

    try {
      setLoading(true);
      const scheduleElement = document.querySelector('.schedule-grid');
      const routineContainer = scheduleElement?.closest('.routine-container');
      const routineTable = scheduleElement?.closest('.routine-table');
      const originalStyles = {
        schedule: scheduleElement ? scheduleElement.style.cssText : '',
        container: routineContainer ? routineContainer.style.cssText : '',
        table: routineTable ? routineTable.style.cssText : ''
      };
      // Force full width, no margin/padding for export
      if (scheduleElement) {
        scheduleElement.style.width = '100vw';
        scheduleElement.style.maxWidth = '100vw';
        scheduleElement.style.margin = '0';
        scheduleElement.style.padding = '0';
      }
      if (routineContainer) {
        routineContainer.style.width = '100vw';
        routineContainer.style.maxWidth = '100vw';
        routineContainer.style.margin = '0';
        routineContainer.style.padding = '0';
      }
      if (routineTable) {
        routineTable.style.width = '100vw';
        routineTable.style.maxWidth = '100vw';
        routineTable.style.margin = '0';
        routineTable.style.padding = '0';
      }
      await new Promise(r => setTimeout(r, 100));
      
      // Detect if user is on mobile device
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (window.html2canvas) {
        // Create initial canvas of the schedule
        const originalCanvas = await window.html2canvas(scheduleElement, {
          backgroundColor: '#ffffff',
          scale: isMobileDevice ? 3 : 2,
          useCORS: true,
          allowTaint: true
        });
        
        // Create a new standardized full-page canvas
        const standardCanvas = document.createElement('canvas');
        const ctx = standardCanvas.getContext('2d');
        
        // Set standard page dimensions (A4 proportions)
        if (isMobileDevice) {
          // Portrait orientation for mobile
          standardCanvas.width = 2480; // A4 portrait width at 300 DPI
          standardCanvas.height = 3508; // A4 portrait height at 300 DPI
        } else {
          // Landscape orientation for desktop
          standardCanvas.width = 3508; // A4 landscape width at 300 DPI
          standardCanvas.height = 2480; // A4 landscape height at 300 DPI
        }
        
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, standardCanvas.width, standardCanvas.height);
        
        // Add title
        ctx.fillStyle = '#282828';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Weekly Class Schedule', standardCanvas.width / 2, 100);
        
        // Calculate dimensions to fit the schedule with margins
        const margin = 100;
        const availableWidth = standardCanvas.width - (margin * 2);
        const availableHeight = standardCanvas.height - (margin * 2) - 120; // Extra space for title
        
        // Draw the schedule to fill the available space
        ctx.drawImage(originalCanvas, margin, margin + 120, availableWidth, availableHeight);
        
        standardCanvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `weekly-schedule-${isMobileDevice ? 'mobile' : 'desktop'}.png`;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 'image/png');
      } else {
        const response = await fetch('http://localhost:5000/api/export/csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courses: routineData }),
        });
        if (!response.ok) {
          throw new Error('Failed to export data');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'weekly-schedule.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setError('PNG export not available. Downloaded as CSV instead.');
      }
      // Restore original styles
      if (scheduleElement) scheduleElement.style.cssText = originalStyles.schedule;
      if (routineContainer) routineContainer.style.cssText = originalStyles.container;
      if (routineTable) routineTable.style.cssText = originalStyles.table;
    } catch (error) {
      setError('Failed to export PNG: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>RoutineGen</h1>
        <p>Select your CSV file - Schedule appears instantly with colorful PDF ready to print!</p>
      </header>
      
      <main className="App-main">
        <FileUpload 
          onDataReceived={handleDataReceived}
          onError={handleError}
          onLoadingChange={handleLoadingChange}
        />
        
        {loading && (
          <div className="loading">
            <p>📊 Processing your file and generating colorful schedule...</p>
          </div>
        )}
        
        {successMessage && (
          <div className="success">
            <p>{successMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="error">
            <p>Error: {error}</p>
          </div>
        )}
        
        {routineData.length > 0 && (
          <div className="routine-container">
            <div className="schedule-header">
              <h2>Your Weekly Schedule</h2>
              <div className="export-buttons">
                <button 
                  onClick={handleExportPDF} 
                  className="export-btn export-pdf"
                  disabled={loading}
                >
                  📄 Download PDF
                </button>
                <button 
                  onClick={handleExportPNG} 
                  className="export-btn export-png"
                  disabled={loading}
                >
                  🖼️ Save as Image
                </button>
              </div>
            </div>
            <RoutineTable routineData={routineData} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
