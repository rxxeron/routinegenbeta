import React, { useState } from 'react';
import { Analytics } from "@vercel/analytics/react";
import FileUpload from './FileUpload';
import RoutineTable from './RoutineTable';
import DownloadControls from './DownloadControls';
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
                <DownloadControls routineData={routineData} />
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
