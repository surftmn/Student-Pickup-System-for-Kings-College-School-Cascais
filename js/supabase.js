// Supabase Configuration Module
// Centralized Supabase client initialization and configuration

// Supabase configuration
const SUPABASE_URL = 'https://ixqjqfkqjqjqjqjqjqjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxZmtxanFqcWpxanFqcWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MjAxNTU3NTk5OX0.example';

let supabase = null;

/**
 * Initialize Supabase client
 * @returns {boolean} Success status
 */
function initializeSupabase() {
    try {
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized successfully');
            return true;
        } else {
            console.error('❌ Supabase library not loaded');
            if (typeof showToast === 'function') {
                showToast('Failed to load authentication system', 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Supabase initialization error:', error);
        if (typeof showToast === 'function') {
            showToast('System initialization failed', 'error');
        }
        return false;
    }
}

/**
 * Get the Supabase client instance
 * @returns {object|null} Supabase client or null if not initialized
 */
function getSupabaseClient() {
    if (!supabase) {
        console.warn('Supabase not initialized. Call initializeSupabase() first.');
        return null;
    }
    return supabase;
}

/**
 * Check if Supabase is initialized
 * @returns {boolean} Initialization status
 */
function isSupabaseInitialized() {
    return supabase !== null;
}

// Export functions for use in other modules
window.SupabaseModule = {
    initializeSupabase,
    getSupabaseClient,
    isSupabaseInitialized,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
}; 