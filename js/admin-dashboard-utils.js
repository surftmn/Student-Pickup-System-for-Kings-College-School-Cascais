/* Kings College School - Admin Dashboard Utility Functions */

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
}

// Format duration in minutes to readable format (e.g., "1h 23min" or "45min")
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes}min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${remainingMinutes}min`;
        }
    }
}

// Calculate duration between called_time and completed_time/completed_at
function calculateDuration(calledTime, completedTime) {
    if (!calledTime || !completedTime) {
        return '-';
    }
    
    const startTime = new Date(calledTime);
    const endTime = new Date(completedTime);
    const diffMs = endTime - startTime;
    const diffMinutes = Math.round(diffMs / 1000 / 60);
    
    if (diffMinutes < 0) return '-';
    if (diffMinutes === 0) return '< 1min';
    return formatDuration(diffMinutes);
}

// Fix caller name to show "Security" instead of "Unknown"
function getCallerDisplayName(callerName) {
    if (!callerName || callerName === 'Unknown' || callerName.trim() === '') {
        return 'Security';
    }
    return callerName;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuthentication();
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

// Close modal
function closeModal(modalId = 'callsModal') {
    document.getElementById(modalId).classList.remove('show');
} 