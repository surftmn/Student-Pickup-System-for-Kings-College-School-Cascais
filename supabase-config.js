// Supabase Configuration for Kings College School Pickup System
// Replace these with your actual Supabase project credentials

const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL'; // Replace with your project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions
const Auth = {
    // Sign in user
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('Sign in error:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign in exception:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },

    // Sign out user
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (error) {
            console.error('Sign out exception:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error('Get user error:', error);
                return null;
            }
            return user;
        } catch (error) {
            console.error('Get user exception:', error);
            return null;
        }
    },

    // Check user role from metadata
    getUserRole(user) {
        if (!user || !user.user_metadata) {
            return null;
        }
        return user.user_metadata.role || null;
    },

    // Create new user (admin only)
    async createUser(email, password, role, metadata = {}) {
        try {
            // This requires admin privileges - usually done server-side
            const { data, error } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                user_metadata: {
                    role: role,
                    ...metadata
                }
            });
            
            if (error) {
                console.error('Create user error:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Create user exception:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }
};

// Role-based redirect function
function redirectToDashboard(user) {
    const role = Auth.getUserRole(user);
    
    switch (role) {
        case 'admin':
            window.location.href = 'admin-simple.html';
            break;
        case 'security':
            window.location.href = 'security-simple.html';
            break;
        case 'monitor':
            window.location.href = 'monitor-simple.html';
            break;
        case 'parent':
            window.location.href = 'parent-simple.html';
            break;
        default:
            console.error('Unknown user role:', role);
            alert('Access denied. Please contact administrator.');
            break;
    }
}

// Check authentication on protected pages
async function checkAuth(requiredRole = null) {
    try {
        const user = await Auth.getCurrentUser();
        
        if (!user) {
            // Not authenticated, redirect to login
            window.location.href = 'login.html';
            return false;
        }
        
        const userRole = Auth.getUserRole(user);
        
        if (requiredRole && userRole !== requiredRole) {
            // Wrong role, redirect to appropriate dashboard
            redirectToDashboard(user);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Export for use in other files
window.Auth = Auth;
window.redirectToDashboard = redirectToDashboard;
window.checkAuth = checkAuth; 