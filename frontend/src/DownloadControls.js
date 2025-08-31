import React, { useState } from 'react';

const DownloadControls = ({ routineData }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (format) => {
    if (!routineData || routineData.length === 0) {
      setError('No schedule data available for download');
      return;
    }

    setDownloading(true);
    setError('');

    try {
      const response = await fetch(`/api/download?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routineData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to download ${format.toUpperCase()}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download URL and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `routine.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(`Error downloading ${format}:`, error);
      setError(`Failed to download ${format.toUpperCase()}: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const isDisabled = !routineData || routineData.length === 0 || downloading;

  return (
    <div className="download-controls">
      <div className="download-buttons">
        <button
          onClick={() => handleDownload('pdf')}
          disabled={isDisabled}
          className="download-btn pdf-btn"
        >
          {downloading ? 'Generating...' : 'Download as PDF'}
        </button>
        
        <button
          onClick={() => handleDownload('png')}
          disabled={isDisabled}
          className="download-btn png-btn"
        >
          {downloading ? 'Generating...' : 'Download as PNG'}
        </button>
      </div>
      
      {error && <div className="download-error">{error}</div>}
      
      {isDisabled && routineData && routineData.length === 0 && (
        <p className="download-hint">Upload a schedule file to enable downloads</p>
      )}
    </div>
  );
};

export default DownloadControls;
