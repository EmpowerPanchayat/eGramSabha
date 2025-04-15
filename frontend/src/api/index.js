// File: frontend/src/api/index.js

// Use environment variable for API URL if available, fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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

// Update existing functions to include panchayatId parameter
export const fetchStats = async (panchayatId = null) => {
  try {
    const url = panchayatId
      ? `${API_URL}/stats?panchayatId=${encodeURIComponent(panchayatId)}`
      : `${API_URL}/stats`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
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

    const response = await fetch(`${API_URL}/import-csv`, {
      method: 'POST',
      body: formData
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
    const response = await fetch(`${API_URL}/users/register-face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${API_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${API_URL}/issues/upload-attachment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${API_URL}/issues/panchayat/${panchayatId}`);

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
    const response = await fetch(`${API_URL}/issues/user/${userId}`);

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