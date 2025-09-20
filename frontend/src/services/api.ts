// Legacy API service file - now redirects to new modular API structure
// This file is kept for backward compatibility

// Re-export the main API service from the new modular structure
export { apiService as default, apiService } from './api/index';