import React, { useState } from 'react';
import { Analytics } from "@vercel/analytics/react";
import FileUpload from './FileUpload';
import RoutineTable from './RoutineTable';
import './App.css';

function App() {
  const [routineData, setRoutineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDataReceived = (data) => {
    setRoutineData(data);
    setError('');
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setRoutineData([]);
  };

  const handleLoadingChange = (isLoading) => {
    setLoading(isLoading);
  };

  const handleExportPDF = async () => {
    const dataToUse = routineData;
    
    if (!Array.isArray(dataToUse) || dataToUse.length === 0) {
      setError('No valid schedule data to export');
      return;
    }

    try {
      setLoading(true);
      
      let jsPDFConstructor = null;
      
      if (window.jsPDF) {
        jsPDFConstructor = window.jsPDF;
      } else if (window.jspdf && window.jspdf.jsPDF) {
        jsPDFConstructor = window.jspdf.jsPDF;
      } else if (window.jspdf) {
        jsPDFConstructor = window.jspdf;
      }
      
      if (!jsPDFConstructor) {
        setError('PDF library not loaded. Please refresh the page and try again.');
        return;
      }

      // Get the actual schedule element that's currently displayed
      const scheduleElement = document.querySelector('.routine-table');
      if (!scheduleElement) {
        setError('Schedule not found on page');
        return;
      }

      // Detect mobile device
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Take a direct screenshot of the schedule element
      const canvas = await window.html2canvas(scheduleElement, {
        backgroundColor: '#ffffff',
        scale: isMobileDevice ? 3 : 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: scheduleElement.offsetWidth,
        height: scheduleElement.offsetHeight
      });

      // Create PDF with appropriate orientation
      const pdf = new jsPDFConstructor({
        orientation: isMobileDevice ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Get PDF dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add image to fill the entire page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.save(`schedule-${isMobileDevice ? 'mobile' : 'desktop'}-${new Date().getTime()}.pdf`);
      
    } catch (error) {
      setError('Failed to export PDF: ' + error.message);
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
      
      // Get the actual schedule element that's currently displayed
      const scheduleElement = document.querySelector('.routine-table');
      if (!scheduleElement) {
        setError('Schedule not found on page');
        return;
      }

      // Detect mobile device
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Take a direct screenshot of the schedule element
      const canvas = await window.html2canvas(scheduleElement, {
        backgroundColor: '#ffffff',
        scale: isMobileDevice ? 3 : 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: scheduleElement.offsetWidth,
        height: scheduleElement.offsetHeight
      });

      // Create download link
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `schedule-${isMobileDevice ? 'mobile' : 'desktop'}-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      setError('Failed to export image: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📅 Schedule Generator for EWU Students!</h1>
        <p>Upload your Advising Slip - Weekly Schedule Appears Instantly with&nbsp;download&nbsp;option.</p>
      </header>
      
      <main className="App-main">
        {routineData.length === 0 && (
          <>
            <FileUpload 
              onDataReceived={handleDataReceived}
              onError={handleError}
              onLoadingChange={handleLoadingChange}
            />
            
            {loading && (
              <div className="loading">
                <p>📊 Processing your file and generating schedule...</p>
              </div>
            )}
            
            {error && (
              <div className="error">
                <p>Error: {error}</p>
              </div>
            )}
          </>
        )}
        
        {routineData.length > 0 && (
          <div className="routine-container">
            <div className="schedule-header">
              <h2>📅 Your Weekly Schedule</h2>
              <div className="schedule-actions">
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
                <button 
                  onClick={() => {
                    setRoutineData([]);
                    setError('');
                    setLoading(false);
                  }}
                  className="upload-new-btn"
                >
                  📁 Upload New File
                </button>
              </div>
            </div>
            
            {loading && (
              <div className="loading">
                <p>📊 Generating your export...</p>
              </div>
            )}
            
            {error && (
              <div className="error">
                <p>Error: {error}</p>
              </div>
            )}
            
            <RoutineTable routineData={routineData} />
          </div>
        )}
      </main>
      
      <footer className="app-footer">
        <p>Created by <a href="https://rxxeron.me" target="_blank" rel="noopener noreferrer">rxxeron</a></p>
      </footer>
      <Analytics />
    </div>
  );
}

export default App;
