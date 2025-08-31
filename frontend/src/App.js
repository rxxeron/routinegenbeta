import React, { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/react";
import FileUpload from './FileUpload';
import RoutineTable from './RoutineTable';
import './App.css';

function App() {
  const [routineData, setRoutineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update viewport meta tag based on view state
  useEffect(() => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (routineData.length > 0) {
      // Switch to desktop viewport when schedule is shown
      viewport.setAttribute('content', 'width=1024, initial-scale=1, user-scalable=yes, minimum-scale=1, maximum-scale=1');
    } else {
      // Use responsive viewport for upload view
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=yes');
    }
  }, [routineData.length]);

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

      // Detect mobile device
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
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
        animation: none !important;
        transform: none !important;
        opacity: 1 !important;
        visibility: visible !important;
      `;

      // Remove animations from all child elements
      const allElements = scheduleClone.querySelectorAll('*');
      allElements.forEach(el => {
        el.style.animation = 'none';
        el.style.transform = 'none';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
      });

      exportWrapper.appendChild(titleDiv);
      exportWrapper.appendChild(scheduleClone);
      
      // Add course summary section
      const uniqueCourses = [...new Set(dataToUse.map(course => course.courseCode))];
      const courseColors = ['#f8d7da', '#d1ecf1', '#d4edda', '#fff3cd', '#e2d9e2', '#fdeaa7'];
      
      const summarySection = document.createElement('div');
      summarySection.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        border-top: 1px solid #ddd;
      `;
      
      const summaryTitle = document.createElement('h3');
      summaryTitle.style.cssText = `
        margin: 0 0 10px 0; 
        font-size: 16px; 
        color: #333;
        font-weight: bold;
      `;
      summaryTitle.textContent = 'Course Summary';
      
      const courseList = document.createElement('div');
      courseList.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      `;
      
      uniqueCourses.forEach((course, index) => {
        const color = courseColors[index % courseColors.length];
        const courseItem = document.createElement('span');
        courseItem.style.cssText = `
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          background-color: ${color};
          border-radius: 3px;
          font-size: 11px;
          border: 1px solid #ccc;
          margin-right: 8px;
          margin-bottom: 4px;
        `;
        courseItem.innerHTML = `<span style="color: #333; margin-right: 5px;">●</span>${course}`;
        courseList.appendChild(courseItem);
      });
      
      summarySection.appendChild(summaryTitle);
      summarySection.appendChild(courseList);
      exportWrapper.appendChild(summarySection);
      
      document.body.appendChild(exportWrapper);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force layout recalculation
      void exportWrapper.offsetHeight;

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
        orientation: isMobileDevice ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fill the page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add image to fit the page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.save(`weekly-schedule-${isMobileDevice ? 'mobile' : 'desktop'}.pdf`);
      
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
      
      const routineContainer = document.querySelector('.routine-table');
      if (!routineContainer) {
        setError('Schedule not found on page');
        return;
      }

      // Detect mobile device
      const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
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
        animation: none !important;
        transform: none !important;
        opacity: 1 !important;
        visibility: visible !important;
      `;

      // Remove animations from all child elements
      const allElements = scheduleClone.querySelectorAll('*');
      allElements.forEach(el => {
        el.style.animation = 'none';
        el.style.transform = 'none';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
      });

      exportWrapper.appendChild(titleDiv);
      exportWrapper.appendChild(scheduleClone);
      
      // Add course summary section for PNG export
      const uniqueCourses = [...new Set(routineData.map(course => course.courseCode))];
      const courseColors = ['#f8d7da', '#d1ecf1', '#d4edda', '#fff3cd', '#e2d9e2', '#fdeaa7'];
      
      const summarySection = document.createElement('div');
      summarySection.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        border-top: 1px solid #ddd;
      `;
      
      const summaryTitle = document.createElement('h3');
      summaryTitle.style.cssText = `
        margin: 0 0 10px 0; 
        font-size: 16px; 
        color: #333;
        font-weight: bold;
      `;
      summaryTitle.textContent = 'Course Summary';
      
      const courseList = document.createElement('div');
      courseList.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      `;
      
      uniqueCourses.forEach((course, index) => {
        const color = courseColors[index % courseColors.length];
        const courseItem = document.createElement('span');
        courseItem.style.cssText = `
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          background-color: ${color};
          border-radius: 3px;
          font-size: 11px;
          border: 1px solid #ccc;
          margin-right: 8px;
          margin-bottom: 4px;
        `;
        courseItem.innerHTML = `<span style="color: #333; margin-right: 5px;">●</span>${course}`;
        courseList.appendChild(courseItem);
      });
      
      summarySection.appendChild(summaryTitle);
      summarySection.appendChild(courseList);
      exportWrapper.appendChild(summarySection);
      
      document.body.appendChild(exportWrapper);

      // Wait longer for rendering and force a repaint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force layout recalculation
      void exportWrapper.offsetHeight;

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
      
      // Create standard full-page canvas for PNG
      const standardCanvas = document.createElement('canvas');
      const ctx = standardCanvas.getContext('2d');
      
      // Use different dimensions based on device type
      if (isMobileDevice) {
        // Portrait orientation for mobile - A4 portrait at 300 DPI
        standardCanvas.width = 2480;
        standardCanvas.height = 3508;
      } else {
        // Landscape orientation for desktop - A4 landscape at 300 DPI
        standardCanvas.width = 3508;
        standardCanvas.height = 2480;
      }
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, standardCanvas.width, standardCanvas.height);
      
      // Draw the captured content to fill the entire page
      ctx.drawImage(canvas, 0, 0, standardCanvas.width, standardCanvas.height);
      
      const link = document.createElement('a');
      link.href = standardCanvas.toDataURL('image/png');
      link.download = `weekly-schedule-${isMobileDevice ? 'mobile' : 'desktop'}.png`;
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
    <div className={`App ${routineData.length > 0 ? 'schedule-view' : 'upload-view'}`}>
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
