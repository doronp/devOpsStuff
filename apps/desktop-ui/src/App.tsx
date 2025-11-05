import React, { useState, useEffect } from 'react';
import { FolderSelectionScreen } from './screens/FolderSelectionScreen';
import { IndexingStatusScreen } from './screens/IndexingStatusScreen';
import { SearchScreen } from './screens/SearchScreen';
import { apiClient } from './api/client';
import type { IndexingStatus } from './types/api';

type AppState = 'folder-selection' | 'indexing' | 'search';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('folder-selection');
  const [backendAvailable, setBackendAvailable] = useState<boolean>(false);
  const [checkingBackend, setCheckingBackend] = useState<boolean>(true);

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      setCheckingBackend(true);
      const available = await apiClient.isBackendAvailable();
      setBackendAvailable(available);
      setCheckingBackend(false);

      // If backend is available, check if we should go directly to search
      if (available) {
        try {
          const status = await apiClient.getIndexingStatus();
          if (status.state === 'complete' && status.indexed > 0) {
            setAppState('search');
          } else if (status.state === 'running') {
            setAppState('indexing');
          }
        } catch (error) {
          console.error('Failed to get indexing status:', error);
        }
      }
    };

    checkBackend();
  }, []);

  // Handle starting indexing
  const handleStartIndexing = async (folders: string[]) => {
    try {
      await apiClient.startIndexing(folders);
      setAppState('indexing');
    } catch (error) {
      console.error('Failed to start indexing:', error);
      throw error;
    }
  };

  // Handle indexing complete
  const handleIndexingComplete = () => {
    setAppState('search');
  };

  // Handle restart (go back to folder selection)
  const handleRestart = () => {
    setAppState('folder-selection');
  };

  // Show loading state while checking backend
  if (checkingBackend) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Checking backend connection...</p>
        </div>
      </div>
    );
  }

  // Show error if backend is not available
  if (!backendAvailable) {
    return (
      <div className="app-container">
        <div className="error-container">
          <h2>Backend Not Available</h2>
          <p>
            Please ensure the backend server is running at{' '}
            <code>http://localhost:8000</code>
          </p>
          <p className="help-text">
            Start the backend with:{' '}
            <code>uvicorn src.main:app --reload</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate screen based on app state
  return (
    <div className="app-container">
      {appState === 'folder-selection' && (
        <FolderSelectionScreen onStartIndexing={handleStartIndexing} />
      )}
      {appState === 'indexing' && (
        <IndexingStatusScreen onComplete={handleIndexingComplete} />
      )}
      {appState === 'search' && <SearchScreen onRestart={handleRestart} />}
    </div>
  );
};

export default App;
