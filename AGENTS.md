# Service Agents Documentation

This document provides comprehensive documentation for all service agents (services) in the Voice Grocery List App. These agents handle different aspects of the application's functionality and work together through the Service Manager pattern.

## Table of Contents

- [Overview](#overview)
- [Service Architecture](#service-architecture)
- [Service Manager](#service-manager)
- [Individual Agents](#individual-agents)
  - [API Service](#api-service)
  - [Auth Service](#auth-service)
  - [Grocery List Service](#grocery-list-service)
  - [Grocery Intelligence Service](#grocery-intelligence-service)
- [Base Service](#base-service)
- [Agent Communication](#agent-communication)
- [Error Handling](#error-handling)
- [Health Monitoring](#health-monitoring)

## Overview

The application uses a **Service-Oriented Architecture (SOA)** where different agents (services) handle specific domains of functionality. All services extend a common `BaseService` class that provides shared functionality like error handling, retry logic, and network status monitoring.

### Key Principles

1. **Single Responsibility** - Each agent handles one specific domain
2. **Dependency Injection** - Services receive dependencies through constructors
3. **Centralized Orchestration** - ServiceManager coordinates all agents
4. **Consistent Interface** - All agents follow the same patterns via BaseService
5. **Offline Support** - Agents handle network failures gracefully

## Service Architecture

```
ServiceManager (Orchestrator)
├── ApiService (HTTP Communication)
├── AuthService (Authentication)
├── GroceryListService (List Management)
└── GroceryIntelligenceService (NLP & Categorization)
```

All services extend `BaseService` which provides:
- Error handling and logging
- Retry logic with exponential backoff
- Network status monitoring
- Standardized response format

## Service Manager

**Location**: `src/services/ServiceManager.js`

The Service Manager is the central orchestrator that initializes, manages, and coordinates all service agents.

### Responsibilities

- Initialize all service agents
- Provide centralized access to services
- Monitor service health status
- Handle service lifecycle (restart, clear caches)
- Aggregate service statistics

### Key Methods

```javascript
// Get a specific service
serviceManager.getService('auth')

// Get all service statuses
serviceManager.getServiceStatus()

// Health check all services
await serviceManager.healthCheck()

// Initialize all services
await serviceManager.initialize()

// Restart a service
await serviceManager.restartService('api')

// Clear all caches
serviceManager.clearAllCaches()
```

### Service Registry

Services are accessible via:
- `serviceManager.apiService` - API communication
- `serviceManager.authService` - Authentication
- `serviceManager.groceryListService` - List operations
- `serviceManager.groceryIntelligenceService` - Intelligence features

Or via the registry:
```javascript
serviceManager.services.api
serviceManager.services.auth
serviceManager.services.groceryList
serviceManager.services.intelligence
```

## Individual Agents

### API Service

**Location**: `src/services/ApiService.js`  
**Extends**: `BaseService`  
**Purpose**: Handles all HTTP communication with the backend API

#### Responsibilities

- Make HTTP requests to backend endpoints
- Handle request/response transformation
- Manage authentication headers
- Implement request timeouts
- Handle network errors and retries

#### Key Methods

```javascript
// Make HTTP request
await apiService.makeRequest('/grocery-lists', {
  method: 'POST',
  body: JSON.stringify(data)
})

// Test API connectivity
await apiService.testConnectivity()

// Health check
await apiService.healthCheck()
```

#### Features

- **Automatic Token Injection**: Adds authentication tokens from localStorage
- **Request Timeout**: 30-second timeout for all requests
- **Error Handling**: Transforms HTTP errors into standardized format
- **Retry Logic**: Automatic retry on network failures (via BaseService)

#### Configuration

- Base URL: `VITE_API_BASE_URL` environment variable (default: `http://localhost:3001/api`)
- Timeout: 30 seconds
- Default headers: `Content-Type: application/json`

### Auth Service

**Location**: `src/services/AuthService.js`  
**Extends**: `BaseService`  
**Dependencies**: `ApiService`  
**Purpose**: Handles user authentication and profile management

#### Responsibilities

- User registration
- User login/logout
- Token management (localStorage)
- User profile operations
- Password reset functionality
- Session validation

#### Key Methods

```javascript
// Register new user
await authService.register({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'securePassword'
})

// Login user
await authService.login('john@example.com', 'password')

// Logout user
authService.logout()

// Get current user
const user = authService.getCurrentUser()

// Check if user is authenticated
const isAuth = authService.isAuthenticated()

// Validate session
await authService.validateSession()
```

#### Token Management

- Stores token in localStorage under key: `groceryListToken`
- Stores user data in localStorage under key: `groceryListUser`
- Automatically includes token in API requests via ApiService

#### Features

- **Automatic Token Refresh**: Validates session on each request
- **Secure Storage**: Uses localStorage for token persistence
- **Error Handling**: Handles authentication errors gracefully
- **Offline Support**: Can check authentication status offline

### Grocery List Service

**Location**: `src/services/GroceryListService.js`  
**Extends**: `BaseService`  
**Dependencies**: `ApiService`  
**Purpose**: Manages all grocery list CRUD operations

#### Responsibilities

- Create, read, update, delete grocery lists
- Manage list items (add, remove, toggle completion)
- Cache management for offline support
- Date-based list retrieval
- List synchronization

#### Key Methods

```javascript
// Get all lists for user
await groceryListService.getUserGroceryLists(userId)

// Get list for specific date
await groceryListService.getGroceryListByDate(userId, '2024-01-15')

// Create new list
await groceryListService.createGroceryList(userId, date, items)

// Update list
await groceryListService.updateGroceryList(listId, updates)

// Delete list
await groceryListService.deleteGroceryList(listId)

// Add item to list
await groceryListService.addItemToList(listId, item)

// Update item
await groceryListService.updateItem(listId, itemId, updates)

// Toggle item completion
await groceryListService.toggleItemCompletion(listId, itemId)

// Remove item from list
await groceryListService.removeItemFromList(listId, itemId)
```

#### Caching Strategy

- **Cache Duration**: 5 minutes
- **Cache Keys**: `lists_${userId}`, `list_${listId}`
- **Cache Invalidation**: Automatic on updates/deletes
- **Offline Support**: Serves cached data when offline

#### Features

- **Optimistic Updates**: Updates UI immediately, syncs in background
- **Conflict Resolution**: Handles concurrent edits
- **Batch Operations**: Supports bulk item operations
- **Date-based Queries**: Efficient date-based list retrieval

### Grocery Intelligence Service

**Location**: `src/services/groceryIntelligence.js`  
**Type**: Static service (not a class instance)  
**Purpose**: Provides intelligent grocery item processing and categorization

#### Responsibilities

- Auto-categorize grocery items
- Spell correction and suggestions
- Item parsing from natural language
- Filler word filtering
- Smart item separation

#### Key Methods

```javascript
// Categorize an item
const category = GroceryIntelligenceService.categorizeItem('basmati rice')

// Correct spelling
const corrected = GroceryIntelligenceService.correctSpelling('basmati rce')

// Parse multiple items from text
const items = GroceryIntelligenceService.parseItems('onion spinach milk')

// Filter filler words
const cleaned = GroceryIntelligenceService.filterFillerWords('uhh you know onion')
```

#### Categories Supported

- **Produce**: Fresh fruits and vegetables (including Asian/Indian varieties)
- **Asian Pantry**: Rice, noodles, sauces, condiments
- **Indian Pantry**: Spices, lentils, flours, Indian essentials
- **Meat & Seafood**: All protein sources
- **Dairy**: Milk, cheese, eggs, dairy products
- **Frozen**: Frozen foods
- **Beverages**: Drinks and liquids
- **Snacks**: Snack foods
- **Bakery**: Bread and baked goods
- **Pantry**: General pantry items
- **Other**: Uncategorized items

#### Intelligence Features

1. **Smart Categorization**
   - Uses comprehensive grocery database
   - Handles compound items ("basmati rice")
   - Supports multiple names for same item ("bhindi" = "okra")

2. **Spell Correction**
   - Levenshtein distance algorithm
   - Context-aware suggestions
   - User confirmation dialog integration

3. **Item Parsing**
   - Detects space-separated items ("onion spinach milk" → 3 items)
   - Handles natural language input
   - Filters filler words

4. **Filler Word Filtering**
   - Removes: "uhh", "umm", "ahh", "you know", "like", etc.
   - Preserves actual grocery items
   - Improves voice recognition accuracy

## Base Service

**Location**: `src/services/BaseService.js`  
**Purpose**: Base class providing common functionality for all service agents

### Shared Features

All services inherit these capabilities:

#### 1. Error Handling

```javascript
// Standardized error responses
{
  success: false,
  error: 'Error message',
  context: { /* additional context */ }
}
```

#### 2. Retry Logic

- **Default Attempts**: 3 retries
- **Default Delay**: 1 second (exponential backoff)
- **Smart Retry**: Skips retry for auth/validation errors

```javascript
await this.executeWithRetry(async () => {
  // Operation that may fail
}, { maxAttempts: 5, delay: 2000 })
```

#### 3. Network Status Monitoring

- Automatically tracks online/offline status
- Listens to browser `online`/`offline` events
- Provides `isServiceAvailable()` method

#### 4. Standardized Responses

```javascript
// Success response
{
  success: true,
  data: { /* result data */ },
  message: 'Operation completed successfully'
}

// Error response
{
  success: false,
  error: 'Error message',
  context: { /* context */ }
}
```

#### 5. Logging

All services use centralized logger:
- `logger.info()` - General information
- `logger.success()` - Successful operations
- `logger.warn()` - Warnings
- `logger.error()` - Errors
- `logger.debug()` - Debug information

## Agent Communication

### Service Dependencies

```
ServiceManager
  ├── ApiService (no dependencies)
  ├── AuthService → ApiService
  ├── GroceryListService → ApiService
  └── GroceryIntelligenceService (standalone)
```

### Communication Patterns

1. **Direct Service Access**
   ```javascript
   const authService = serviceManager.getService('auth')
   await authService.login(email, password)
   ```

2. **Service-to-Service**
   ```javascript
   // AuthService uses ApiService internally
   class AuthService extends BaseService {
     constructor() {
       super('Auth')
       this.apiService = new ApiService()
     }
   }
   ```

3. **Orchestrated Operations**
   ```javascript
   // ServiceManager coordinates multiple services
   const result = await serviceManager.initialize()
   ```

## Error Handling

### Error Types

1. **Network Errors**: Handled with retry logic
2. **Authentication Errors**: No retry, immediate failure
3. **Validation Errors**: No retry, immediate failure
4. **Permission Errors**: No retry, immediate failure

### Error Flow

```
Operation Attempt
  ↓
Error Occurs
  ↓
BaseService.handleError()
  ↓
Log Error
  ↓
Check if Retryable
  ↓
Retry (if applicable) OR Return Error Response
```

### Error Response Format

All services return consistent error format:
```javascript
{
  success: false,
  error: 'Human-readable error message',
  context: {
    // Additional error context
    timestamp: '2024-01-15T10:30:00Z',
    serviceName: 'Auth',
    operation: 'login'
  }
}
```

## Health Monitoring

### Service Health Status

Each service tracks:
- **Healthy**: Service is functioning correctly
- **Online**: Service can communicate (network available)
- **Status**: Additional service-specific status

### Health Check Methods

```javascript
// Check all services
const health = await serviceManager.healthCheck()

// Check individual service
const apiHealth = await apiService.healthCheck()

// Get service status
const status = serviceManager.getServiceStatus()
```

### Health Check Response

```javascript
{
  success: true,
  data: {
    api: true,
    auth: true,
    groceryList: true,
    intelligence: true
  },
  message: 'All services healthy'
}
```

### Service Statistics

```javascript
const stats = serviceManager.getServiceStats()
// Returns:
{
  totalServices: 4,
  healthyServices: 4,
  onlineServices: 4,
  services: {
    api: { healthy: true, online: true },
    auth: { healthy: true, online: true },
    // ...
  }
}
```

## Usage Examples

### Initializing Services

```javascript
import serviceManager from './services/ServiceManager.js'

// Initialize all services
await serviceManager.initialize()

// Check if services are ready
const status = serviceManager.getServiceStatus()
if (status.api && status.auth) {
  // Services are ready
}
```

### Using Authentication Service

```javascript
const authService = serviceManager.getService('auth')

// Register user
const registerResult = await authService.register({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'securePassword'
})

// Login
const loginResult = await authService.login('john@example.com', 'password')
if (loginResult.success) {
  const user = loginResult.data
  // User is now authenticated
}
```

### Using Grocery List Service

```javascript
const groceryListService = serviceManager.getService('groceryList')
const userId = authService.getCurrentUser()._id

// Get today's list
const today = new Date().toISOString().split('T')[0]
const listResult = await groceryListService.getGroceryListByDate(userId, today)

if (listResult.success) {
  const list = listResult.data
  // Use the list
}
```

### Using Intelligence Service

```javascript
const intelligence = serviceManager.getService('intelligence')

// Categorize item
const category = intelligence.categorizeItem('basmati rice')
// Returns: 'Asian Pantry'

// Correct spelling
const corrected = intelligence.correctSpelling('basmati rce')
// Returns: { original: 'basmati rce', corrected: 'basmati rice', confidence: 0.9 }

// Parse multiple items
const items = intelligence.parseItems('onion spinach milk')
// Returns: ['onion', 'spinach', 'milk']
```

## Best Practices

1. **Always use ServiceManager** - Don't instantiate services directly
2. **Handle errors gracefully** - Check `success` property in responses
3. **Use retry logic** - Services automatically retry on network failures
4. **Monitor health** - Check service health before critical operations
5. **Clear caches** - Clear caches when data becomes stale
6. **Log operations** - Services automatically log, but add context when needed

## Debugging

### Accessing Services in Browser Console

```javascript
// ServiceManager is available globally in development
window.serviceManager

// Check service status
window.serviceManager.getServiceStatus()

// Test API connectivity
await window.serviceManager.apiService.testConnectivity()

// View service statistics
window.serviceManager.getServiceStats()
```

### Common Issues

1. **Service Not Initialized**: Call `serviceManager.initialize()` first
2. **Network Errors**: Check `isServiceAvailable()` before operations
3. **Authentication Failures**: Verify token is valid with `authService.validateSession()`
4. **Cache Issues**: Clear caches with `serviceManager.clearAllCaches()`

## Future Enhancements

Potential improvements to the agent architecture:

1. **Service Workers**: Move some services to background workers
2. **Service Discovery**: Dynamic service registration
3. **Event System**: Inter-service event communication
4. **Metrics Collection**: Performance monitoring per service
5. **Service Plugins**: Extensible service architecture

