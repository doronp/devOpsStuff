/**
 * TypeScript types matching the backend API schemas
 */

export interface SearchRequest {
  query: string;
  top_k?: number;
}

export interface SearchResult {
  path: string;
  score: number;
}

export interface IndexRequest {
  folders: string[];
}

export interface IndexingStatus {
  state: 'idle' | 'running' | 'complete' | 'error';
  total: number;
  indexed: number;
  error?: string;
}

export interface HealthResponse {
  status: string;
  model_info?: {
    model_name: string;
    pretrained: string;
    device: string;
    embedding_dim: number;
    parameters: number;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
