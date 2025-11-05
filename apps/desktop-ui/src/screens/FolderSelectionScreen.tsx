import React, { useState } from 'react';
import { ErrorMessage } from '../components/common/ErrorMessage';

interface FolderSelectionScreenProps {
  onStartIndexing: (folders: string[]) => Promise<void>;
}

export const FolderSelectionScreen: React.FC<FolderSelectionScreenProps> = ({
  onStartIndexing,
}) => {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleSelectFolders = async () => {
    try {
      const result = await window.electronAPI.selectFolders();

      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedFolders((prev) => {
          // Merge with existing, avoiding duplicates
          const newFolders = result.filePaths.filter(
            (path) => !prev.includes(path)
          );
          return [...prev, ...newFolders];
        });
        setError(null);
      }
    } catch (err) {
      setError(
        `Failed to select folders: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleRemoveFolder = (folderPath: string) => {
    setSelectedFolders((prev) => prev.filter((path) => path !== folderPath));
  };

  const handleStartIndexing = async () => {
    if (selectedFolders.length === 0) {
      setError('Please select at least one folder');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      await onStartIndexing(selectedFolders);
    } catch (err) {
      setError(
        `Failed to start indexing: ${err instanceof Error ? err.message : String(err)}`
      );
      setIsStarting(false);
    }
  };

  return (
    <div className="screen folder-selection-screen">
      <div className="screen-header">
        <h1>Select Image Folders</h1>
        <p className="subtitle">
          Choose folders containing images to index for semantic search
        </p>
      </div>

      <div className="screen-content">
        <div className="action-section">
          <button
            onClick={handleSelectFolders}
            className="btn-primary btn-large"
            disabled={isStarting}
          >
            + Add Folders
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {selectedFolders.length > 0 ? (
          <div className="folder-list">
            <h2>Selected Folders ({selectedFolders.length})</h2>
            <ul className="folder-items">
              {selectedFolders.map((folder) => (
                <li key={folder} className="folder-item">
                  <span className="folder-path" title={folder}>
                    {folder}
                  </span>
                  <button
                    onClick={() => handleRemoveFolder(folder)}
                    className="btn-remove"
                    disabled={isStarting}
                    aria-label="Remove folder"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="empty-state">
            <p>No folders selected</p>
            <p className="help-text">
              Click "Add Folders" to select image directories
            </p>
          </div>
        )}

        {selectedFolders.length > 0 && (
          <div className="action-section">
            <button
              onClick={handleStartIndexing}
              className="btn-primary btn-large"
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Indexing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
