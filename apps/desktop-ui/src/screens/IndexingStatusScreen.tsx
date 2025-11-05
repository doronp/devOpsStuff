import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ProgressBar } from '../components/common/ProgressBar';
import { Spinner } from '../components/common/Spinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import type { IndexingStatus } from '../types/api';

interface IndexingStatusScreenProps {
  onComplete: () => void;
}

const POLL_INTERVAL = 1000; // Poll every 1 second

export const IndexingStatusScreen: React.FC<IndexingStatusScreenProps> = ({
  onComplete,
}) => {
  const [status, setStatus] = useState<IndexingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        const newStatus = await apiClient.getIndexingStatus();

        if (!mounted) return;

        setStatus(newStatus);
        setError(null);

        // Handle completion
        if (newStatus.state === 'complete') {
          if (intervalId) {
            clearInterval(intervalId);
          }
          // Wait a bit before transitioning to show 100%
          setTimeout(() => {
            if (mounted) {
              onComplete();
            }
          }, 1500);
        }

        // Handle error
        if (newStatus.state === 'error') {
          if (intervalId) {
            clearInterval(intervalId);
          }
          setError(newStatus.error || 'Indexing failed');
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          `Failed to get indexing status: ${err instanceof Error ? err.message : String(err)}`
        );

        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    // Initial poll
    pollStatus();

    // Set up polling interval
    intervalId = setInterval(pollStatus, POLL_INTERVAL);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [onComplete]);

  if (!status) {
    return (
      <div className="screen indexing-status-screen">
        <div className="loading-container">
          <Spinner />
          <p>Loading indexing status...</p>
        </div>
      </div>
    );
  }

  const progress = status.total > 0 ? (status.indexed / status.total) * 100 : 0;

  return (
    <div className="screen indexing-status-screen">
      <div className="screen-header">
        <h1>Indexing Images</h1>
        <p className="subtitle">
          Creating embeddings for semantic search
        </p>
      </div>

      <div className="screen-content">
        {error && <ErrorMessage message={error} />}

        <div className="indexing-progress">
          <ProgressBar progress={progress} />

          <div className="status-details">
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className={`status-value status-${status.state}`}>
                {status.state}
              </span>
            </div>

            <div className="status-item">
              <span className="status-label">Progress:</span>
              <span className="status-value">
                {status.indexed.toLocaleString()} / {status.total.toLocaleString()} images
              </span>
            </div>

            {status.total > 0 && (
              <div className="status-item">
                <span className="status-label">Completion:</span>
                <span className="status-value">{progress.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {status.state === 'running' && (
            <div className="indexing-animation">
              <Spinner />
              <p className="help-text">
                This may take several minutes depending on the number of images
              </p>
            </div>
          )}

          {status.state === 'complete' && (
            <div className="success-message">
              <p>✓ Indexing complete! Transitioning to search...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
