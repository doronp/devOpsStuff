import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string, topK: number) => void;
  disabled?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSearch(query.trim(), topK);
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for images... (e.g., sunset, red car, happy dog)"
          className="search-input"
          disabled={disabled}
          aria-label="Search query"
        />
        <button
          type="submit"
          className="btn-primary search-button"
          disabled={disabled || !query.trim()}
        >
          Search
        </button>
      </div>

      <div className="search-options">
        <label htmlFor="top-k-input" className="search-label">
          Max results:
        </label>
        <input
          id="top-k-input"
          type="number"
          value={topK}
          onChange={(e) => setTopK(Math.max(1, parseInt(e.target.value) || 50))}
          min="1"
          max="500"
          className="top-k-input"
          disabled={disabled}
        />
      </div>
    </form>
  );
};
