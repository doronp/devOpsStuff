import React, { useState } from 'react';
import { SearchBar } from '../components/search/SearchBar';
import { ResultsGrid } from '../components/search/ResultsGrid';
import { Spinner } from '../components/common/Spinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { apiClient } from '../api/client';
import type { SearchResult } from '../types/api';

interface SearchScreenProps {
  onRestart: () => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onRestart }) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchQuery: string, topK: number = 50) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setQuery(searchQuery);

    try {
      const searchResults = await apiClient.search(searchQuery, topK);
      setResults(searchResults);
      setHasSearched(true);
    } catch (err) {
      setError(
        `Search failed: ${err instanceof Error ? err.message : String(err)}`
      );
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageClick = async (imagePath: string) => {
    try {
      const result = await window.electronAPI.openImage(imagePath);
      if (!result.success && result.error) {
        setError(`Failed to open image: ${result.error}`);
      }
    } catch (err) {
      setError(
        `Failed to open image: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  return (
    <div className="screen search-screen">
      <div className="screen-header">
        <h1>Semantic Image Search</h1>
        <button onClick={onRestart} className="btn-secondary btn-small">
          Re-index Folders
        </button>
      </div>

      <div className="screen-content">
        <SearchBar onSearch={handleSearch} disabled={isSearching} />

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {isSearching && (
          <div className="loading-container">
            <Spinner />
            <p>Searching for "{query}"...</p>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="empty-state">
            <p>No results found for "{query}"</p>
            <p className="help-text">Try a different search query</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <>
            <div className="results-header">
              <p className="results-count">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </p>
            </div>
            <ResultsGrid results={results} onImageClick={handleImageClick} />
          </>
        )}

        {!hasSearched && (
          <div className="welcome-message">
            <p>Enter a search query to find images semantically</p>
            <p className="help-text">
              Examples: "sunset over mountains", "red sports car", "happy dog"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
