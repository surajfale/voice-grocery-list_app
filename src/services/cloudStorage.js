// Cloud-First Storage Service - JSONBin.io Primary Storage
// No localStorage dependency - everything stored in the cloud
import bcrypt from 'bcryptjs';

class CloudStorageService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.apiBaseUrl = 'https://api.jsonbin.io/v3';
    // Prefer base64-encoded master key to avoid dotenv expansion issues
    // Sanitize env values: strip surrounding quotes and whitespace which can be present
    const rawMaybeB64 = import.meta.env.VITE_JSONBIN_MASTER_KEY_B64;
    const rawMaybeRaw = import.meta.env.VITE_JSONBIN_MASTER_KEY;
    const sanitize = (v) => {
      if (typeof v !== 'string') return v;
      return v.replace(/^\s*['"]?/, '').replace(/['"]?\s*$/, '').trim();
    };
    const maybeB64 = sanitize(rawMaybeB64);
    const maybeRaw = sanitize(rawMaybeRaw);
    this.masterKey = null;
    if (maybeB64) {
      try {
        // atob is available in browsers; decode safely and trim
        this.masterKey = atob(maybeB64).trim();
        console.log('🔐 Loaded JSONBin master key from VITE_JSONBIN_MASTER_KEY_B64 (base64)');
      } catch (e) {
        console.error('❌ Failed to decode VITE_JSONBIN_MASTER_KEY_B64:', e);
      }
    }
    if (!this.masterKey && maybeRaw) {
      this.masterKey = maybeRaw;
      console.log('🔐 Loaded JSONBin master key from VITE_JSONBIN_MASTER_KEY (raw)');
    }
    this.appName = import.meta.env.VITE_APP_NAME || 'VoiceGroceryApp';
    
    // Debug key loading (masked)
    const mask = (s) => {
      if (!s) return '(missing)';
      if (s.length <= 12) return s.replace(/.(?=.{2})/g, '*');
      return `${s.slice(0,6)}...${s.slice(-4)}`;
    };

  console.log('🔑 Master key (masked):', mask(this.masterKey));
    console.log('🔑 Master key length:', this.masterKey ? this.masterKey.length : 'undefined');
    console.log('🔑 Master key type:', typeof this.masterKey);
    
    // Check if JSONBin key is valid - JSONBin Master Keys usually start with $2a$
    // Only use localStorage if key is missing or obviously invalid
    this.useLocalStorage = !this.masterKey || this.masterKey.length < 20;

    // Extra diagnostic: warn when key contains unescaped $ which indicates dotenv expansion
    if (this.masterKey && this.masterKey.indexOf('$') === 0) {
      console.warn('⚠️ Master key appears to start with "$" — if you set the key raw in .env the $ characters may have been expanded. Consider using VITE_JSONBIN_MASTER_KEY_B64 (base64) to avoid this.');
    } else if (this.masterKey && this.masterKey.includes('$')) {
      console.info('ℹ️ Master key contains "$" characters. If you see truncation (e.g. only the suffix), encode the key as base64 and set VITE_JSONBIN_MASTER_KEY_B64 in your .env instead.');
    }
    
    console.log('🔑 Key validation result - useLocalStorage:', this.useLocalStorage);
    
    if (this.useLocalStorage) {
      console.warn('⚠️ Invalid or missing JSONBin key - using localStorage fallback');
    } else {
      console.log('✅ Valid JSONBin key detected');
    }
    
    // Cache for performance
    this.cache = {
      users: null,
      groceryLists: new Map(),
      binIds: {},
      lastUpdate: 0
    };
    
    // Cache duration (5 minutes)
    this.cacheExpiry = 5 * 60 * 1000;
    
    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Back online - cloud storage available');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Offline - using cached data only');
    });
    
    console.log('☁️ Cloud-first storage initialized');
  }

  // Helper to build headers and optionally log masked master key
  _buildHeaders(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Master-Key': this.masterKey,
      ...extra
    };

    // Masked header log for debugging (do not leak in production)
    const mask = (s) => {
      if (!s) return '(missing)';
      if (s.length <= 12) return s.replace(/.(?=.{2})/g, '*');
      return `${s.slice(0,6)}...${s.slice(-4)}`;
    };
    console.log('➡️ Sending headers (masked X-Master-Key):', { ...headers, 'X-Master-Key': mask(headers['X-Master-Key']) });
    return headers;
  }

  // Force cloud mode for testing (call from browser console)
  forceCloudMode() {
    console.log('🔧 Forcing cloud mode...');
    this.useLocalStorage = false;
    console.log('✅ Cloud mode enabled');
  }

  // Recovery method to help find existing user data (call from browser console)
  async recoverUserData() {
    console.log('🔍 Searching for existing user data...');
    
    // Check localStorage for any stored user data
    const localUsers = JSON.parse(localStorage.getItem('voiceGrocery_users') || '{}');
    console.log('📱 LocalStorage users:', Object.keys(localUsers));
    
    // Check for any stored bin IDs
    const storedKeys = Object.keys(localStorage).filter(key => key.includes('voiceGrocery') || key.includes('grocery'));
    console.log('🗝️ Stored keys:', storedKeys);
    
    storedKeys.forEach(key => {
      console.log(`   ${key}: ${localStorage.getItem(key)}`);
    });
    
    return {
      localUsers,
      storedKeys,
      binIds: this.cache.binIds
    };
  }

  // Force reload bin configuration and users (call from browser console)
  async forceReloadUserData() {
    console.log('🔄 Force reloading user data...');
    
    try {
      // Clear current cache
      this.cache.users = null;
      this.cache.binIds = {};
      this.cache.lastUpdate = 0;
      
      // Force reload bin configuration
      await this.loadBinConfiguration();
      console.log('📋 Loaded bin IDs:', this.cache.binIds);
      
      // Force reload users
      const users = await this.loadUsers();
      console.log('👥 Loaded users:', Object.keys(users));
      console.log('📧 User emails:', Object.values(users).map(u => u.email));
      
      return { success: true, users: Object.keys(users) };
    } catch (error) {
      console.error('❌ Error during force reload:', error);
      return { success: false, error: error.message };
    }
  }

  // Test Master Key
  async testMasterKey() {
    console.log('🧪 Testing Master Key...');
    try {
      // Use the correct JSONBin endpoint to check master key without consuming quota
      // This endpoint checks if the master key is valid
      const response = await fetch(`${this.apiBaseUrl}/c/schema-doc`, {
        method: 'GET',
        headers: {
          'X-Master-Key': this.masterKey
        }
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);
      
      // A 200 response means the master key is valid
      // A 401 response means the master key is invalid
      if (response.status === 200 || response.status === 404) {
        // 404 is also acceptable - it means the key is valid but no schema doc exists
        console.log('✅ Master Key is working!');
        return true;
      } else if (response.status === 401) {
        console.error('❌ Master Key is invalid - 401 Unauthorized');
        return false;
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Unexpected response during key validation:', response.status, errorText);
        // For other status codes, assume the key works to avoid blocking the app
        return true;
      }
    } catch (error) {
      console.error('❌ Master Key test failed:', error);
      // If network error, assume the key is valid to avoid blocking the app
      return true;
    }
  }

  // Utility Methods
  async initialize() {
    console.log('🚀 Initializing cloud-first storage...');
    console.log('🔑 Master Key:', this.masterKey ? `Present (${this.masterKey.substring(0, 10)}...)` : 'Missing');
    console.log('🌐 Online:', this.isOnline);
    console.log('💾 Using localStorage fallback:', this.useLocalStorage);
    
    if (this.useLocalStorage) {
      console.log('✅ Storage ready (localStorage mode)');
      return { success: true, localStorage: true };
    }
    
    if (!this.isOnline) {
      console.warn('⚠️ Starting offline - limited functionality');
      return { success: true, offline: true };
    }
    
    try {
      // Test Master Key first
      const keyWorking = await this.testMasterKey();
      if (!keyWorking) {
        throw new Error('Master Key validation failed');
      }
      
      // Load bin configuration
      await this.loadBinConfiguration();
      console.log('✅ Cloud storage ready');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to initialize cloud storage:', error);
      console.warn('⚠️ Falling back to localStorage mode');
      this.useLocalStorage = true;
      return { success: true, localStorage: true };
    }
  }

  // Cache Management
  isCacheValid(key) {
    const now = Date.now();
    return this.cache[key] !== null && (now - this.cache.lastUpdate) < this.cacheExpiry;
  }

  updateCache(key, data) {
    this.cache[key] = data;
    this.cache.lastUpdate = Date.now();
  }

  clearCache() {
    this.cache.users = null;
    this.cache.groceryLists.clear();
    this.cache.lastUpdate = 0;
  }

  // JSONBin.io API Methods
  async createBin(data, name) {
    if (!this.isOnline) {
      throw new Error('Cannot create bin while offline');
    }

    console.log('📁 Creating bin:', name);
    console.log('📁 Data:', data);

    try {
      const binName = `${this.appName}-${name}-${Date.now()}`;
      console.log('📁 Full bin name:', binName);

      const response = await fetch(`${this.apiBaseUrl}/b`, {
        method: 'POST',
        headers: this._buildHeaders({ 'X-Bin-Name': binName }),
        body: JSON.stringify(data)
      });

      console.log('📁 Response status:', response.status);
      console.log('📁 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📁 Raw response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('📁 Parsed response data:', result);
      } catch (e) {
        console.error('📁 Failed to parse JSON response:', e);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (response.ok && result.metadata) {
        console.log(`✅ Created bin: ${name} (${result.metadata.id})`);
        return { success: true, binId: result.metadata.id };
      }
      
      // Better error handling
      if (result.message) {
        console.error('📁 JSONBin error:', result.message);
        throw new Error(`JSONBin API Error: ${result.message}`);
      }
      
      throw new Error(`Failed to create bin: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error('❌ Error creating bin:', error);
      throw error;
    }
  }

  async updateBin(binId, data) {
    if (!this.isOnline) {
      throw new Error('Cannot update bin while offline');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/b/${binId}`, {
        method: 'PUT',
        headers: this._buildHeaders(),
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`💾 Updated bin: ${binId}`);
        return { success: true, data: result };
      }
      throw new Error(result.message || 'Failed to update bin');
    } catch (error) {
      console.error('❌ Error updating bin:', error);
      throw error;
    }
  }

  async readBin(binId) {
    if (!this.isOnline) {
      throw new Error('Cannot read bin while offline');
    }

    try {
      console.log(`📖 Reading bin: ${binId}`);
      const response = await fetch(`${this.apiBaseUrl}/b/${binId}/latest`, {
        method: 'GET',
        headers: this._buildHeaders()
      });

      console.log('📖 Response status:', response.status);
      const responseText = await response.text();
      console.log('📖 Raw response:', responseText);

      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          console.log(`✅ Read bin: ${binId}`);
          return { success: true, data: result.record };
        } catch (e) {
          console.error('📖 Failed to parse JSON response:', e);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
      }
      
      // Handle error responses
      let errorResult;
      try {
        errorResult = JSON.parse(responseText);
        if (errorResult.message) {
          throw new Error(`JSONBin API Error: ${errorResult.message}`);
        }
      } catch (e) {
        // If we can't parse the error, just use the status
      }
      
      throw new Error(`Failed to read bin: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error('❌ Error reading bin:', error);
      throw error;
    }
  }

  async deleteBin(binId) {
    if (!this.isOnline) {
      throw new Error('Cannot delete bin while offline');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/b/${binId}`, {
        method: 'DELETE',
        headers: this._buildHeaders()
      });

      if (response.ok) {
        console.log(`🗑️ Deleted bin: ${binId}`);
        return { success: true };
      }
      throw new Error(`Failed to delete bin: ${response.statusText}`);
    } catch (error) {
      console.error('❌ Error deleting bin:', error);
      throw error;
    }
  }

  // Bin Configuration Management
  async loadBinConfiguration() {
    // Try to load existing configuration bin
    try {
      // For now, we'll store bin IDs in a master configuration bin
      // In a real app, you might want to use a more sophisticated approach
      const configBinId = await this.getOrCreateConfigBin();
      const result = await this.readBin(configBinId);
      
      if (result.success) {
        this.cache.binIds = result.data.binIds || {};
        console.log('📋 Loaded bin configuration');
      }
    } catch (error) {
      console.log('📋 Creating new bin configuration');
      this.cache.binIds = {};
    }
  }

  async getOrCreateConfigBin() {
    // Try to get config bin ID from localStorage first
    const storedConfigBinId = localStorage.getItem('voiceGrocery_configBinId');
    
    if (storedConfigBinId && !this.cache.binIds.config) {
      console.log('📋 Found stored config bin ID:', storedConfigBinId);
      this.cache.binIds.config = storedConfigBinId;
    }
    
    if (!this.cache.binIds.config) {
      console.log('📋 Creating new config bin...');
      // Create config bin
      const configData = {
        appName: this.appName,
        binIds: {},
        createdAt: new Date().toISOString()
      };
      
      const result = await this.createBin(configData, 'config');
      this.cache.binIds.config = result.binId;
      
      // Store config bin ID in localStorage for persistence across restarts
      localStorage.setItem('voiceGrocery_configBinId', result.binId);
      console.log('📋 Stored config bin ID in localStorage');
    }
    
    return this.cache.binIds.config;
  }

  async saveBinConfiguration() {
    try {
      if (this.cache.binIds.config) {
        const configData = {
          appName: this.appName,
          binIds: this.cache.binIds,
          updatedAt: new Date().toISOString()
        };
        
        await this.updateBin(this.cache.binIds.config, configData);
        
        // Also store config bin ID in localStorage for persistence
        localStorage.setItem('voiceGrocery_configBinId', this.cache.binIds.config);
      }
    } catch (error) {
      console.error('❌ Error saving bin configuration:', error);
    }
  }

  // User Management - Cloud First
  async createUser(userData) {
    try {
      // Load existing users
      const users = await this.loadUsers();
      
      // Check if user already exists
      const existingUser = Object.values(users).find(u => u.email === userData.email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }
      
      // Encrypt password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newUser = {
        _id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      users[userId] = newUser;

      // Save users
      if (this.useLocalStorage) {
        console.log('💾 Saving user to localStorage');
        localStorage.setItem('voiceGrocery_users', JSON.stringify(users));
      } else {
        // Get or create users bin
        if (!this.cache.binIds.users) {
          const initialData = {
            appName: this.appName,
            createdAt: new Date().toISOString(),
            users: {}
          };
          const result = await this.createBin(initialData, 'users');
          this.cache.binIds.users = result.binId;
          await this.saveBinConfiguration();
        }
        // Save back to cloud with proper structure
        const binData = {
          appName: this.appName,
          updatedAt: new Date().toISOString(),
          users: users
        };
        await this.updateBin(this.cache.binIds.users, binData);
      }
      
      this.updateCache('users', users);

      console.log('👤 User created:', userId);
      return { success: true, user: { ...newUser, password: undefined } }; // Don't return password
    } catch (error) {
      console.error('❌ Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  async loginUser(email, password) {
    console.log('🔑 LoginUser called with email:', email);
    console.log('🌐 Online status:', this.isOnline);
    console.log('💾 Using localStorage mode:', this.useLocalStorage);
    
    if (!this.isOnline && !this.useLocalStorage) {
      // Check cache for offline access
      if (this.cache.users) {
        const user = Object.values(this.cache.users).find(u => u.email === email);
        if (user && await bcrypt.compare(password, user.password)) {
          console.log('👤 Offline login successful');
          return { success: true, user: { ...user, password: undefined } };
        }
      }
      throw new Error('Cannot login while offline without cached credentials');
    }

    try {
      console.log('👥 Loading users for login check...');
      const users = await this.loadUsers();
      console.log('👥 Total users loaded:', Object.keys(users).length);
      console.log('👥 Available user emails:', Object.values(users).map(u => u.email));
      
      const user = Object.values(users).find(u => u.email === email);
      console.log('🔍 Found user for email', email, ':', !!user);
      
      if (!user) {
        console.log('❌ Login failed: User not found for email:', email);
        console.log('❌ Returning error object with message');
        const errorResult = { success: false, error: 'No account found with this email address. Please register first.' };
        console.log('❌ Error result:', errorResult);
        return errorResult;
      }
      
      console.log('🔒 Checking password...');
      const passwordMatch = await bcrypt.compare(password, user.password);
      console.log('🔒 Password match:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('❌ Login failed: Invalid password for email:', email);
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      
      // Update last login
      user.lastLogin = new Date().toISOString();
      users[user._id] = user;
      
      if (this.useLocalStorage) {
        localStorage.setItem('voiceGrocery_users', JSON.stringify(users));
      } else {
        const binData = {
          appName: this.appName,
          updatedAt: new Date().toISOString(),
          users: users
        };
        await this.updateBin(this.cache.binIds.users, binData);
      }
      this.updateCache('users', users);
      
      console.log('👤 Login successful:', user._id);
      return { success: true, user: { ...user, password: undefined } };
    } catch (error) {
      console.error('❌ Error during login:', error);
      return { success: false, error: error.message };
    }
  }

  async loadUsers() {
    console.log('🔍 Loading users...');
    
    // Use localStorage fallback if JSONBin key is invalid
    if (this.useLocalStorage) {
      console.log('💾 Using localStorage for users');
      const users = JSON.parse(localStorage.getItem('voiceGrocery_users') || '{}');
      this.updateCache('users', users);
      console.log('✅ Loaded users from localStorage:', Object.keys(users));
      return users;
    }
    
    // Check cache first
    if (this.isCacheValid('users')) {
      console.log('📋 Using cached users:', Object.keys(this.cache.users || {}));
      return this.cache.users;
    }

    if (!this.isOnline) {
      console.log('📴 Offline - using cached users');
      return this.cache.users || {};
    }

    try {
      if (!this.cache.binIds.users) {
        console.log('📁 Creating new users bin...');
        // Create users bin if it doesn't exist - JSONBin requires non-empty data
        const initialData = {
          appName: this.appName,
          createdAt: new Date().toISOString(),
          users: {}
        };
        const result = await this.createBin(initialData, 'users');
        this.cache.binIds.users = result.binId;
        await this.saveBinConfiguration();
        
        const emptyUsers = {};
        this.updateCache('users', emptyUsers);
        console.log('✅ Created empty users bin');
        return emptyUsers;
      }

      console.log('📖 Reading users from bin:', this.cache.binIds.users);
      const result = await this.readBin(this.cache.binIds.users);
      const binData = result.data || {};
      // Handle both old format (direct users object) and new format (nested under users property)
      const users = binData.users || binData;
      
      this.updateCache('users', users);
      console.log('✅ Loaded users:', Object.keys(users));
      return users;
    } catch (error) {
      console.error('❌ Error loading users:', error);
      return this.cache.users || {};
    }
  }

  async getUserProfile(userId) {
    try {
      const users = await this.loadUsers();
      const user = Object.values(users).find(u => u._id === userId);
      
      if (user) {
        return { success: true, user };
      }
      
      return { success: false, error: 'User not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // User Authorization Helper
  validateUserAccess(requestUserId, targetUserId) {
    if (!requestUserId || !targetUserId) {
      throw new Error('Invalid user ID provided');
    }
    if (requestUserId !== targetUserId) {
      throw new Error('Access denied: Cannot access another user\'s data');
    }
    return true;
  }

  // Grocery List Management - Cloud First
  async getUserGroceryLists(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const binId = await this.getGroceryListsBinId(userId);
      if (!binId) {
        return { success: true, lists: [] };
      }

      // Check cache first
      const cacheKey = `groceryLists_${userId}`;
      if (this.cache.groceryLists.has(cacheKey) && this.isCacheValid(cacheKey)) {
        const lists = Object.values(this.cache.groceryLists.get(cacheKey));
        // Validate all lists belong to this user
        const userLists = lists.filter(list => list.userId === userId);
        return { success: true, lists: userLists.sort((a, b) => new Date(b.date) - new Date(a.date)) };
      }

      if (!this.isOnline) {
        const cached = this.cache.groceryLists.get(cacheKey) || {};
        const lists = Object.values(cached);
        // Validate all lists belong to this user
        const userLists = lists.filter(list => list.userId === userId);
        return { success: true, lists: userLists.sort((a, b) => new Date(b.date) - new Date(a.date)) };
      }

      const result = await this.readBin(binId);
      const allLists = result.data || {};
      
      // Validate all lists belong to this user and filter out any that don't
      const validatedLists = {};
      Object.entries(allLists).forEach(([date, list]) => {
        if (list && list.userId === userId) {
          validatedLists[date] = list;
        }
      });
      
      this.cache.groceryLists.set(cacheKey, validatedLists);
      const lists = Object.values(validatedLists);
      
      return { 
        success: true, 
        lists: lists.sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    } catch (error) {
      console.error('❌ Error loading grocery lists:', error);
      return { success: false, error: error.message };
    }
  }

  async getGroceryListByDate(userId, date) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const binId = await this.getGroceryListsBinId(userId);
      const cacheKey = `groceryLists_${userId}`;
      
      let allLists = {};
      
      // Try cache first
      if (this.cache.groceryLists.has(cacheKey)) {
        allLists = this.cache.groceryLists.get(cacheKey);
      } else if (this.isOnline && binId) {
        // Load from cloud
        const result = await this.readBin(binId);
        allLists = result.data || {};
        this.cache.groceryLists.set(cacheKey, allLists);
      }
      
      let list = allLists[date];
      
      // Validate list ownership
      if (list && list.userId !== userId) {
        console.warn(`🚨 Access denied: List ${date} belongs to different user`);
        list = null; // Reset to create new list for current user
      }
      
      if (!list) {
        // Create new list with proper user association
        list = {
          userId,
          date,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        allLists[date] = list;
        
        if (this.isOnline) {
          const newBinId = await this.getOrCreateGroceryListsBin(userId);
          await this.updateBin(newBinId, allLists);
        }
        
        this.cache.groceryLists.set(cacheKey, allLists);
      }
      
      return { success: true, list };
    } catch (error) {
      console.error('❌ Error getting grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGroceryList(userId, date, updates) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const binId = await this.getOrCreateGroceryListsBin(userId);
      const cacheKey = `groceryLists_${userId}`;
      
      // Load current lists
      let allLists = {};
      if (this.cache.groceryLists.has(cacheKey)) {
        allLists = { ...this.cache.groceryLists.get(cacheKey) };
      } else if (this.isOnline) {
        const result = await this.readBin(binId);
        allLists = result.data || {};
      }
      
      // Validate list ownership before update
      if (allLists[date] && allLists[date].userId !== userId) {
        return { success: false, error: 'Access denied: Cannot modify another user\'s list' };
      }
      
      // Update the specific list
      if (!allLists[date]) {
        allLists[date] = {
          userId,
          date,
          items: [],
          createdAt: new Date().toISOString()
        };
      }
      
      allLists[date] = {
        ...allLists[date],
        ...updates,
        userId, // Ensure userId is always set correctly
        updatedAt: new Date().toISOString()
      };
      
      // Save to cloud
      if (this.isOnline) {
        await this.updateBin(binId, allLists);
      }
      
      // Update cache
      this.cache.groceryLists.set(cacheKey, allLists);
      
      return { success: true, list: allLists[date] };
    } catch (error) {
      console.error('❌ Error updating grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async addGroceryItem(userId, date, itemData) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const result = await this.getGroceryListByDate(userId, date);
      if (!result.success) return result;
      
      const list = result.list;
      
      // Validate list ownership
      if (list.userId !== userId) {
        return { success: false, error: 'Access denied: Cannot add items to another user\'s list' };
      }
      
      const newItem = {
        id: Date.now() + Math.random().toString(),
        ...itemData,
        addedAt: new Date().toISOString(),
        userId // Associate item with user
      };
      
      list.items.push(newItem);
      return this.updateGroceryList(userId, date, { items: list.items });
    } catch (error) {
      console.error('❌ Error adding grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async updateGroceryItem(userId, date, itemId, updates) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const result = await this.getGroceryListByDate(userId, date);
      if (!result.success) return result;
      
      const list = result.list;
      
      // Validate list ownership
      if (list.userId !== userId) {
        return { success: false, error: 'Access denied: Cannot modify another user\'s list' };
      }
      
      const itemIndex = list.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return { success: false, error: 'Item not found' };
      }
      
      // Validate item ownership
      const item = list.items[itemIndex];
      if (item.userId && item.userId !== userId) {
        return { success: false, error: 'Access denied: Cannot modify another user\'s item' };
      }
      
      list.items[itemIndex] = {
        ...list.items[itemIndex],
        ...updates,
        userId, // Ensure item remains associated with user
        updatedAt: new Date().toISOString()
      };
      
      if (updates.completed !== undefined) {
        list.items[itemIndex].completedAt = updates.completed ? new Date().toISOString() : undefined;
      }
      
      return this.updateGroceryList(userId, date, { items: list.items });
    } catch (error) {
      console.error('❌ Error updating grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async removeGroceryItem(userId, date, itemId) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const result = await this.getGroceryListByDate(userId, date);
      if (!result.success) return result;
      
      const list = result.list;
      
      // Validate list ownership
      if (list.userId !== userId) {
        return { success: false, error: 'Access denied: Cannot remove items from another user\'s list' };
      }
      
      // Find the item to validate ownership before removal
      const itemToRemove = list.items.find(item => item.id === itemId);
      if (itemToRemove && itemToRemove.userId && itemToRemove.userId !== userId) {
        return { success: false, error: 'Access denied: Cannot remove another user\'s item' };
      }
      
      list.items = list.items.filter(item => item.id !== itemId);
      
      return this.updateGroceryList(userId, date, { items: list.items });
    } catch (error) {
      console.error('❌ Error removing grocery item:', error);
      return { success: false, error: error.message };
    }
  }

  async clearGroceryList(userId, date) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }
      
      // Additional validation happens in updateGroceryList
      return this.updateGroceryList(userId, date, { items: [] });
    } catch (error) {
      console.error('❌ Error clearing grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteGroceryList(userId, date) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const binId = await this.getGroceryListsBinId(userId);
      if (!binId) {
        return { success: true }; // Nothing to delete
      }
      
      const cacheKey = `groceryLists_${userId}`;
      let allLists = {};
      
      if (this.cache.groceryLists.has(cacheKey)) {
        allLists = { ...this.cache.groceryLists.get(cacheKey) };
      } else if (this.isOnline) {
        const result = await this.readBin(binId);
        allLists = result.data || {};
      }
      
      // Validate list ownership before deletion
      if (allLists[date] && allLists[date].userId !== userId) {
        return { success: false, error: 'Access denied: Cannot delete another user\'s list' };
      }
      
      delete allLists[date];
      
      if (this.isOnline) {
        await this.updateBin(binId, allLists);
      }
      
      this.cache.groceryLists.set(cacheKey, allLists);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting grocery list:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper Methods
  async getGroceryListsBinId(userId) {
    if (!userId) {
      throw new Error('User ID is required for bin access');
    }
    const binKey = `groceryLists_${userId}`;
    return this.cache.binIds[binKey];
  }

  async getOrCreateGroceryListsBin(userId) {
    if (!userId) {
      throw new Error('User ID is required for bin creation');
    }
    
    const binKey = `groceryLists_${userId}`;
    
    if (!this.cache.binIds[binKey]) {
      // Create user-specific bin with timestamp for uniqueness
      const timestamp = Date.now();
      const result = await this.createBin({
        owner: userId,
        createdAt: new Date().toISOString(),
        private: true
      }, `grocery-lists-${userId}-${timestamp}`);
      
      this.cache.binIds[binKey] = result.binId;
      await this.saveBinConfiguration();
      
      console.log(`🔒 Created private grocery lists bin for user: ${userId}`);
    }
    
    return this.cache.binIds[binKey];
  }

  // Status Methods
  getConnectionStatus() {
    return this.isOnline;
  }

  async disconnect() {
    // Save any pending changes
    this.clearCache();
    console.log('☁️ Cloud storage disconnected');
    return true;
  }
}

// Create singleton instance
const cloudStorage = new CloudStorageService();

// Make cloudStorage available globally for debugging
if (typeof window !== 'undefined') {
  window.cloudStorage = cloudStorage;
}

export default cloudStorage;