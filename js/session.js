// Session Management Module
// Centralized session handling, storage, and timeout management

// Session configuration
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const SESSION_KEYS = {
    AUTH_TOKEN: 'school_auth_token',
    AUTH_TIME: 'school_auth_time',
    USER_ROLE: 'school_user_role',
    USER_NAME: 'school_user_name'
};

let currentUser = null;
let sessionCheckInterval = null;

/**
 * Set user session data
 * @param {object} userData - User data object
 * @param {string} userData.name - User name
 * @param {string} userData.role - User role
 * @param {string} userData.token - Authentication token
 */
function setSession(userData) {
    const currentTime = Date.now().toString();
    
    sessionStorage.setItem(SESSION_KEYS.AUTH_TOKEN, userData.token);
    sessionStorage.setItem(SESSION_KEYS.AUTH_TIME, currentTime);
    sessionStorage.setItem(SESSION_KEYS.USER_ROLE, userData.role);
    sessionStorage.setItem(SESSION_KEYS.USER_NAME, userData.name);
    
    currentUser = {
        name: userData.name,
        role: userData.role,
        token: userData.token
    };
    
    console.log('✅ Session set for user:', currentUser);
    startSessionMonitoring();
}

/**
 * Get current user data
 * @returns {object|null} Current user object or null
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Check if session is valid
 * @returns {boolean} Session validity
 */
function isSessionValid() {
    const authToken = sessionStorage.getItem(SESSION_KEYS.AUTH_TOKEN);
    const authTime = sessionStorage.getItem(SESSION_KEYS.AUTH_TIME);
    
    if (!authToken || !authTime) {
        return false;
    }
    
    const currentTime = Date.now();
    const loginTime = parseInt(authTime);
    
    return (currentTime - loginTime) <= SESSION_TIMEOUT;
}

/**
 * Update session timestamp to extend session
 */
function updateSessionTime() {
    if (currentUser) {
        sessionStorage.setItem(SESSION_KEYS.AUTH_TIME, Date.now().toString());
        console.log('Session time updated');
    }
}

/**
 * Clear all session data
 */
function clearSession() {
    Object.values(SESSION_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
    });
    currentUser = null;
    stopSessionMonitoring();
    console.log('Session cleared');
}

/**
 * Load session from storage
 * @returns {boolean} Success status
 */
function loadSession() {
    const authToken = sessionStorage.getItem(SESSION_KEYS.AUTH_TOKEN);
    const authTime = sessionStorage.getItem(SESSION_KEYS.AUTH_TIME);
    const userRole = sessionStorage.getItem(SESSION_KEYS.USER_ROLE);
    const userName = sessionStorage.getItem(SESSION_KEYS.USER_NAME);
    
    console.log('Loading session...', { authToken: !!authToken, authTime, userRole, userName });
    
    if (!authToken || !authTime || !userRole || !userName) {
        console.log('❌ Incomplete session data found');
        return false;
    }
    
    // Check session timeout
    if (!isSessionValid()) {
        console.log('❌ Session expired');
        clearSession();
        return false;
    }
    
    // Restore current user
    currentUser = {
        name: userName,
        role: userRole,
        token: authToken
    };
    
    console.log('✅ Session loaded successfully for user:', currentUser);
    startSessionMonitoring();
    return true;
}

/**
 * Start monitoring session for automatic timeout
 */
function startSessionMonitoring() {
    // Clear existing interval
    stopSessionMonitoring();
    
    // Check session every minute
    sessionCheckInterval = setInterval(() => {
        if (!isSessionValid()) {
            console.log('Session expired during monitoring');
            handleSessionExpiry();
        }
    }, 60000); // Check every minute
}

/**
 * Stop session monitoring
 */
function stopSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

/**
 * Handle session expiry
 */
function handleSessionExpiry() {
    clearSession();
    if (typeof showToast === 'function') {
        showToast('Session expired. Please login again.', 'error');
    }
    setTimeout(() => {
        redirectToLogin();
    }, 2000);
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    clearSession();
    window.location.href = 'login.html';
}

/**
 * Get session remaining time in milliseconds
 * @returns {number} Remaining time or 0 if expired
 */
function getSessionRemainingTime() {
    const authTime = sessionStorage.getItem(SESSION_KEYS.AUTH_TIME);
    if (!authTime) return 0;
    
    const currentTime = Date.now();
    const loginTime = parseInt(authTime);
    const elapsed = currentTime - loginTime;
    const remaining = SESSION_TIMEOUT - elapsed;
    
    return Math.max(0, remaining);
}

/**
 * Format remaining time as human readable string
 * @returns {string} Formatted time string
 */
function getFormattedRemainingTime() {
    const remaining = getSessionRemainingTime();
    if (remaining === 0) return 'Expired';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Activity tracking to extend session on user interaction
let activityTimeout;

function trackUserActivity() {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
        updateSessionTime();
    }, 1000); // Update session after 1 second of inactivity
}

// Add activity listeners when module loads
if (typeof document !== 'undefined') {
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, trackUserActivity, { passive: true });
    });
}

// Export functions for use in other modules
window.SessionModule = {
    setSession,
    getCurrentUser,
    isSessionValid,
    updateSessionTime,
    clearSession,
    loadSession,
    redirectToLogin,
    getSessionRemainingTime,
    getFormattedRemainingTime,
    handleSessionExpiry,
    SESSION_TIMEOUT,
    SESSION_KEYS
}; 