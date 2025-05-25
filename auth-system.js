// Authentication System for School Pickup Management

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.selectedRole = 'parent';
        this.demoUsers = {
            'parent@school.com': { 
                password: 'parent123', 
                role: 'parent', 
                name: 'Sarah Johnson',
                children: [1, 2] // Student IDs
            },
            'security@school.com': { 
                password: 'security123', 
                role: 'security', 
                name: 'Mike Security' 
            },
            'monitor@school.com': { 
                password: 'monitor123', 
                role: 'monitor', 
                name: 'Anna Monitor' 
            },
            'admin@school.com': { 
                password: 'admin123', 
                role: 'admin', 
                name: 'School Administrator' 
            }
        };

        this.initializeEventListeners();
        this.checkExistingAuth();
    }

    initializeEventListeners() {
        // Only initialize login-specific elements if they exist (on login page)
        const passwordToggle = document.getElementById('passwordToggle');
        const loginForm = document.getElementById('loginForm');
        const toastClose = document.getElementById('toastClose');
        
        // Role tab switching (only on login page)
        const roleTabs = document.querySelectorAll('.role-tab');
        if (roleTabs.length > 0) {
            roleTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    this.selectRole(e.target.closest('.role-tab').dataset.role);
                });
            });
        }

        // Demo credential clicks (only on login page)
        const demoItems = document.querySelectorAll('.demo-item');
        if (demoItems.length > 0) {
            demoItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    this.fillDemoCredentials(e.currentTarget);
                });
            });
        }

        // Password toggle (only on login page)
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Login form submission (only on login page)
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Toast close (available on all pages)
        if (toastClose) {
            toastClose.addEventListener('click', () => {
                this.hideToast();
            });
        }
    }

    selectRole(role) {
        this.selectedRole = role;
        
        // Update active tab
        document.querySelectorAll('.role-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-role="${role}"]`).classList.add('active');
        
        // Update role information
        document.querySelectorAll('.role-description').forEach(desc => {
            desc.style.display = 'none';
        });
        document.getElementById(`${role}Info`).style.display = 'block';
        
        // Clear form
        document.getElementById('loginForm').reset();
    }

    fillDemoCredentials(demoItem) {
        const text = demoItem.textContent;
        let email, password;
        
        if (text.includes('parent@school.com')) {
            email = 'parent@school.com';
            password = 'parent123';
            this.selectRole('parent');
        } else if (text.includes('security@school.com')) {
            email = 'security@school.com';
            password = 'security123';
            this.selectRole('security');
        } else if (text.includes('monitor@school.com')) {
            email = 'monitor@school.com';
            password = 'monitor123';
            this.selectRole('monitor');
        } else if (text.includes('admin@school.com')) {
            email = 'admin@school.com';
            password = 'admin123';
            this.selectRole('admin');
        }
        
        document.getElementById('email').value = email;
        document.getElementById('password').value = password;
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#passwordToggle i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showToast('Please enter both email and password', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Check demo credentials
            const user = this.demoUsers[email];
            
            if (!user) {
                throw new Error('Invalid email address');
            }
            
            if (user.password !== password) {
                throw new Error('Invalid password');
            }
            
            if (user.role !== this.selectedRole) {
                throw new Error(`This account is not authorized for ${this.selectedRole} access`);
            }

            // Successful login
            this.currentUser = {
                email: email,
                role: user.role,
                name: user.name,
                children: user.children || []
            };

            // Store in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.showToast(`Welcome, ${user.name}!`, 'success');
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    redirectToDashboard() {
        const role = this.currentUser.role;
        
        switch (role) {
            case 'admin':
                window.location.href = 'admin-dashboard.html';
                break;
            case 'security':
                window.location.href = 'security-dashboard.html';
                break;
            case 'monitor':
                window.location.href = 'monitor-dashboard.html';
                break;
            case 'parent':
                window.location.href = 'parent-dashboard.html';
                break;
            default:
                this.showToast('Unknown role', 'error');
        }
    }

    checkExistingAuth() {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            // Auto-redirect if already logged in
            this.redirectToDashboard();
        }
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toast.className = `toast ${type}`;
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('show');
    }

    // Utility method to get current user
    static getCurrentUser() {
        const storedUser = sessionStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    }

    // Utility method to require authentication
    static requireAuth(allowedRoles = []) {
        const user = AuthSystem.getCurrentUser();
        
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
        
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            alert('Access denied: You do not have permission to view this page');
            window.location.href = 'login.html';
            return null;
        }
        
        return user;
    }
}

// Initialize authentication system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});

// Global logout function
window.logout = () => {
    if (window.authSystem) {
        window.authSystem.logout();
    } else {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}; 