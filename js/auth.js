// Authentication Module
// Centralized authentication logic and role-based access control

// Role definitions
const USER_ROLES = {
    ADMIN: 'admin',
    PARENT: 'parent',
    MONITOR: 'monitor',
    SECURITY: 'security'
};

// Page access permissions
const PAGE_PERMISSIONS = {
    'admin-dashboard.html': [USER_ROLES.ADMIN],
    'parent-dashboard.html': [USER_ROLES.PARENT],
    'monitor-dashboard.html': [USER_ROLES.MONITOR],
    'security-dashboard.html': [USER_ROLES.SECURITY]
};

/**
 * Check if user is authenticated and has required role for current page
 * @param {string} requiredRole - Required role for access (optional)
 * @returns {boolean} Authentication status
 */
function checkAuthentication(requiredRole = null) {
    // Load session if not already loaded
    if (!window.SessionModule.getCurrentUser()) {
        if (!window.SessionModule.loadSession()) {
            console.log('❌ No valid session found');
            return false;
        }
    }
    
    const currentUser = window.SessionModule.getCurrentUser();
    
    if (!currentUser) {
        console.log('❌ No user data found');
        return false;
    }
    
    // Check session validity
    if (!window.SessionModule.isSessionValid()) {
        console.log('❌ Session expired');
        window.SessionModule.handleSessionExpiry();
        return false;
    }
    
    // Check role requirement
    if (requiredRole && currentUser.role !== requiredRole) {
        console.log(`❌ User role '${currentUser.role}' does not match required role '${requiredRole}'`);
        if (typeof showToast === 'function') {
            showToast(`Access denied: ${requiredRole} privileges required`, 'error');
        }
        return false;
    }
    
    console.log('✅ Authentication valid for user:', currentUser);
    return true;
}

/**
 * Check if user has permission to access current page
 * @returns {boolean} Access permission status
 */
function checkPageAccess() {
    const currentPage = window.location.pathname.split('/').pop();
    const allowedRoles = PAGE_PERMISSIONS[currentPage];
    
    if (!allowedRoles) {
        // Page not in permissions list, allow access
        return true;
    }
    
    const currentUser = window.SessionModule.getCurrentUser();
    if (!currentUser) {
        return false;
    }
    
    const hasAccess = allowedRoles.includes(currentUser.role);
    
    if (!hasAccess) {
        console.log(`❌ User role '${currentUser.role}' not allowed for page '${currentPage}'`);
        if (typeof showToast === 'function') {
            showToast('Access denied: Insufficient privileges for this page', 'error');
        }
    }
    
    return hasAccess;
}

/**
 * Initialize authentication for a page
 * @param {string} requiredRole - Required role for the page
 * @returns {boolean} Success status
 */
function initializeAuth(requiredRole) {
    console.log(`Initializing authentication for role: ${requiredRole}`);
    
    // Check authentication
    if (!checkAuthentication(requiredRole)) {
        showSecurityOverlay();
        setTimeout(() => {
            window.SessionModule.redirectToLogin();
        }, 3000);
        return false;
    }
    
    // Check page access
    if (!checkPageAccess()) {
        showSecurityOverlay('Access Denied', 'You do not have permission to access this page.');
        setTimeout(() => {
            redirectToAppropriateRole();
        }, 3000);
        return false;
    }
    
    // Hide security overlay if visible
    hideSecurityOverlay();
    
    // Update UI with user info
    updateUserInterface();
    
    return true;
}

/**
 * Show security overlay with message
 * @param {string} title - Overlay title
 * @param {string} message - Overlay message
 */
function showSecurityOverlay(title = 'Unauthorized Access', message = 'You are not authorized to access this page. Redirecting to login...') {
    let overlay = document.getElementById('securityOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'securityOverlay';
        overlay.className = 'security-overlay';
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div class="security-message">
            <div class="security-icon">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h2>${title}</h2>
            <p>${message}</p>
            <div style="margin-top: 20px;">
                <i class="fas fa-spinner fa-spin"></i>
                <span style="margin-left: 10px;">Redirecting...</span>
            </div>
        </div>
    `;
    
    overlay.classList.remove('hidden');
}

/**
 * Hide security overlay
 */
function hideSecurityOverlay() {
    const overlay = document.getElementById('securityOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/**
 * Redirect user to appropriate role-based page
 */
function redirectToAppropriateRole() {
    const currentUser = window.SessionModule.getCurrentUser();
    if (!currentUser) {
        window.SessionModule.redirectToLogin();
        return;
    }
    
    const rolePages = {
        [USER_ROLES.ADMIN]: 'admin-dashboard.html',
        [USER_ROLES.PARENT]: 'parent-dashboard.html',
        [USER_ROLES.MONITOR]: 'monitor-dashboard.html',
        [USER_ROLES.SECURITY]: 'security-dashboard.html'
    };
    
    const targetPage = rolePages[currentUser.role];
    if (targetPage) {
        window.location.href = targetPage;
    } else {
        window.SessionModule.redirectToLogin();
    }
}

/**
 * Update user interface with current user information
 */
function updateUserInterface() {
    const currentUser = window.SessionModule.getCurrentUser();
    if (!currentUser) return;
    
    // Update user name display
    const userNameElements = document.querySelectorAll('.user-name, [data-user-name]');
    userNameElements.forEach(element => {
        element.textContent = currentUser.name;
    });
    
    // Update user role display
    const userRoleElements = document.querySelectorAll('.user-role, [data-user-role]');
    userRoleElements.forEach(element => {
        element.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    });
    
    // Update user badge
    const userBadge = document.querySelector('.user-badge');
    if (userBadge) {
        const roleColors = {
            [USER_ROLES.ADMIN]: '#dc2626',
            [USER_ROLES.PARENT]: '#059669',
            [USER_ROLES.MONITOR]: '#d97706',
            [USER_ROLES.SECURITY]: '#7c3aed'
        };
        
        const roleIcons = {
            [USER_ROLES.ADMIN]: 'fas fa-crown',
            [USER_ROLES.PARENT]: 'fas fa-user-friends',
            [USER_ROLES.MONITOR]: 'fas fa-eye',
            [USER_ROLES.SECURITY]: 'fas fa-shield-alt'
        };
        
        userBadge.style.background = roleColors[currentUser.role] || '#6b7280';
        userBadge.innerHTML = `
            <i class="${roleIcons[currentUser.role] || 'fas fa-user'}"></i>
            ${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
        `;
    }
}

/**
 * Handle logout functionality
 */
function handleLogout() {
    if (typeof showToast === 'function') {
        showToast('Logging out...', 'info');
    }
    
    setTimeout(() => {
        window.SessionModule.redirectToLogin();
    }, 1000);
}

/**
 * Setup logout button event listener
 */
function setupLogoutButton() {
    const logoutBtn = document.querySelector('.logout-btn, [data-logout]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}

/**
 * Get user role display name
 * @param {string} role - User role
 * @returns {string} Display name
 */
function getRoleDisplayName(role) {
    const displayNames = {
        [USER_ROLES.ADMIN]: 'Administrator',
        [USER_ROLES.PARENT]: 'Parent',
        [USER_ROLES.MONITOR]: 'Monitor',
        [USER_ROLES.SECURITY]: 'Security'
    };
    
    return displayNames[role] || role;
}

/**
 * Check if current user has specific role
 * @param {string} role - Role to check
 * @returns {boolean} Role match status
 */
function hasRole(role) {
    const currentUser = window.SessionModule.getCurrentUser();
    return currentUser && currentUser.role === role;
}

/**
 * Check if current user has any of the specified roles
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean} Role match status
 */
function hasAnyRole(roles) {
    const currentUser = window.SessionModule.getCurrentUser();
    return currentUser && roles.includes(currentUser.role);
}

// Export functions for use in other modules
window.AuthModule = {
    checkAuthentication,
    checkPageAccess,
    initializeAuth,
    showSecurityOverlay,
    hideSecurityOverlay,
    redirectToAppropriateRole,
    updateUserInterface,
    handleLogout,
    setupLogoutButton,
    getRoleDisplayName,
    hasRole,
    hasAnyRole,
    USER_ROLES,
    PAGE_PERMISSIONS
}; 