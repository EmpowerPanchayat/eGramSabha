// File: frontend/src/api/index.js

// Use environment variable for API URL if available, fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Helper to get admin token from localStorage
const getAdminToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.userType === 'ADMIN') {
      return localStorage.getItem('token');
    }
  } catch (e) {}
  return null;
};

// Helper to get any available token (admin, official, or citizen)
const getAnyToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (e) {}
  return null;
};

/**
 * Fetches all panchayats
 * @returns {Promise<Array>} List of panchayats
 */
export const fetchPanchayats = async () => {
  try {
    const response = await fetch(`${API_URL}/panchayats`);
    if (!response.ok) {
      throw new Error('Failed to fetch panchayats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching panchayats:', error);
    throw error;
  }
};

/**
 * Fetches a specific panchayat
 * @param {string} id - Panchayat ID
 * @returns {Promise<Object>} Panchayat data
 */
export const fetchPanchayat = async (id) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch panchayat');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching panchayat:', error);
    throw error;
  }
};

/**
 * Creates a new panchayat
 * @param {Object} panchayatData - Panchayat data
 * @returns {Promise<Object>} Created panchayat
 */
export const createPanchayat = async (panchayatData) => {
  try {
    const response = await fetch(`${API_URL}/panchayats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(panchayatData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create panchayat');
    }

    return data;
  } catch (error) {
    console.error('Error creating panchayat:', error);
    throw error;
  }
};

/**
 * Updates a panchayat
 * @param {string} id - Panchayat ID
 * @param {Object} panchayatData - Updated panchayat data
 * @returns {Promise<Object>} Updated panchayat
 */
export const updatePanchayat = async (id, panchayatData) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(panchayatData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update panchayat');
    }

    return data;
  } catch (error) {
    console.error('Error updating panchayat:', error);
    throw error;
  }
};

/**
 * Deletes a panchayat
 * @param {string} id - Panchayat ID
 * @returns {Promise<Object>} Response
 */
export const deletePanchayat = async (id) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete panchayat');
    }

    return data;
  } catch (error) {
    console.error('Error deleting panchayat:', error);
    throw error;
  }
};

/**
 * Fetches wards for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise<Array>} List of wards
 */
export const fetchWards = async (panchayatId) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/wards`);
    if (!response.ok) {
      throw new Error('Failed to fetch wards');
    }
    const data = await response.json();
    return data.wards;
  } catch (error) {
    console.error('Error fetching wards:', error);
    throw error;
  }
};

/**
 * Creates a new ward
 * @param {string} panchayatId - Panchayat ID
 * @param {Object} wardData - Ward data
 * @returns {Promise<Object>} Created ward
 */
export const createWard = async (panchayatId, wardData) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/wards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wardData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create ward');
    }

    return data.ward;
  } catch (error) {
    console.error('Error creating ward:', error);
    throw error;
  }
};

/**
 * Updates a ward
 * @param {string} panchayatId - Panchayat ID
 * @param {string} wardId - Ward ID
 * @param {Object} wardData - Updated ward data
 * @returns {Promise<Object>} Updated ward
 */
export const updateWard = async (panchayatId, wardId, wardData) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/wards/${wardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wardData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update ward');
    }

    return data.ward;
  } catch (error) {
    console.error('Error updating ward:', error);
    throw error;
  }
};

/**
 * Deletes a ward
 * @param {string} panchayatId - Panchayat ID
 * @param {string} wardId - Ward ID
 * @returns {Promise<Object>} Response
 */
export const deleteWard = async (panchayatId, wardId) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/wards/${wardId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete ward');
    }

    return data;
  } catch (error) {
    console.error('Error deleting ward:', error);
    throw error;
  }
};

/**
 * Fetches statistics for a panchayat or overall stats
 * @param {string} panchayatId - Optional panchayat ID
 * @returns {Promise<Object>} Statistics data
 */
export const fetchStats = async (panchayatId = null) => {
  try {
    const url = panchayatId
      ? `${API_URL}/stats?panchayatId=${encodeURIComponent(panchayatId)}`
      : `${API_URL}/stats`;

    const adminToken = getAdminToken();

    const response = await fetch(url, {
      headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : undefined
    });
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
};

export const fetchUsers = async (panchayatId = null) => {
  try {
    const url = panchayatId
      ? `${API_URL}/users?panchayatId=${encodeURIComponent(panchayatId)}`
      : `${API_URL}/users`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const searchUser = async (voterId, panchayatId = null) => {
  try {
    let url = `${API_URL}/users/search?voterId=${encodeURIComponent(voterId)}`;
    if (panchayatId) {
      url += `&panchayatId=${encodeURIComponent(panchayatId)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Member not found');
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching member:', error);
    throw error;
  }
};

export const importCsv = async (formData, panchayatId) => {
  try {
    // Append panchayatId to formData
    formData.append('panchayatId', panchayatId);

    const adminToken = getAdminToken();

    const response = await fetch(`${API_URL}/import-csv`, {
      method: 'POST',
      body: formData,
      headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to import CSV');
    }

    return data;
  } catch (error) {
    console.error('Error importing CSV:', error);
    throw error;
  }
};

/**
 * Fetches a user's face image
 * @param {string} voterId - The voter ID
 * @param {string} panchayatId - The panchayat ID (optional)
 * @returns {Promise<Object>} Face image data
 */
export const getFaceImage = async (voterId, panchayatId = null) => {
  try {
    let url = `${API_URL}/users/${encodeURIComponent(voterId)}/face`;

    // Add panchayatId as a query parameter if provided
    if (panchayatId) {
      url += `?panchayatId=${encodeURIComponent(panchayatId)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Face image not found');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching face image:', error);
    throw error;
  }
};

/**
 * Gets the complete URL for a face image path
 * @param {string} imagePath - The path to the face image
 * @returns {string} The complete URL
 */
export const getFaceImageUrl = (imagePath) => {
  // Remove any leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

  // Ensure we don't have duplicate 'uploads' in the path
  const pathWithoutUploads = cleanPath.startsWith('uploads/')
    ? cleanPath
    : `uploads/${cleanPath}`;

  // Construct the final URL
  return `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/${pathWithoutUploads}`;
};

/**
 * Registers a face for a user
 * @param {string} voterId - The voter ID
 * @param {Array} faceDescriptor - Face descriptor array
 * @param {string} faceImage - Base64 encoded face image
 * @param {string} panchayatId - The panchayat ID
 * @returns {Promise<Object>} Registration response
 */
export const registerFace = async (voterId, faceDescriptor, faceImage, panchayatId) => {
  try {
    // Use the users/register-face endpoint (the new correct one)
    const adminToken = getAdminToken();
    const response = await fetch(`${API_URL}/users/register-face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
      },
      body: JSON.stringify({
        voterId,
        faceDescriptor,
        faceImage,
        panchayatId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to register face');
    }

    return data;
  } catch (error) {
    console.error('Error registering face:', error);
    throw error;
  }
};

/**
 * Citizen facial login
 * @param {Array} faceDescriptor - Face descriptor array
 * @param {string} panchayatId - The panchayat ID
 * @param {string} voterIdLastFour - The last four digits of the voter ID
 * @returns {Promise<Object>} Login response with user data
 */
export const citizenFaceLogin = async (faceDescriptor, panchayatId, voterIdLastFour) => {
  try {
    const response = await fetch(`${API_URL}/citizens/face-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        faceDescriptor,
        panchayatId,
        voterIdLastFour
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Face login failed');
    }

    return data;
  } catch (error) {
    console.error('Error during face login:', error);
    throw error;
  }
};

/**
 * Get citizen profile
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User profile data
 */
export const getCitizenProfile = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/citizens/profile/${userId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error fetching profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching citizen profile:', error);
    throw error;
  }
};

/**
 * Create a new issue/suggestion
 * @param {Object} issueData - The issue/suggestion data
 * @returns {Promise<Object>} Created issue/suggestion data
 */
export const createIssue = async (issueData) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(issueData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create issue/suggestion');
    }

    return data;
  } catch (error) {
    console.error('Error creating issue/suggestion:', error);
    throw error;
  }
};

/**
 * Upload attachment for an issue/suggestion
 * @param {string} issueId - The issue/suggestion ID
 * @param {string} attachmentData - Base64 encoded attachment
 * @param {string} filename - The filename
 * @param {string} mimeType - The MIME type
 * @returns {Promise<Object>} Upload response
 */
export const uploadAttachment = async (issueId, attachmentData, filename, mimeType) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/issues/upload-attachment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        issueId,
        attachmentData,
        filename,
        mimeType
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload attachment');
    }

    return data;
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
};

/**
 * Fetch issues/suggestions for a panchayat
 * @param {string} panchayatId - The panchayat ID
 * @returns {Promise<Object>} Issues/Suggestions data
 */
export const fetchPanchayatIssues = async (panchayatId) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/issues/panchayat/${panchayatId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error fetching issues/suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching panchayat issues/suggestions:', error);
    throw error;
  }
};

/**
 * Fetch issues/suggestions for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Issues/Suggestions data
 */
export const fetchUserIssues = async (userId) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/issues/user/${userId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error fetching issues/suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user issues/suggestions:', error);
    throw error;
  }
};

/**
 * Fetches tasks for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise<Array>} List of tasks
 */
export const fetchTasks = async (panchayatId) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/tasks`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

/**
 * Fetches meetings for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise<Array>} List of meetings
 */
export const fetchMeetings = async (panchayatId) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/meetings`);
    if (!response.ok) {
      throw new Error('Failed to fetch meetings');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching meetings:', error);
    throw error;
  }
};

/**
 * Fetches submissions for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise<Array>} List of submissions
 */
export const fetchSubmissions = async (panchayatId) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/submissions`);
    if (!response.ok) {
      throw new Error('Failed to fetch submissions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
};

/**
 * Updates a user's profile
 * @param {string} voterId - The voter ID
 * @param {Object} updateData - The data to update
 * @param {string} panchayatId - The panchayat ID (optional)
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserProfile = async (voterId, updateData, panchayatId = null) => {
  try {
    let url = `${API_URL}/users/${encodeURIComponent(voterId)}`;
    if (panchayatId) {
      url += `?panchayatId=${encodeURIComponent(panchayatId)}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Get complete location hierarchy for client-side caching
 * @returns {Promise<Object>} Location hierarchy data
 */
export const fetchLocationHierarchy = async () => {
  try {
    const response = await fetch(`${API_URL}/locations/hierarchy`);
    if (!response.ok) {
      throw new Error('Failed to fetch location hierarchy');
    }
    const data = await response.json();
    return data.data; // Return just the hierarchy data
  } catch (error) {
    console.error('Error fetching location hierarchy:', error);
    throw error;
  }
};

/**
 * Get all states with optional search
 * @param {string} search - Optional search term
 * @returns {Promise<Array>} List of states
 */
export const fetchStates = async (search = '') => {
  try {
    const url = search 
      ? `${API_URL}/locations/states?search=${encodeURIComponent(search)}`
      : `${API_URL}/locations/states`;
    
    console.log('Fetching states from:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch states: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('States response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'API returned unsuccessful response');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching states:', error);
    throw error;
  }
};

/**
 * Get districts for a state with optional search
 * @param {string} state - State name
 * @param {string} search - Optional search term
 * @returns {Promise<Array>} List of districts
 */
export const fetchDistricts = async (state, search = '') => {
  try {
    if (!state) throw new Error('State is required');
    
    const url = search 
      ? `${API_URL}/locations/districts/${encodeURIComponent(state)}?search=${encodeURIComponent(search)}`
      : `${API_URL}/locations/districts/${encodeURIComponent(state)}`;
    
    console.log('Fetching districts from:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch districts: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Districts response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'API returned unsuccessful response');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching districts:', error);
    throw error;
  }
};

/**
 * Get blocks for a state and district with optional search
 * @param {string} state - State name
 * @param {string} district - District name
 * @param {string} search - Optional search term
 * @returns {Promise<Array>} List of blocks
 */
export const fetchBlocks = async (state, district, search = '') => {
  try {
    if (!state || !district) throw new Error('State and district are required');
    
    const url = search 
      ? `${API_URL}/locations/blocks/${encodeURIComponent(state)}/${encodeURIComponent(district)}?search=${encodeURIComponent(search)}`
      : `${API_URL}/locations/blocks/${encodeURIComponent(state)}/${encodeURIComponent(district)}`;
    
    console.log('Fetching blocks from:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blocks: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Blocks response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'API returned unsuccessful response');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
};

/**
 * Get panchayats for a state, district, and block with optional search
 * @param {string} state - State name
 * @param {string} district - District name
 * @param {string} block - Block name
 * @param {string} search - Optional search term
 * @returns {Promise<Array>} List of panchayats
 */
export const fetchPanchayatsByLocation = async (state, district, block, search = '') => {
  try {
    if (!state || !district || !block) throw new Error('State, district, and block are required');
    
    const url = search 
      ? `${API_URL}/locations/panchayats/${encodeURIComponent(state)}/${encodeURIComponent(district)}/${encodeURIComponent(block)}?search=${encodeURIComponent(search)}`
      : `${API_URL}/locations/panchayats/${encodeURIComponent(state)}/${encodeURIComponent(district)}/${encodeURIComponent(block)}`;
    
    console.log('Fetching panchayats from:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch panchayats: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Panchayats response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'API returned unsuccessful response');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Error fetching panchayats:', error);
    throw error;
  }
};

/**
 * Validate if a location exists
 * @param {Object} location - Location object with state, district, block, panchayat
 * @returns {Promise<boolean>} True if location exists
 */
export const validateLocation = async (location) => {
  try {
    const response = await fetch(`${API_URL}/locations/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(location)
    });

    if (!response.ok) {
      throw new Error('Failed to validate location');
    }
    
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error validating location:', error);
    throw error;
  }
};

/**
 * Get location suggestions for auto-complete
 * @param {string} term - Search term
 * @param {string} type - Type of location (state, district, block, panchayat)
 * @param {Object} context - Context for higher levels
 * @returns {Promise<Array>} List of suggestions
 */
export const getLocationSuggestions = async (term, type, context = {}) => {
  try {
    const params = new URLSearchParams({
      term,
      type,
      ...context
    });

    const response = await fetch(`${API_URL}/locations/suggest?${params}`);
    if (!response.ok) {
      throw new Error('Failed to get location suggestions');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting location suggestions:', error);
    throw error;
  }
};

/**
 * Get panchayat by LGD code
 * @param {string} lgdCode - LGD Code
 * @returns {Promise<Object>} Panchayat data
 */
export const fetchPanchayatByLgdCode = async (lgdCode) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/by-lgd/${encodeURIComponent(lgdCode)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch panchayat by LGD code');
    }
    
    const data = await response.json();
    return data.data.panchayat;
  } catch (error) {
    console.error('Error fetching panchayat by LGD code:', error);
    throw error;
  }
};

/**
 * Get panchayat by location path
 * @param {string} state - State name
 * @param {string} district - District name
 * @param {string} block - Block name
 * @param {string} panchayat - Panchayat name
 * @returns {Promise<Object>} Panchayat data
 */
export const fetchPanchayatByLocation = async (state, district, block, panchayat) => {
  try {
    const url = `${API_URL}/panchayats/by-location/${encodeURIComponent(state)}/${encodeURIComponent(district)}/${encodeURIComponent(block)}/${encodeURIComponent(panchayat)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch panchayat by location');
    }
    
    const data = await response.json();
    return data.data.panchayat;
  } catch (error) {
    console.error('Error fetching panchayat by location:', error);
    throw error;
  }
};

/**
 * Validate location path format
 * @param {Array} pathSegments - Array of path segments
 * @returns {Promise<Object>} Validation result
 */
export const validateLocationPath = async (pathSegments) => {
  try {
    const response = await fetch(`${API_URL}/panchayats/validate-location-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pathSegments })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        isValid: false,
        error: data.message,
        details: data.error
      };
    }
    
    return {
      isValid: true,
      pathSegments: data.pathSegments
    };
  } catch (error) {
    console.error('Error validating location path:', error);
    return {
      isValid: false,
      error: 'locationError',
      details: error.message
    };
  }
};

/**
 * Search panchayats for login (with filters)
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} List of matching panchayats
 */
export const searchPanchayatsForLogin = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    const response = await fetch(`${API_URL}/panchayats/search-login?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to search panchayats');
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error searching panchayats for login:', error);
    throw error;
  }
};

/**
 * Get location statistics
 * @returns {Promise<Object>} Location statistics
 */
export const fetchLocationStats = async () => {
  try {
    const response = await fetch(`${API_URL}/locations/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch location statistics');
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching location stats:', error);
    throw error;
  }
};

// Error message mapping for different error types
export const ERROR_MESSAGES = {
  invalidLgdCode: 'Invalid LGD Code. Please check the code or select manually.',
  lgdCodeNotFound: 'LGD Code not found. Please verify the code or use manual selection.',
  locationNotFound: 'Location not found. Please check the spelling or select manually.',
  missingBlockInUrl: 'Block is required in the location path. Please provide complete location.',
  incompleteLocationPath: 'Incomplete location path. Expected format: /State/District/Block/Panchayat',
  locationError: 'Error loading location. Please try again or select manually.',
  panchayatNotFound: 'Panchayat not found in the specified location.'
};

/**
 * Get user-friendly error message
 * @param {string} errorCode - Error code from API
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (errorCode) => {
  return ERROR_MESSAGES[errorCode] || errorCode || 'An unexpected error occurred';
};

// ==================== LETTERHEAD MANAGEMENT API ====================

/**
 * Upload letterhead image for a panchayat
 * @param {string} panchayatId - The panchayat ID
 * @param {FormData} formData - FormData containing file, letterheadType, and margins
 * @returns {Promise<Object>} Upload response with letterhead config
 */
export const uploadLetterhead = async (panchayatId, formData) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload letterhead');
    }

    return data;
  } catch (error) {
    console.error('Error uploading letterhead:', error);
    throw error;
  }
};

/**
 * Fetch letterhead as base64 data URL for PDF generation
 * @param {string} panchayatId - The panchayat ID
 * @returns {Promise<Object>} Letterhead data with base64, type, and margins
 */
export const fetchLetterheadBase64 = async (panchayatId) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead/base64`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      // Don't throw error for 404 (no letterhead configured)
      if (response.status === 404) {
        return null;
      }
      throw new Error(data.message || 'Failed to fetch letterhead');
    }

    return data.data; // { base64, letterheadType, margins }
  } catch (error) {
    console.error('Error fetching letterhead base64:', error);
    throw error;
  }
};

/**
 * Fetch letterhead configuration
 * @param {string} panchayatId - The panchayat ID
 * @returns {Promise<Object>} Letterhead configuration
 */
export const fetchLetterheadConfig = async (panchayatId) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead/config`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch letterhead config');
    }

    return data.data; // { letterheadConfig, hasLetterhead }
  } catch (error) {
    console.error('Error fetching letterhead config:', error);
    throw error;
  }
};

/**
 * Update letterhead configuration (margins/type) without re-uploading
 * @param {string} panchayatId - The panchayat ID
 * @param {Object} config - Configuration with letterheadType and margins
 * @returns {Promise<Object>} Updated letterhead config
 */
export const updateLetterheadConfig = async (panchayatId, config) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(config)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update letterhead config');
    }

    return data;
  } catch (error) {
    console.error('Error updating letterhead config:', error);
    throw error;
  }
};

/**
 * Delete letterhead from a panchayat
 * @param {string} panchayatId - The panchayat ID
 * @returns {Promise<Object>} Delete response
 */
export const deleteLetterhead = async (panchayatId) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete letterhead');
    }

    return data;
  } catch (error) {
    console.error('Error deleting letterhead:', error);
    throw error;
  }
};

/**
 * Fetch panchayat overview data for settings page
 * @param {string} panchayatId - The panchayat ID
 * @returns {Promise<Object>} Overview data with panchayat, officials, and stats
 */
export const fetchPanchayatOverview = async (panchayatId) => {
  try {
    const token = getAnyToken();
    const response = await fetch(`${API_URL}/panchayats/${panchayatId}/overview`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch panchayat overview');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching panchayat overview:', error);
    throw error;
  }
};
