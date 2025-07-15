// File: frontend/src/utils/locationCache.js
/**
 * Location Cache Utility for client-side location data management
 * Handles caching, searching, and filtering of location hierarchy
 */

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

class LocationCache {
  constructor() {
    this.cacheKey = "gram_sabha_locations";
    this.cacheTimestampKey = "gram_sabha_locations_timestamp";
    this.cacheExpiry = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    this.data = null;
    this.loading = false;
    this.listeners = new Set();
  }

  /**
   * Add listener for cache updates
   * @param {Function} callback - Callback function to call when cache updates
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   * @param {Function} callback - Callback function to remove
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners about cache updates
   */
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.data);
      } catch (error) {
        console.error("Error in cache listener:", error);
      }
    });
  }

  /**
   * Check if cached data is fresh
   * @returns {boolean} True if cache is fresh
   */
  isCacheFresh() {
    try {
      const timestamp = localStorage.getItem(this.cacheTimestampKey);
      if (!timestamp) return false;

      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < this.cacheExpiry;
    } catch (error) {
      console.error("Error checking cache freshness:", error);
      return false;
    }
  }

  /**
   * Get cached data from localStorage
   * @returns {Object|null} Cached location hierarchy or null
   */
  getCachedData() {
    try {
      const cachedData = localStorage.getItem(this.cacheKey);
      if (!cachedData) return null;

      return JSON.parse(cachedData);
    } catch (error) {
      console.error("Error reading cached data:", error);
      return null;
    }
  }

  /**
   * Save data to localStorage
   * @param {Object} data - Location hierarchy data to cache
   */
  saveCachedData(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
      localStorage.setItem(this.cacheTimestampKey, Date.now().toString());
    } catch (error) {
      console.error("Error saving cached data:", error);
      // If localStorage is full or unavailable, just continue without caching
    }
  }

  /**
   * Fetch fresh data from API
   * @returns {Promise<Object>} Location hierarchy data
   */
  async fetchFreshData() {
    try {
      const response = await fetch(`${API_URL}/locations/hierarchy`);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid API response format");
      }

      return result.data;
    } catch (error) {
      console.error("Error fetching fresh location data:", error);
      throw error;
    }
  }

  /**
   * Get location hierarchy data (from cache or API)
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Object>} Location hierarchy data
   */
  async getHierarchy(forceRefresh = false) {
    // If we already have data in memory and not forcing refresh, return it
    if (this.data && !forceRefresh) {
      return this.data;
    }

    // If already loading, wait for the current request
    if (this.loading) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!this.loading) {
            resolve(this.data);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    this.loading = true;

    try {
      // Check if we have fresh cached data (unless forcing refresh)
      if (!forceRefresh && this.isCacheFresh()) {
        const cachedData = this.getCachedData();
        if (cachedData) {
          this.data = cachedData;
          this.loading = false;
          return this.data;
        }
      }

      // Fetch fresh data from API
      const freshData = await this.fetchFreshData();
      this.data = freshData;

      // Save to cache
      this.saveCachedData(freshData);

      // Notify listeners
      this.notifyListeners();

      return this.data;
    } catch (error) {
      console.error("Error getting location hierarchy:", error);

      // Try to fall back to cached data even if stale
      const cachedData = this.getCachedData();
      if (cachedData) {
        console.warn("Using stale cached data due to API error");
        this.data = cachedData;
        return this.data;
      }

      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Search states
   * @param {string} term - Search term
   * @returns {Promise<Array>} Filtered array of states
   */
  async searchStates(term = "") {
    const hierarchy = await this.getHierarchy();
    const { states } = hierarchy;

    if (!term.trim()) {
      return [...states]; // Return copy of all states
    }

    const searchRegex = new RegExp(term, "i");
    return states.filter((state) => searchRegex.test(state));
  }

  /**
   * Search districts for a specific state
   * @param {string} state - State name
   * @param {string} term - Search term
   * @returns {Promise<Array>} Filtered array of districts
   */
  async searchDistricts(state, term = "") {
    if (!state) return [];

    const hierarchy = await this.getHierarchy();
    const districts = hierarchy.districts[state] || [];

    if (!term.trim()) {
      return [...districts]; // Return copy of all districts
    }

    const searchRegex = new RegExp(term, "i");
    return districts.filter((district) => searchRegex.test(district));
  }

  /**
   * Search blocks for a specific state and district
   * @param {string} state - State name
   * @param {string} district - District name
   * @param {string} term - Search term
   * @returns {Promise<Array>} Filtered array of blocks
   */
  async searchBlocks(state, district, term = "") {
    if (!state || !district) return [];

    const hierarchy = await this.getHierarchy();
    const key = `${state}_${district}`;
    const blocks = hierarchy.blocks[key] || [];

    if (!term.trim()) {
      return [...blocks]; // Return copy of all blocks
    }

    const searchRegex = new RegExp(term, "i");
    return blocks.filter((block) => searchRegex.test(block));
  }

  /**
   * Search panchayats for a specific state, district, and block
   * @param {string} state - State name
   * @param {string} district - District name
   * @param {string} block - Block name
   * @param {string} term - Search term
   * @returns {Promise<Array>} Filtered array of panchayats
   */
  async searchPanchayats(state, district, block, term = "") {
    if (!state || !district || !block) return [];

    const hierarchy = await this.getHierarchy();
    const key = `${state}_${district}_${block}`;
    const panchayats = hierarchy.panchayats[key] || [];

    if (!term.trim()) {
      return [...panchayats]; // Return copy of all panchayats
    }

    const searchRegex = new RegExp(term, "i");
    return panchayats.filter((panchayat) => searchRegex.test(panchayat));
  }

  /**
   * Validate if a location exists in the hierarchy
   * @param {Object} location - Location object with state, district, block, panchayat
   * @returns {Promise<boolean>} True if location exists
   */
  async validateLocation(location) {
    const { state, district, block, panchayat } = location;

    try {
      const hierarchy = await this.getHierarchy();

      // Check state exists
      if (!hierarchy.states.includes(state)) {
        return false;
      }

      // Check district exists for state
      if (district && !hierarchy.districts[state]?.includes(district)) {
        return false;
      }

      // Check block exists for state+district
      if (block && district) {
        const districtKey = `${state}_${district}`;
        if (!hierarchy.blocks[districtKey]?.includes(block)) {
          return false;
        }
      }

      // Check panchayat exists for state+district+block
      if (panchayat && district && block) {
        const blockKey = `${state}_${district}_${block}`;
        if (!hierarchy.panchayats[blockKey]?.includes(panchayat)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error validating location:", error);
      return false;
    }
  }

  /**
   * Get all available options for a specific level
   * @param {string} level - Level (state, district, block, panchayat)
   * @param {Object} context - Context for higher levels (state, district, block)
   * @returns {Promise<Array>} Array of available options
   */
  async getOptionsForLevel(level, context = {}) {
    const { state, district, block } = context;

    switch (level) {
      case "state":
        return this.searchStates();
      case "district":
        return this.searchDistricts(state);
      case "block":
        return this.searchBlocks(state, district);
      case "panchayat":
        return this.searchPanchayats(state, district, block);
      default:
        return [];
    }
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      localStorage.removeItem(this.cacheTimestampKey);
      this.data = null;
      console.log("Location cache cleared");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Get cache info for debugging
   * @returns {Object} Cache information
   */
  getCacheInfo() {
    const timestamp = localStorage.getItem(this.cacheTimestampKey);
    const size = localStorage.getItem(this.cacheKey)?.length || 0;

    return {
      hasCachedData: !!this.data,
      cacheTimestamp: timestamp ? new Date(parseInt(timestamp)) : null,
      isFresh: this.isCacheFresh(),
      cacheSize: size,
      isLoading: this.loading,
      listenersCount: this.listeners.size,
    };
  }
}

// Create and export singleton instance
const locationCache = new LocationCache();

export default locationCache;

// Also export the class for testing purposes
export { LocationCache };
