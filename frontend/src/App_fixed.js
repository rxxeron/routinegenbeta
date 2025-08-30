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

    try {
      setLoading(true);
      
      if (!window.jsPDF) {
        setError('PDF library not loaded. Please refresh the page and try again.');
        return;
      }

      const scheduleElement = document.querySelector('.schedule-grid');
      if (!scheduleElement) {
        setError('Schedule not found on page');
        return;
      }

      const canvas = await window.html2canvas(scheduleElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: scheduleElement.scrollWidth,
        height: scheduleElement.scrollHeight
      });

      const { jsPDF } = window.jsPDF;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const widthScale = pdfWidth / canvasWidth;
      const heightScale = pdfHeight / canvasHeight;
      const scale = Math.min(widthScale, heightScale) * 0.9; // 0.9 for margins
      
      const scaledWidth = canvasWidth * scale;
      const scaledHeight = canvasHeight * scale;
      
      const x = (pdfWidth - scaledWidth) / 2;
      const y = (pdfHeight - scaledHeight) / 2;

      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('Weekly Class Schedule', pdfWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdfWidth / 2, 22, { align: 'center' });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y + 10, scaledWidth, scaledHeight);

      const uniqueCourses = [...new Set(dataToUse.map(course => course.courseCode))];
      if (uniqueCourses.length > 0) {
        pdf.setFontSize(10);
        pdf.text('Courses: ' + uniqueCourses.join(', '), 10, pdfHeight - 10);
      }

      pdf.save('weekly-schedule.pdf');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF: ' + error.message);
    } finally {
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
      if (!scheduleElement) {
        throw new Error('Schedule not found');
      }

      if (window.html2canvas) {
        const canvas = await window.html2canvas(scheduleElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'weekly-schedule.png';
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
      
    } catch (error) {
      setError('Failed to export image: ' + error.message);
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
