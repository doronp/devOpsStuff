import React from 'react';
import type { SearchResult } from '../../types/api';

interface ResultsGridProps {
  results: SearchResult[];
  onImageClick: (imagePath: string) => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  results,
  onImageClick,
}) => {
  // Convert file paths to file:// URLs for img src
  const getImageUrl = (path: string): string => {
    // Ensure proper file:// URL format
    return `file://${path}`;
  };

  // Extract filename from path
  const getFilename = (path: string): string => {
    return path.split('/').pop() || path.split('\\').pop() || path;
  };

  return (
    <div className="results-grid">
      {results.map((result, index) => (
        <div
          key={`${result.path}-${index}`}
          className="result-card"
          onClick={() => onImageClick(result.path)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onImageClick(result.path);
            }
          }}
        >
          <div className="result-image-container">
            <img
              src={getImageUrl(result.path)}
              alt={getFilename(result.path)}
              className="result-image"
              loading="lazy"
              onError={(e) => {
                // Fallback for broken images
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23ddd"/><text x="50%" y="50%" font-size="16" text-anchor="middle" dy=".3em" fill="%23999">Image not found</text></svg>';
              }}
            />
          </div>
          <div className="result-info">
            <p className="result-filename" title={result.path}>
              {getFilename(result.path)}
            </p>
            <p className="result-score">
              Score: {(result.score * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
