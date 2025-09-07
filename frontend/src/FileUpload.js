import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ onDataReceived, onError, onLoadingChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    
    if (file) {
      await handleUpload(file);
    }
  };

  const handleUpload = async (file = selectedFile) => {
    if (!file) {
      onError('Please select a file first');
      return;
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      onError('Please upload a CSV, Excel, PDF, or Image (JPG/PNG) file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      onLoadingChange(true);
      onError('');
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.length > 0) {
        onDataReceived(response.data);
      } else {
        onError('No course data found in the file. Please check the file format.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        let errorMessage = errorData.error || 'Unknown error occurred';
        
        // Add additional details if available
        if (errorData.details) {
          errorMessage += '\n\nDetails: ' + errorData.details;
        }
        
        if (errorData.fileType) {
          errorMessage += '\n\nFile type detected: ' + errorData.fileType;
        }
        
        onError(errorMessage);
      } else {
        onError('Failed to upload and process file. Please make sure the backend server is running.');
      }
    } finally {
      onLoadingChange(false);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    onDataReceived([]);
    onError('');
  };

  return (
    <div className="file-upload">
      <div className="upload-section">
        <input
          type="file"
          id="file-input"
          accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-input" className="file-input-label">
          Choose File
        </label>
        
        {selectedFile && (
          <div className="file-info">
            <p>Selected: {selectedFile.name}</p>
            <div className="file-actions">
              <button onClick={resetFile} className="reset-btn">
                Clear & Choose Another
              </button>
            </div>
          </div>
        )}
        
        {!selectedFile && (
          <p className="upload-instruction">
            Upload your Advising Slip (CSV, Excel, PDF, or Image) - it will be processed automatically
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
