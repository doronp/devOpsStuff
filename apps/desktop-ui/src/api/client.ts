/**
 * Backend API client for communicating with the FastAPI backend
 */

import type {
  SearchRequest,
  SearchResult,
  IndexRequest,
  IndexingStatus,
  HealthResponse,
  ApiError,
} from '../types/api';

const BASE_URL = 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchJSON<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      const error = new Error(errorMessage) as ApiError;
      error.statusCode = response.status;
      error.name = 'ApiError';
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      throw error;
    }

    // Network error or JSON parse error
    const apiError = new Error(
      `Failed to connect to backend: ${error instanceof Error ? error.message : String(error)}`
    ) as ApiError;
    apiError.name = 'ApiError';
    throw apiError;
  }
}

/**
 * API client methods
 */

export const apiClient = {
  /**
   * Health check
   */
  async health(): Promise<HealthResponse> {
    return fetchJSON<HealthResponse>('/health');
  },

  /**
   * Search for images by text query
   */
  async search(query: string, topK: number = 50): Promise<SearchResult[]> {
    const request: SearchRequest = {
      query,
      top_k: topK,
    };

    return fetchJSON<SearchResult[]>('/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Start indexing folders
   */
  async startIndexing(folders: string[]): Promise<{ message: string }> {
    const request: IndexRequest = { folders };

    return fetchJSON<{ message: string }>('/index/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get current indexing status
   */
  async getIndexingStatus(): Promise<IndexingStatus> {
    return fetchJSON<IndexingStatus>('/index/status');
  },

  /**
   * Check if backend is reachable
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.health();
      return true;
    } catch {
      return false;
    }
  },
};
