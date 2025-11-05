import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="spinner" role="status" aria-label="Loading">
      <div className="spinner-circle"></div>
    </div>
  );
};
