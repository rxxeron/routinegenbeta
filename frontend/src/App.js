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
    if (!routineData || routineData.length === 0) {
      setError('No schedule data to export');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if libraries are loaded
      if (!window.html2canvas) {
        setError('html2canvas library not loaded. Please refresh the page and try again.');
        console.error('❌ html2canvas not found');
        return;
      }

      let jsPDFConstructor = null;
      if (window.jsPDF) {
        jsPDFConstructor = window.jsPDF;
        console.log('✅ Found jsPDF at window.jsPDF');
      } else if (window.jspdf && window.jspdf.jsPDF) {
        jsPDFConstructor = window.jspdf.jsPDF;
        console.log('✅ Found jsPDF at window.jspdf.jsPDF');
      } else {
        console.error('❌ jsPDF not found. Available objects:', {
          windowJsPDF: !!window.jsPDF,
          windowJspdf: !!window.jspdf,
          jspdfJsPDF: !!(window.jspdf && window.jspdf.jsPDF)
        });
      }

      if (!jsPDFConstructor) {
        setError('PDF library not loaded. Please refresh the page and try again.');
        return;
      }

      // Test PDF constructor before proceeding
      try {
        const testPdf = new jsPDFConstructor();
        console.log('✅ PDF constructor test successful');
        console.log('  PDF format capabilities:', testPdf.internal?.pageSize || 'Unknown');
      } catch (testError) {
        setError('PDF library initialization failed: ' + testError.message);
        console.error('❌ PDF constructor test failed:', testError);
        return;
      }

      // Find the schedule container
      const scheduleElement = document.querySelector('.schedule-container');
      if (!scheduleElement) {
        setError('Schedule not found on page');
        return;
      }

      // Create export wrapper with proper sizing for portrait PDF
      const exportWrapper = document.createElement('div');
      exportWrapper.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 1000px;
        background: white;
        padding: 40px 40px 60px 40px;
        font-family: Arial, sans-serif;
        z-index: -1000;
        box-sizing: border-box;
      `;

      // Add title
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = `
        text-align: center;
        margin-bottom: 30px;
      `;
      titleDiv.innerHTML = `
        <h1 style="margin: 0 0 15px 0; font-size: 26px; color: #333; font-weight: bold;">Weekly Class Schedule</h1>
        <p style="margin: 0; font-size: 14px; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
      `;

      // Clone the schedule
      const scheduleClone = scheduleElement.cloneNode(true);
      scheduleClone.style.cssText = `
        width: 100%;
        margin: 0;
        max-width: 100%;
        overflow: visible;
        font-size: 11px;
      `;
      
      // Apply specific styling for better PDF export
      const tableElement = scheduleClone.querySelector('.schedule-table');
      if (tableElement) {
        tableElement.style.cssText = `
          width: 100%;
          border-collapse: collapse;
          background: white;
          font-size: 10px;
          table-layout: fixed;
        `;
        
        // Style headers
        const headers = scheduleClone.querySelectorAll('.schedule-table th');
        headers.forEach(header => {
          header.style.cssText = `
            background-color: #495057;
            color: white;
            font-weight: bold;
            font-size: 10px;
            padding: 6px 4px;
            border: 1px solid #dee2e6;
            text-align: center;
          `;
        });
        
        // Style cells
        const cells = scheduleClone.querySelectorAll('.schedule-table td');
        cells.forEach(cell => {
          cell.style.cssText = `
            border: 1px solid #dee2e6;
            padding: 4px;
            text-align: center;
            vertical-align: middle;
            font-size: 9px;
            position: relative;
          `;
        });
        
        // Style time cells specifically
        const timeCells = scheduleClone.querySelectorAll('.time-cell');
        timeCells.forEach(timeCell => {
          timeCell.style.cssText = `
            background-color: #f8f9fa;
            font-weight: bold;
            font-size: 9px;
            width: 60px;
            min-width: 60px;
            padding: 4px 2px;
            border: 1px solid #dee2e6;
          `;
        });
        
        // Style course blocks for better PDF visibility
        const courseBlocks = scheduleClone.querySelectorAll('.course-block');
        courseBlocks.forEach(block => {
          const currentStyle = block.style.cssText;
          block.style.cssText = currentStyle + `
            font-size: 8px;
            font-weight: bold;
            line-height: 1.2;
            padding: 2px;
            border-radius: 3px;
            word-wrap: break-word;
            overflow: visible;
          `;
        });
        
        // Style course summary section for PDF
        const courseSummary = scheduleClone.querySelector('.course-summary');
        if (courseSummary) {
          courseSummary.style.cssText = `
            margin-top: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #dee2e6;
          `;
          
          const summaryTitle = courseSummary.querySelector('h3');
          if (summaryTitle) {
            summaryTitle.style.cssText = `
              margin: 0 0 12px 0;
              font-size: 12px;
              color: #333;
              text-align: center;
            `;
          }
          
          const courseTags = courseSummary.querySelectorAll('.course-tag, .course-badge');
          courseTags.forEach(tag => {
            tag.style.cssText = `
              display: inline-block;
              margin: 3px;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 8px;
              font-weight: bold;
              color: white;
            `;
          });
        }
      }

      exportWrapper.appendChild(titleDiv);
      exportWrapper.appendChild(scheduleClone);
      document.body.appendChild(exportWrapper);

      // Wait for rendering and fonts to load
      console.log('📊 Waiting for rendering...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the actual height of the content
      const actualHeight = Math.max(
        exportWrapper.scrollHeight,
        exportWrapper.offsetHeight,
        exportWrapper.clientHeight
      );
      
      console.log('📏 Content dimensions:', {
        scrollHeight: exportWrapper.scrollHeight,
        offsetHeight: exportWrapper.offsetHeight,
        clientHeight: exportWrapper.clientHeight,
        actualHeight: actualHeight
      });

      // Capture with html2canvas optimized for portrait PDF
      console.log('📸 Starting canvas capture for portrait PDF...');
      const canvas = await window.html2canvas(exportWrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 1000,
        height: actualHeight + 50, // Add extra padding to ensure nothing is cut
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 0,
        removeContainer: false,
        logging: false
      });

      console.log('✅ Canvas captured:', {
        width: canvas.width,
        height: canvas.height,
        size: `${(canvas.width * canvas.height * 4 / 1024 / 1024).toFixed(2)}MB`
      });

      document.body.removeChild(exportWrapper);

      // Create PDF in portrait orientation
      console.log('📄 Creating portrait PDF...');
      const pdf = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      console.log('✅ PDF instance created in portrait mode');

      const imgData = canvas.toDataURL('image/png', 1.0);
      console.log('✅ Image data converted for PDF');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      console.log('📐 PDF dimensions (portrait):', { pdfWidth, pdfHeight });
      
      // For portrait, ensure full content is visible
      const canvasAspectRatio = canvas.width / canvas.height;
      
      let finalWidth = pdfWidth - 20; // Leave 10mm margin on each side
      let finalHeight = finalWidth / canvasAspectRatio;
      let offsetX = 10; // 10mm left margin
      let offsetY = 10; // 10mm top margin
      
      // Check if content fits in single page with margins
      const availableHeight = pdfHeight - 20; // Account for top and bottom margins
      
      if (finalHeight > availableHeight) {
        // Content is too tall, scale down to fit with margins
        finalHeight = availableHeight;
        finalWidth = finalHeight * canvasAspectRatio;
        offsetX = (pdfWidth - finalWidth) / 2; // Center horizontally
        console.log('📄 Content scaled down to fit single page with margins');
      } else {
        // Content fits, center it vertically
        offsetY = (pdfHeight - finalHeight) / 2;
        console.log('📄 Content fits comfortably with margins');
      }

      console.log('📐 Final positioning (portrait with margins):', { 
        finalWidth: finalWidth.toFixed(2), 
        finalHeight: finalHeight.toFixed(2), 
        offsetX: offsetX.toFixed(2), 
        offsetY: offsetY.toFixed(2),
        aspectRatio: canvasAspectRatio.toFixed(3),
        contentFitsWithMargins: finalHeight <= availableHeight,
        marginsApplied: '10mm all sides'
      });

      pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight, undefined, 'FAST');
      console.log('✅ Image added to portrait PDF');
      
      const filename = `weekly-schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      console.log('✅ PDF saved:', filename);

    } catch (error) {
      setError('Failed to export PDF: ' + error.message);
      console.error('PDF export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPNG = async () => {
    if (!routineData || routineData.length === 0) {
      setError('No schedule data to export');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if html2canvas is loaded
      if (!window.html2canvas) {
        setError('html2canvas library not loaded. Please refresh the page and try again.');
        return;
      }

      // Find the schedule container
      const scheduleElement = document.querySelector('.schedule-container');
      if (!scheduleElement) {
        setError('Schedule not found on page');
        return;
      }

      // Create export wrapper
      const exportWrapper = document.createElement('div');
      exportWrapper.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 1200px;
        background: white;
        padding: 20px;
        font-family: Arial, sans-serif;
        z-index: -1000;
        box-sizing: border-box;
      `;

      // Add title
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = `
        text-align: center;
        margin-bottom: 20px;
      `;
      titleDiv.innerHTML = `
        <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #333;">Weekly Class Schedule</h1>
        <p style="margin: 0; font-size: 14px; color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
      `;

      // Clone the schedule
      const scheduleClone = scheduleElement.cloneNode(true);
      scheduleClone.style.cssText = `
        width: 100%;
        margin: 0;
        max-width: 100%;
        overflow: visible;
      `;

      exportWrapper.appendChild(titleDiv);
      exportWrapper.appendChild(scheduleClone);
      document.body.appendChild(exportWrapper);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture with html2canvas
      const canvas = await window.html2canvas(exportWrapper, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        width: 1200,
        height: exportWrapper.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      document.body.removeChild(exportWrapper);

      // Download the image
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `weekly-schedule-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      setError('Failed to export PNG: ' + error.message);
      console.error('PNG export error:', error);
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
          <div className="upload-section">
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
          </div>
        )}

        {routineData.length > 0 && (
          <div className="schedule-section">
            <div className="download-controls">
              <div className="download-buttons">
                <button 
                  className="download-btn pdf-btn" 
                  onClick={handleExportPDF}
                  disabled={loading}
                >
                  📄 Download PDF
                </button>
                <button 
                  className="download-btn png-btn" 
                  onClick={handleExportPNG}
                  disabled={loading}
                >
                  🖼️ Download PNG
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

            <RoutineTable schedule={routineData} />
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
