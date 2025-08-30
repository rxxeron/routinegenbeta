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

      const routineContainer = document.querySelector('.routine-table');
      if (!routineContainer) {
        setError('Schedule not found on page');
        return;
      }

      const exportWrapper = document.createElement('div');
      exportWrapper.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 1200px;
        background: white;
        padding: 15px;
        font-family: Arial, sans-serif;
        z-index: -1000;
        box-sizing: border-box;
      `;

      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = `
        text-align: center;
        margin-bottom: 15px;
      `;
      titleDiv.innerHTML = `
        <h1 style="margin: 0 0 8px 0; font-size: 22px; color: #333;">Weekly Class Schedule</h1>
        <p style="margin: 0; font-size: 13px; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
      `;

      const scheduleClone = routineContainer.cloneNode(true);
      scheduleClone.style.cssText = `
        width: 100%;
        margin: 0;
        max-width: 100%;
        overflow: visible;
      `;

      exportWrapper.appendChild(titleDiv);
      exportWrapper.appendChild(scheduleClone);
      
      document.body.appendChild(exportWrapper);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await window.html2canvas(exportWrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 1200,
        height: exportWrapper.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false
      });

      document.body.removeChild(exportWrapper);

      const pdf = new jsPDFConstructor({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      const canvasAspectRatio = canvas.width / canvas.height;
      const availableAspectRatio = availableWidth / availableHeight;
      
      let finalWidth, finalHeight;
      
      if (canvasAspectRatio > availableAspectRatio) {
        finalWidth = availableWidth;
        finalHeight = availableWidth / canvasAspectRatio;
      } else {
        finalHeight = availableHeight;
        finalWidth = availableHeight * canvasAspectRatio;
      }
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

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
      
      const routineContainer = document.querySelector('.routine-table');
      if (!routineContainer) {
        setError('Schedule not found on page');
        return;
      }

      const exportWrapper = document.createElement('div');
      exportWrapper.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 1200px;
        background: white;
        padding: 15px;
        font-family: Arial, sans-serif;
        z-index: -1000;
        box-sizing: border-box;
      `;

      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = `
        text-align: center;
        margin-bottom: 15px;
      `;
      titleDiv.innerHTML = `
        <h1 style="margin: 0 0 8px 0; font-size: 22px; color: #333;">Weekly Class Schedule</h1>
        <p style="margin: 0; font-size: 13px; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
      `;

      const scheduleClone = routineContainer.cloneNode(true);
      scheduleClone.style.cssText = `
        width: 100%;
        margin: 0;
        max-width: 100%;
        overflow: visible;
      `;

      exportWrapper.appendChild(titleDiv);
      exportWrapper.appendChild(scheduleClone);
      
      document.body.appendChild(exportWrapper);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await window.html2canvas(exportWrapper, {
        backgroundColor: '#ffffff',
        scale: 3, 
        useCORS: true,
        allowTaint: true,
        width: 1200,
        height: exportWrapper.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false
      });

      document.body.removeChild(exportWrapper);
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'weekly-schedule.png';
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
