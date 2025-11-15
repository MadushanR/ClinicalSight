// API Base URL - update this based on your backend port
const API_BASE_URL = 'http://localhost:8081/api';

// Generic fetch wrapper with error handling
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error! status: ${response.status}`);
    }
    
    // Handle empty responses (e.g., 204 No Content)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Resident API endpoints
export const residentAPI = {
  // Get all residents summary with optional filter
  getAllResidents: (filter = 'all') => fetchAPI(`/residents?filter=${filter}`),
  
  // Get residents for care form (with care flags)
  getResidentsForCareForm: () => fetchAPI('/residents/care-list'),
  
  // Get resident by ID
  getResidentById: (id) => fetchAPI(`/residents/${id}`),
  
  // Create new resident
  createResident: (residentData) => 
    fetchAPI('/residents', {
      method: 'POST',
      body: JSON.stringify(residentData),
    }),
  
  // Update resident
  updateResident: (id, residentData) =>
    fetchAPI(`/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(residentData),
    }),
  
  // Delete resident
  deleteResident: (id) =>
    fetchAPI(`/residents/${id}`, {
      method: 'DELETE',
    }),
  
  // Get resident shift reports
  getResidentReports: (id) => fetchAPI(`/residents/${id}/reports`),
};

// Shift Observation API endpoints (previously careDocumentationAPI)
export const shiftObservationAPI = {
  // Get all shift observations
  getAllShiftObservations: () => fetchAPI('/shift-observations'),
  
  // Get shift observations by resident ID
  getByResident: (residentId) => fetchAPI(`/shift-observations/resident/${residentId}`),
  
  // Get shift observations by worker ID
  getByWorker: (workerId) => fetchAPI(`/shift-observations/worker/${workerId}`),
  
  // Create new shift observation
  create: (observationData) =>
    fetchAPI('/shift-observations', {
      method: 'POST',
      body: JSON.stringify(observationData),
    }),
  
  // Update shift observation
  update: (id, observationData) =>
    fetchAPI(`/shift-observations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(observationData),
    }),
  
  // Delete shift observation
  delete: (id) =>
    fetchAPI(`/shift-observations/${id}`, {
      method: 'DELETE',
    }),
};

// Backward compatibility alias
export const careDocumentationAPI = shiftObservationAPI;

// Shift Worker API endpoints
export const shiftWorkerAPI = {
  // Get shift worker profile
  getWorkerProfile: (id) => fetchAPI(`/shiftworkers/${id}`),
  
  // Update shift worker profile
  updateWorkerProfile: (id, workerData) =>
    fetchAPI(`/shiftworkers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workerData),
    }),
  
  // Submit shift report
  submitShiftReport: (workerId, reportData) =>
    fetchAPI(`/shiftworkers/${workerId}/report`, {
      method: 'POST',
      body: JSON.stringify(reportData),
    }),
  
  // Login
  login: (credentials) =>
    fetchAPI('/shiftworkers/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  // Register
  register: (workerData) =>
    fetchAPI('/shiftworkers/register', {
      method: 'POST',
      body: JSON.stringify(workerData),
    }),
};

export default {
  residentAPI,
  shiftWorkerAPI,
  shiftObservationAPI,
  careDocumentationAPI, // Backward compatibility
};
