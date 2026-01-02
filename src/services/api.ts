// API service for music analyser backend
// const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'https://music-analyser-backend.onrender.com';

// Helper function for making API requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    // Handle different error formats from backend
    if (errorData) {
      // Format 1: {detail: "error message"}
      if (typeof errorData.detail === 'string') {
        throw new Error(errorData.detail);
      }

      // Format 2: {detail: [{type: "value_error", loc: ["body", "field"], msg: "error message", ...}]}
      if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
        const firstError = errorData.detail[0];
        // Extract the field name and message
        const field = firstError.loc?.slice(-1)[0] || 'field';
        const message = firstError.msg || 'Validation error';
        throw new Error(`${field}: ${message}`);
      }

      // Format 3: Other error structures
      if (errorData.error) {
        throw new Error(errorData.error);
      }
      if (errorData.message) {
        throw new Error(errorData.message);
      }
    }

    // Fallback error message
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Authentication endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  register: (email: string, username: string, password: string) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  getCurrentUser: () =>
    apiRequest('/api/auth/me'),

  logout: () =>
    apiRequest('/api/auth/logout', {
      method: 'POST',
    }),
};

// File upload endpoints
export const uploadAPI = {
  uploadAndProcess: async (file: File, startTime?: number, endTime?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (startTime !== undefined) formData.append('start_time', startTime.toString());
    if (endTime !== undefined) formData.append('end_time', endTime.toString());

    return apiRequest('/api/upload-and-process', {
      method: 'POST',
      body: formData,
    });
  },

  getSupportedFormats: () =>
    apiRequest('/api/formats/supported'),

  cleanupExpiredFiles: () =>
    apiRequest('/api/cleanup-expired', {
      method: 'POST',
    }),
};

// Segments management endpoints
export const segmentsAPI = {
  getSegments: () =>
    apiRequest('/api/segments'),

  getSegment: (segmentId: string) =>
    apiRequest(`/api/segments/${segmentId}`),

  deleteSegment: (segmentId: string) =>
    apiRequest(`/api/segments/${segmentId}`, {
      method: 'DELETE',
    }),
};

// Audio analysis endpoint
export const analysisAPI = {
  analyzeRecording: (segmentId: string, recordingId: string) =>
    apiRequest('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ segment_id: segmentId, recording_id: recordingId }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  getAnalysisSummary: (attemptId: string) =>
    apiRequest(`/api/analysis-summary/${attemptId}`),
};

// Attempts/History endpoints
export const attemptsAPI = {
  getUserAttempts: (filters?: {
    limit?: number;
    offset?: number;
    segment_id?: number;
    min_score?: number;
    max_score?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.segment_id) params.append('segment_id', filters.segment_id.toString());
    if (filters?.min_score) params.append('min_score', filters.min_score.toString());
    if (filters?.max_score) params.append('max_score', filters.max_score.toString());

    const queryString = params.toString();
    return apiRequest(`/api/attempts${queryString ? `?${queryString}` : ''}`);
  },

  getAttemptDetails: (id: string) =>
    apiRequest(`/api/attempts/${id}`),

  deleteAttempt: (id: string) =>
    apiRequest(`/api/attempts/${id}`, {
      method: 'DELETE',
    }),

  getUserStats: () =>
    apiRequest('/api/attempts/stats/overview'),
};

// Results endpoint (using attemptsAPI for consistency)
export const resultsAPI = {
  getResults: (attemptId: string) =>
    apiRequest(`/api/attempts/${attemptId}`),
};

// Recording management endpoints
export const recordingAPI = {
  uploadRecording: async (file: File, segmentId: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('segment_id', segmentId.toString());

    return apiRequest('/api/recording/upload', {
      method: 'POST',
      body: formData,
    });
  },

  getUserRecordings: () =>
    apiRequest('/api/recording/'),

  getRecordingDetails: (recordingId: string) =>
    apiRequest(`/api/recording/${recordingId}`),
};

// System endpoints
export const systemAPI = {
  healthCheck: () =>
    apiRequest('/health'),

  getRootInfo: () =>
    apiRequest('/'),
};

// Export the base API request function for custom requests
export { apiRequest };

// Export the base URL for convenience
export { API_BASE_URL };