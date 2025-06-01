/* Kings College School - Admin Dashboard JavaScript */

// Configuration
const SUPABASE_URL = 'https://hzzaauogpmlnymxguppp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6emFhdW9ncG1sbnlteGd1cHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNzU2NTAsImV4cCI6MjA2MzY1MTY1MH0.16_3QrnieC_GdBfiuaRpaw4vsXTRCgw0hXXDNqbzFQQ';

let supabase = null;
let currentUser = null;
let uploadedPhotoFile = null;
let editUploadedPhotoFile = null;

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Pagination state
let currentPage = 1;
const studentsPerPage = 10;

// Helper function to format caller name
function formatCallerName(callerName) {
    if (!callerName || callerName.toLowerCase() === 'system') {
        return 'Security';
    }
    return callerName;
}

// Helper function to get duration color based on response time
function getDurationColor(durationMinutes) {
    if (durationMinutes <= 5) {
        return '#10b981'; // Green - Excellent response time
    } else if (durationMinutes <= 15) {
        return '#f59e0b'; // Yellow - Good response time
    } else {
        return '#ef4444'; // Red - Slow response time
    }
}

// Helper function to format duration with color
function formatDurationWithColor(durationMinutes) {
    // Handle edge cases that could cause "-" to appear
    if (typeof durationMinutes !== 'number' || isNaN(durationMinutes) || durationMinutes < 0) {
        return {
            text: '-',
            color: '#9ca3af',
            html: '<span style="color: #9ca3af;">-</span>'
        };
    }
    
    const color = getDurationColor(durationMinutes);
    let formattedDuration;
    
    if (durationMinutes < 1) {
        // For sub-minute durations, show seconds
        const seconds = Math.round(durationMinutes * 60);
        formattedDuration = seconds <= 0 ? '0s' : `${seconds}s`;
    } else {
        // For 1+ minute durations, round to nearest minute first to avoid precision errors
        const roundedMinutes = Math.round(durationMinutes);
        formattedDuration = formatDuration ? formatDuration(roundedMinutes) : `${roundedMinutes} min`;
    }
    
    return {
        text: formattedDuration,
        color: color,
        html: `<span style="color: ${color}; font-weight: 600;">${formattedDuration}</span>`
    };
}

// Authentication functions
function checkAuthentication() {
    const authToken = sessionStorage.getItem('school_auth_token');
    const authTime = sessionStorage.getItem('school_auth_time');
    const userRole = sessionStorage.getItem('school_user_role');
    const userName = sessionStorage.getItem('school_user_name');
    
    console.log('🔍 Authentication Debug Info:');
    console.log('  Auth Token:', authToken ? 'Present' : 'Missing');
    console.log('  Auth Time:', authTime);
    console.log('  User Role:', userRole);
    console.log('  User Name:', userName);
    
    if (!authToken || !authTime || !userRole) {
        console.log('❌ No authentication credentials found');
        console.log('  Missing items:', {
            token: !authToken,
            time: !authTime,
            role: !userRole,
            name: !userName
        });
        return false;
    }
    
    if (userRole !== 'admin') {
        console.log('❌ User does not have admin role:', userRole);
        if (typeof showToast === 'function') {
            showToast(`Access denied: Admin role required. Your role: ${userRole}`, 'error');
        }
        return false;
    }
    
    const currentTime = Date.now();
    const loginTime = parseInt(authTime);
    
    if (currentTime - loginTime > SESSION_TIMEOUT) {
        console.log('❌ Session expired');
        clearAuthentication();
        if (typeof showToast === 'function') {
            showToast('Session expired. Please login again.', 'error');
        }
        return false;
    }
    
    currentUser = {
        name: userName,
        role: userRole,
        token: authToken
    };
    
    console.log('✅ Authentication valid for user:', currentUser);
    return true;
}

function clearAuthentication() {
    sessionStorage.removeItem('school_auth_token');
    sessionStorage.removeItem('school_auth_time');
    sessionStorage.removeItem('school_user_role');
    sessionStorage.removeItem('school_user_name');
    currentUser = null;
}

function redirectToLogin() {
    clearAuthentication();
    window.location.href = 'login.html';
}

function updateSessionTime() {
    if (currentUser) {
        sessionStorage.setItem('school_auth_time', Date.now().toString());
    }
}

// Initialize Supabase
function initializeSupabase() {
    try {
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized successfully');
            return true;
        } else {
            console.error('❌ Supabase library not loaded');
            if (typeof showToast === 'function') {
                showToast('Failed to load system', 'error');
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

// Load statistics
async function loadStatistics() {
    try {
        // Get total students with debugging
        console.log('🔍 Loading student statistics...');
        const { count: studentCount, error: studentError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });

        if (studentError) {
            console.error('❌ Student count error:', studentError);
            throw studentError;
        }

        console.log('📊 Student count from statistics query:', studentCount);

        // Also get actual data to compare
        const { data: allStudents, error: dataError } = await supabase
            .from('students')
            .select('id, name, created_at')
            .order('name', { ascending: true });
        
        if (dataError) {
            console.error('❌ Student data error:', dataError);
        } else {
            console.log('📊 Actual students in database:', allStudents?.length || 0);
            console.log('📋 Student list:', allStudents?.map(s => s.name).join(', '));
        }

        // Get total pickup calls
        const { count: totalCallsCount, error: totalCallsError } = await supabase
            .from('pickup_calls')
            .select('*', { count: 'exact', head: true });

        if (totalCallsError) throw totalCallsError;

        // Get today's calls
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCallsCount, error: todayCallsError } = await supabase
            .from('pickup_calls')
            .select('*', { count: 'exact', head: true })
            .gte('called_time', `${today}T00:00:00.000Z`)
            .lt('called_time', `${today}T23:59:59.999Z`);

        if (todayCallsError) throw todayCallsError;

        // Get average response time data
        const avgResponseTime = await calculateAverageResponseTime();

        // Update UI - use the actual data count if available, otherwise use count query result
        const displayCount = allStudents?.length || studentCount || 0;
        document.getElementById('totalStudents').textContent = displayCount;
        document.getElementById('totalCalls').textContent = totalCallsCount || 0;
        document.getElementById('callsToday').textContent = todayCallsCount || 0;
        document.getElementById('avgResponseTime').textContent = avgResponseTime.display;
        document.getElementById('avgResponseSubtext').textContent = avgResponseTime.subtext;

        console.log('✅ Statistics loaded successfully - showing', displayCount, 'students');
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load statistics', 'error');
        }
    }
}

// Calculate average response time (for main card display)
async function calculateAverageResponseTime() {
    try {
        // Get completed calls from TODAY for the card display
        const today = new Date().toISOString().split('T')[0];
        console.log('🔍 Calculating today\'s average for date:', today);
        
        const { data, error } = await supabase
            .from('pickup_calls')
            .select(`
                called_time,
                completed_at,
                completed_time,
                status,
                student_name,
                caller_name
            `)
            .gte('called_time', `${today}T00:00:00.000Z`)
            .lt('called_time', `${today}T23:59:59.999Z`)
            .order('called_time', { ascending: false });

        if (error) {
            console.error('❌ Query error:', error);
            throw error;
        }

        console.log('📊 All calls for today:', data?.length || 0, data);

        if (!data || data.length === 0) {
            console.log('❌ No calls found for today');
            return {
                display: '-',
                subtext: 'No calls today'
            };
        }

        // Filter for completed calls (case-insensitive and flexible)
        const completedCalls = data.filter(call => {
            const status = call.status?.toLowerCase();
            const hasCompletionTime = call.completed_time || call.completed_at;
            const isCompleted = status === 'completed' || status === 'complete';
            
            console.log(`📋 Call for ${call.student_name}: status="${call.status}", hasCompletionTime=${!!hasCompletionTime}, isCompleted=${isCompleted}`);
            
            return isCompleted && hasCompletionTime;
        });

        console.log('✅ Completed calls found:', completedCalls.length, completedCalls);

        if (completedCalls.length === 0) {
            return {
                display: '-',
                subtext: `${data.length} calls today, none completed`
            };
        }

        // Calculate durations in minutes
        const durations = completedCalls.map(call => {
            const completionTime = call.completed_time || call.completed_at;
            if (!call.called_time || !completionTime) {
                console.log(`⚠️ Missing times for ${call.student_name}: called=${call.called_time}, completed=${completionTime}`);
                return null;
            }
            
            const startTime = new Date(call.called_time);
            const endTime = new Date(completionTime);
            const diffMinutes = Math.round((endTime - startTime) / 1000 / 60);
            
            console.log(`⏱️ ${call.student_name}: ${diffMinutes} minutes (${call.called_time} → ${completionTime})`);
            
            return diffMinutes > 0 ? diffMinutes : null;
        }).filter(duration => duration !== null);

        if (durations.length === 0) {
            return {
                display: '-',
                subtext: `${completedCalls.length} completed calls, no valid durations`
            };
        }

        // Calculate average
        const avgMinutes = Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
        
        console.log('📈 Calculated average:', avgMinutes, 'minutes from durations:', durations);
        
        return {
            display: formatDuration(avgMinutes),
            subtext: `Today: ${durations.length} completed pickups`
        };

    } catch (error) {
        console.error('❌ Error calculating average response time:', error);
        return {
            display: 'Error',
            subtext: 'Failed to calculate'
        };
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin dashboard loading...');
    
    // Check authentication
    if (!checkAuthentication()) {
        console.log('❌ Authentication failed - showing security overlay');
        document.getElementById('securityOverlay').classList.remove('hidden');
        document.getElementById('mainDashboard').classList.add('hidden');
        return;
    }
    
    // Hide security overlay and show dashboard
    document.getElementById('securityOverlay').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    
    // Update user display
    const currentUserElement = document.getElementById('currentUser');
    if (currentUserElement && currentUser) {
        currentUserElement.textContent = currentUser.name;
    }
    
    try {
        // Initialize Supabase
        if (!initializeSupabase()) {
            return;
        }
        
        // Wait for utils to be available before proceeding
        let retries = 0;
        while (typeof showToast !== 'function' && retries < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        // Set up form handlers
        setupFormHandlers();
        
        // Load initial data
        await Promise.all([
            loadStatistics(),
            loadRecentActivity()
        ]);
        
        console.log('✅ Admin dashboard loaded successfully');
        
        // Periodic refresh
        setInterval(() => {
            updateSessionTime();
            loadStatistics();
            loadRecentActivity();
        }, 60000);
        
        // Update session time on user activity
        document.addEventListener('click', updateSessionTime);
        document.addEventListener('keypress', updateSessionTime);
        
        // Periodic session check
        setInterval(() => {
            if (!checkAuthentication()) {
                redirectToLogin();
            }
        }, 5 * 60 * 1000);
        
    } catch (error) {
        console.error('Admin dashboard initialization failed:', error);
        if (typeof showToast === 'function') {
            showToast('System initialization failed. Please refresh the page.', 'error');
        }
    }
});

// Setup form handlers
function setupFormHandlers() {
    // Add Student Form Handler
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', handleAddStudent);
    }
    
    // Edit Student Form Handler
    const editStudentForm = document.getElementById('editStudentForm');
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', handleEditStudent);
    }
    
    // Photo upload handlers for Add Student form
    const photoInput = document.getElementById('photoInput');
    const photoUpload = document.getElementById('photoUpload');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }
    if (photoUpload) {
        photoUpload.addEventListener('click', function() {
            photoInput.click();
        });
    }
    
    // Photo upload handlers for Edit Student form
    const editPhotoInput = document.getElementById('editPhotoInput');
    const editPhotoUpload = document.getElementById('editPhotoUpload');
    if (editPhotoInput) {
        editPhotoInput.addEventListener('change', handleEditPhotoUpload);
    }
    if (editPhotoUpload) {
        editPhotoUpload.addEventListener('click', function() {
            editPhotoInput.click();
        });
    }
}

// Handle Add Student Form Submission
async function handleAddStudent(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('addStudentBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Student...';
        submitBtn.disabled = true;
        
        // Get form data
        const name = document.getElementById('studentName').value.trim();
        const studentClass = document.getElementById('studentClass').value.trim();
        const grade = document.getElementById('studentGrade').value.trim();
        const parentContact = document.getElementById('parentContact').value.trim();
        
        if (!name || !studentClass || !parentContact) {
            throw new Error('Please fill in all required fields');
        }
        
        console.log('Adding new student:', { name, studentClass, grade, parentContact });
        
        // Prepare student data
        const studentData = {
            name: name,
            class: studentClass,
            grade: grade || null,
            parent_contact: parentContact,
            photo_url: null,
            created_at: new Date().toISOString()
        };
        
        // Handle photo upload if there's a file
        if (uploadedPhotoFile) {
            console.log('Uploading photo for new student...');
            // For demo purposes, we'll set a placeholder URL
            // In a real implementation, you'd upload to Supabase Storage
            studentData.photo_url = URL.createObjectURL(uploadedPhotoFile);
        }
        
        // Insert into database
        const { data, error } = await supabase
            .from('students')
            .insert([studentData])
            .select();
            
        if (error) throw error;
        
        console.log('✅ Student added successfully:', data[0]);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast(`${name} has been added successfully!`, 'success');
        }
        
        // Reset form
        document.getElementById('addStudentForm').reset();
        clearPhotoPreview();
        uploadedPhotoFile = null;
        
        // Refresh statistics
        await loadStatistics();
        
        // Update session time
        updateSessionTime();
        
    } catch (error) {
        console.error('Error adding student:', error);
        if (typeof showToast === 'function') {
            showToast(`Failed to add student: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Edit Student Form Submission
async function handleEditStudent(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('updateStudentBtn');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        submitBtn.disabled = true;
        
        // Get form data
        const studentId = document.getElementById('editStudentId').value;
        const name = document.getElementById('editStudentName').value.trim();
        const studentClass = document.getElementById('editStudentClass').value.trim();
        const grade = document.getElementById('editStudentGrade').value.trim();
        const parentContact = document.getElementById('editParentContact').value.trim();
        
        if (!name || !studentClass || !parentContact) {
            throw new Error('Please fill in all required fields');
        }
        
        console.log('Updating student:', { studentId, name, studentClass, grade, parentContact });
        
        // Prepare update data
        const updateData = {
            name: name,
            class: studentClass,
            grade: grade || null,
            parent_contact: parentContact
        };
        
        // Handle photo upload if there's a new file
        if (editUploadedPhotoFile) {
            console.log('Uploading new photo for student...');
            // For demo purposes, we'll set a placeholder URL
            // In a real implementation, you'd upload to Supabase Storage
            updateData.photo_url = URL.createObjectURL(editUploadedPhotoFile);
        }
        
        // Update in database
        const { data, error } = await supabase
            .from('students')
            .update(updateData)
            .eq('id', studentId)
            .select();
            
        if (error) throw error;
        
        console.log('✅ Student updated successfully:', data[0]);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast(`${name} has been updated successfully!`, 'success');
        }
        
        // Close modal
        closeModal('editStudentModal');
        editUploadedPhotoFile = null;
        
        // Update local data if it exists
        if (window.allStudentsData) {
            const studentIndex = window.allStudentsData.findIndex(s => s.id == studentId);
            if (studentIndex !== -1) {
                window.allStudentsData[studentIndex] = { ...window.allStudentsData[studentIndex], ...updateData };
                applyFiltersAndSearch(); // Refresh the display
            }
        }
        
        // Refresh statistics
        await loadStatistics();
        
        // Update session time
        updateSessionTime();
        
    } catch (error) {
        console.error('Error updating student:', error);
        if (typeof showToast === 'function') {
            showToast(`Failed to update student: ${error.message}`, 'error');
        }
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle photo upload for add form
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        uploadedPhotoFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('photoPreview');
            const uploadContent = document.querySelector('#photoUpload .upload-content');
            if (preview && uploadContent) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                uploadContent.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
}

// Handle photo upload for edit form
function handleEditPhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        editUploadedPhotoFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('editPhotoPreview');
            const uploadContent = document.getElementById('editUploadContent');
            if (preview && uploadContent) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                uploadContent.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
}

// Clear photo preview
function clearPhotoPreview() {
    const preview = document.getElementById('photoPreview');
    const uploadContent = document.querySelector('#photoUpload .upload-content');
    if (preview && uploadContent) {
        preview.style.display = 'none';
        uploadContent.style.display = 'block';
    }
}

// Show Today's Calls Modal
async function showTodaysCalls() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Loading today\'s calls for date:', today);
        
        const { data, error } = await supabase
            .from('pickup_calls')
            .select(`
                id,
                called_time,
                student_name,
                caller_name,
                status,
                completed_time,
                completed_at
            `)
            .gte('called_time', `${today}T00:00:00.000Z`)
            .lt('called_time', `${today}T23:59:59.999Z`)
            .order('called_time', { ascending: false });

        if (error) throw error;

        const modalTitle = document.getElementById('modalTitle');
        const callsTableBody = document.getElementById('callsTableBody');
        
        modalTitle.textContent = `Today's Pickup Calls (${data?.length || 0})`;
        
        if (!data || data.length === 0) {
            callsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">No calls made today</td></tr>';
        } else {
            callsTableBody.innerHTML = data.map(call => {
                const callTime = new Date(call.called_time);
                const completionTime = call.completed_time || call.completed_at;
                
                let duration = '-';
                if (completionTime && call.status === 'completed' && call.called_time) {
                    try {
                        const callTimeMs = new Date(call.called_time).getTime();
                        const completionTimeMs = new Date(completionTime).getTime();
                        
                        // Check if both timestamps are valid
                        if (!isNaN(callTimeMs) && !isNaN(completionTimeMs) && completionTimeMs >= callTimeMs) {
                            const diffMs = completionTimeMs - callTimeMs;
                            const diffMinutes = diffMs / 1000 / 60; // Keep as decimal for precise calculation
                            const durationFormatted = formatDurationWithColor(diffMinutes);
                            duration = durationFormatted.html;
                        }
                    } catch (error) {
                        console.warn('Error calculating duration for call:', call.id, error);
                        // duration remains '-'
                    }
                }

                return `
                    <tr>
                        <td>${callTime.toLocaleString()}</td>
                        <td>${call.student_name || 'Unknown'}</td>
                        <td>${formatCallerName(call.caller_name)}</td>
                        <td><span class="status-badge ${call.status}">${call.status}</span></td>
                        <td>${duration}</td>
                    </tr>
                `;
            }).join('');
        }
        
        document.getElementById('callsModal').classList.add('show');
        
    } catch (error) {
        console.error('Error loading today\'s calls:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load today\'s calls', 'error');
        }
    }
}

// Show All Calls Modal
async function showAllCalls() {
    try {
        console.log('Loading all pickup calls...');
        
        const { data, error } = await supabase
            .from('pickup_calls')
            .select(`
                id,
                called_time,
                student_name,
                caller_name,
                status,
                completed_time,
                completed_at
            `)
            .order('called_time', { ascending: false })
            .limit(100); // Limit to last 100 calls for performance

        if (error) throw error;

        const modalTitle = document.getElementById('modalTitle');
        const callsTableBody = document.getElementById('callsTableBody');
        
        modalTitle.textContent = `All Pickup Calls (Last ${data?.length || 0})`;
        
        if (!data || data.length === 0) {
            callsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">No pickup calls found</td></tr>';
        } else {
            callsTableBody.innerHTML = data.map(call => {
                const callTime = new Date(call.called_time);
                const completionTime = call.completed_time || call.completed_at;
                
                let duration = '-';
                if (completionTime && call.status === 'completed' && call.called_time) {
                    try {
                        const callTimeMs = new Date(call.called_time).getTime();
                        const completionTimeMs = new Date(completionTime).getTime();
                        
                        // Check if both timestamps are valid
                        if (!isNaN(callTimeMs) && !isNaN(completionTimeMs) && completionTimeMs >= callTimeMs) {
                            const diffMs = completionTimeMs - callTimeMs;
                            const diffMinutes = diffMs / 1000 / 60; // Keep as decimal for precise calculation
                            const durationFormatted = formatDurationWithColor(diffMinutes);
                            duration = durationFormatted.html;
                        }
                    } catch (error) {
                        console.warn('Error calculating duration for call:', call.id, error);
                        // duration remains '-'
                    }
                }

                return `
                    <tr>
                        <td>${callTime.toLocaleDateString()} ${callTime.toLocaleTimeString()}</td>
                        <td>${call.student_name || 'Unknown'}</td>
                        <td>${formatCallerName(call.caller_name)}</td>
                        <td><span class="status-badge ${call.status}">${call.status}</span></td>
                        <td>${duration}</td>
                    </tr>
                `;
            }).join('');
        }
        
        document.getElementById('callsModal').classList.add('show');
        
    } catch (error) {
        console.error('Error loading all calls:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load all calls', 'error');
        }
    }
}

// Calculate average from calls data
function calculateAverageFromCalls(calls) {
    if (!calls || calls.length === 0) {
        return { display: '-' };
    }

    const durations = calls.map(call => {
        const completionTime = call.completed_time || call.completed_at;
        if (!call.called_time || !completionTime) return null;
        
        const diffMinutes = Math.round((new Date(completionTime) - new Date(call.called_time)) / 1000 / 60);
        return diffMinutes > 0 ? diffMinutes : null;
    }).filter(duration => duration !== null);

    if (durations.length === 0) {
        return { display: '-' };
    }

    const avgMinutes = Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);
    return { display: formatDuration(avgMinutes) };
}

// Show All Students Modal
async function showAllStudents() {
    try {
        console.log('Loading all students...');
        
        const { data, error } = await supabase
            .from('students')
            .select(`
                id,
                name,
                class,
                grade,
                parent_contact,
                photo_url,
                created_at
            `)
            .order('name', { ascending: true });

        if (error) throw error;

        const studentsContent = document.getElementById('studentsContent');
        
        if (!data || data.length === 0) {
            studentsContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-graduation-cap" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                    <p style="font-size: 1.2rem;">No students found in the database.</p>
                </div>
            `;
        } else {
            // Store all students data globally for search functionality
            window.allStudentsData = data;
            
            // Reset pagination to first page
            currentPage = 1;
            
            // Get unique classes and grades for filter options
            const uniqueClasses = [...new Set(data.map(s => s.class).filter(c => c))].sort();
            const uniqueGrades = [...new Set(data.map(s => s.grade).filter(g => g))].sort();
            
            studentsContent.innerHTML = `
                <!-- Search and Filter Bar -->
                <div style="margin-bottom: 25px;">
                    <!-- Search Input -->
                    <div style="position: relative; margin-bottom: 15px;">
                        <input 
                            type="text" 
                            id="studentSearchInput" 
                            placeholder="🔍 Search students by name, class, or parent contact..." 
                            style="width: 100%; padding: 15px 20px 15px 50px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 1rem; background: white; transition: all 0.3s ease;"
                            oninput="applyFiltersAndSearch()"
                        >
                        <div style="position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 1.1rem;">
                            <i class="fas fa-search"></i>
                        </div>
                    </div>
                    
                    <!-- Filter Controls -->
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label for="filterBy" style="font-weight: 600; color: #374151; font-size: 0.9rem;">Filter by:</label>
                            <select id="filterBy" style="padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; background: white; cursor: pointer;" onchange="handleFilterChange()">
                                <option value="all">All Students</option>
                                <option value="class">By Class</option>
                                <option value="grade">By Grade</option>
                            </select>
                        </div>
                        
                        <!-- Class Filter (hidden by default) -->
                        <div id="classFilterContainer" style="display: none; align-items: center; gap: 10px;">
                            <label for="classFilter" style="font-weight: 500; color: #374151; font-size: 0.9rem;">Class:</label>
                            <select id="classFilter" style="padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; background: white; cursor: pointer;" onchange="applyFiltersAndSearch()">
                                <option value="">Select Class</option>
                                ${uniqueClasses.map(cls => `<option value="${cls}">${cls}</option>`).join('')}
                            </select>
                        </div>
                        
                        <!-- Grade Filter (hidden by default) -->
                        <div id="gradeFilterContainer" style="display: none; align-items: center; gap: 10px;">
                            <label for="gradeFilter" style="font-weight: 500; color: #374151; font-size: 0.9rem;">Grade:</label>
                            <select id="gradeFilter" style="padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; background: white; cursor: pointer;" onchange="applyFiltersAndSearch()">
                                <option value="">Select Grade</option>
                                ${uniqueGrades.map(grade => `<option value="${grade}">${grade}</option>`).join('')}
                            </select>
                        </div>
                        
                        <!-- Clear Filters Button -->
                        <button onclick="clearAllFilters()" id="clearFiltersBtn" style="display: none; background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; font-weight: 500;">
                            <i class="fas fa-times"></i> Clear Filters
                        </button>
                    </div>
                    
                    <!-- Results Info -->
                    <div style="margin-top: 15px; color: #64748b; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                        <span id="searchResultsInfo">Loading students...</span>
                        <span id="filterStatusInfo" style="font-style: italic;"></span>
                    </div>
                </div>

                <!-- Students Grid -->
                <div class="students-grid" id="studentsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                    <!-- Students will be populated by applyFiltersAndSearch() -->
                </div>

                <!-- No Results Message -->
                <div id="noResultsMessage" style="display: none; text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">No students found</p>
                    <p style="font-size: 1rem; opacity: 0.8;">Try adjusting your search criteria or filters</p>
                </div>
            `;
        }
        
        document.getElementById('studentsModal').classList.add('show');
        
        // Apply initial pagination after modal is set up
        if (data && data.length > 0) {
            setTimeout(() => {
                applyFiltersAndSearch();
            }, 50);
        }
        
        // Focus on search input after modal opens
        setTimeout(() => {
            const searchInput = document.getElementById('studentSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading students:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load students', 'error');
        }
    }
}

// Render student cards function
function renderStudentCards(students) {
    return students.map(student => `
        <div class="student-card" data-student-id="${student.id}" style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s ease; border: 2px solid transparent;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div class="student-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; margin-right: 15px;">
                    ${student.photo_url ? 
                        `<img src="${student.photo_url}" alt="${student.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                        student.name.charAt(0)
                    }
                </div>
                <div>
                    <h3 style="margin: 0; color: #1e40af; font-size: 1.1rem; font-weight: 600;">${student.name}</h3>
                    <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.9rem;">${student.class}${student.grade ? ` • ${student.grade}` : ''}</p>
                </div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0; color: #374151; font-size: 0.9rem;">
                    <i class="fas fa-user-friends" style="margin-right: 8px; color: #10b981;"></i>
                    ${student.parent_contact || 'No parent contact info'}
                </p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="editStudent(${student.id})" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; font-weight: 500;">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="confirmDeleteStudent(${student.id}, '${student.name.replace(/'/g, "\\\'")}')" style="flex: 1; background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; font-weight: 500;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Handle filter type change
function handleFilterChange() {
    const filterBy = document.getElementById('filterBy').value;
    const classFilterContainer = document.getElementById('classFilterContainer');
    const gradeFilterContainer = document.getElementById('gradeFilterContainer');
    const classFilter = document.getElementById('classFilter');
    const gradeFilter = document.getElementById('gradeFilter');
    
    // Hide all filter containers
    classFilterContainer.style.display = 'none';
    gradeFilterContainer.style.display = 'none';
    
    // Reset filter values
    classFilter.value = '';
    gradeFilter.value = '';
    
    // Show appropriate filter container
    if (filterBy === 'class') {
        classFilterContainer.style.display = 'flex';
    } else if (filterBy === 'grade') {
        gradeFilterContainer.style.display = 'flex';
    }
    
    // Apply filters
    applyFiltersAndSearch();
}

// Apply filters and search combined with pagination
function applyFiltersAndSearch(resetToFirstPage = true) {
    const searchInput = document.getElementById('studentSearchInput');
    const filterBy = document.getElementById('filterBy') ? document.getElementById('filterBy').value : 'all';
    const classFilter = document.getElementById('classFilter') ? document.getElementById('classFilter').value : '';
    const gradeFilter = document.getElementById('gradeFilter') ? document.getElementById('gradeFilter').value : '';
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const studentsGrid = document.getElementById('studentsGrid');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const filterStatusInfo = document.getElementById('filterStatusInfo');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (!window.allStudentsData || !studentsGrid) return;
    
    // Check if any filters are active
    const hasActiveFilters = filterBy !== 'all' || searchTerm;
    
    // Reset to first page when filters change (unless explicitly told not to)
    if (resetToFirstPage) {
        currentPage = 1;
    }
    
    // Update search input styling
    if (searchInput) {
        if (searchTerm) {
            searchInput.style.borderColor = '#3b82f6';
            searchInput.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
        } else {
            searchInput.style.borderColor = '#e5e7eb';
            searchInput.style.boxShadow = 'none';
        }
    }
    
    // Show/hide clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.style.display = hasActiveFilters ? 'block' : 'none';
    }
    
    // Apply filters
    let filteredStudents = window.allStudentsData;
    
    // Apply filter by type
    if (filterBy === 'class' && classFilter) {
        filteredStudents = filteredStudents.filter(student => student.class === classFilter);
    } else if (filterBy === 'grade' && gradeFilter) {
        filteredStudents = filteredStudents.filter(student => student.grade === gradeFilter);
    }
    
    // Apply search term
    if (searchTerm) {
        filteredStudents = filteredStudents.filter(student => {
            const name = student.name.toLowerCase();
            const studentClass = student.class.toLowerCase();
            const grade = (student.grade || '').toLowerCase();
            const parentContact = (student.parent_contact || '').toLowerCase();
            
            return name.includes(searchTerm) || 
                   studentClass.includes(searchTerm) || 
                   grade.includes(searchTerm) || 
                   parentContact.includes(searchTerm);
        });
    }
    
    // Calculate pagination (only for "All Students" without filters)
    let currentPageStudents;
    let totalPages = 1;
    let usePagination = false;
    
    if (!hasActiveFilters) {
        // No filters active - use pagination for "All Students"
        usePagination = true;
        totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        currentPageStudents = filteredStudents.slice(startIndex, endIndex);
    } else {
        // Filters are active - show all filtered results on one page
        currentPageStudents = filteredStudents;
    }
    
    const totalStudents = filteredStudents.length;
    
    // Update status information
    let statusText = '';
    let filterStatusText = '';
    
    if (totalStudents === 0) {
        statusText = 'No students found';
    } else if (!usePagination || totalPages === 1) {
        // Single page or filtered results - show simple count
        if (searchTerm && (filterBy === 'all' || (!classFilter && !gradeFilter))) {
            statusText = `Found ${totalStudents} student${totalStudents !== 1 ? 's' : ''} matching "${searchInput.value}"`;
        } else if (filterBy === 'class' && classFilter) {
            statusText = `Showing ${totalStudents} student${totalStudents !== 1 ? 's' : ''} in ${classFilter}`;
            if (searchTerm) {
                statusText += ` matching "${searchInput.value}"`;
            }
            filterStatusText = `Filtered by class: ${classFilter}`;
        } else if (filterBy === 'grade' && gradeFilter) {
            statusText = `Showing ${totalStudents} student${totalStudents !== 1 ? 's' : ''} in ${gradeFilter}`;
            if (searchTerm) {
                statusText += ` matching "${searchInput.value}"`;
            }
            filterStatusText = `Filtered by grade: ${gradeFilter}`;
        } else {
            statusText = `Showing all ${totalStudents} students`;
        }
    } else {
        // Multiple pages for "All Students" - show pagination info
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = Math.min(startIndex + studentsPerPage, totalStudents);
        const startStudent = startIndex + 1;
        const endStudent = endIndex;
        statusText = `Showing ${startStudent}-${endStudent} of ${totalStudents} students`;
    }
    
    if (searchResultsInfo) searchResultsInfo.textContent = statusText;
    if (filterStatusInfo) filterStatusInfo.textContent = filterStatusText;
    
    // Show/hide results
    if (totalStudents === 0) {
        studentsGrid.style.display = 'none';
        noResultsMessage.style.display = 'block';
        // Hide pagination
        hidePagination();
    } else {
        studentsGrid.style.display = 'grid';
        noResultsMessage.style.display = 'none';
        studentsGrid.innerHTML = renderStudentCards(currentPageStudents);
        
        // Show/update pagination only for "All Students" without filters
        if (usePagination && totalPages > 1) {
            renderPagination(totalPages, totalStudents);
        } else {
            hidePagination();
        }
        
        // Highlight results with animation if filtering or searching
        if (hasActiveFilters) {
            setTimeout(() => {
                const studentCards = studentsGrid.querySelectorAll('.student-card');
                studentCards.forEach(card => {
                    card.style.borderColor = '#10b981';
                    card.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        card.style.borderColor = 'transparent';
                        card.style.transform = 'scale(1)';
                    }, 800);
                });
            }, 100);
        }
    }
}

// Hide pagination controls
function hidePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

// Render pagination controls
function renderPagination(totalPages, totalStudents) {
    const studentsGrid = document.getElementById('studentsGrid');
    if (!studentsGrid) return;
    
    let paginationContainer = document.getElementById('paginationContainer');
    
    // Create pagination container if it doesn't exist
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        studentsGrid.parentNode.insertBefore(paginationContainer, studentsGrid.nextSibling);
    }
    
    // Hide pagination if only one page or no results
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.style.justifyContent = 'center';
    paginationContainer.style.alignItems = 'center';
    paginationContainer.style.marginTop = '25px';
    paginationContainer.style.gap = '10px';
    
    let paginationHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(${currentPage - 1})" style="
                padding: 8px 12px; 
                background: #3b82f6; 
                color: white; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 0.9rem;
                transition: all 0.2s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
    } else {
        paginationHTML += `
            <button disabled style="
                padding: 8px 12px; 
                background: #e5e7eb; 
                color: #9ca3af; 
                border: none; 
                border-radius: 6px; 
                cursor: not-allowed; 
                font-size: 0.9rem;
            ">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
    }
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(1)" style="
                padding: 8px 12px; 
                background: white; 
                color: #374151; 
                border: 2px solid #e5e7eb; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 0.9rem;
                transition: all 0.2s;
            " onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#374151'">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span style="color: #9ca3af; padding: 0 8px;">...</span>`;
        }
    }
    
    // Visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <button style="
                    padding: 8px 12px; 
                    background: #3b82f6; 
                    color: white; 
                    border: 2px solid #3b82f6; 
                    border-radius: 6px; 
                    cursor: default; 
                    font-size: 0.9rem;
                    font-weight: 600;
                ">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="goToPage(${i})" style="
                    padding: 8px 12px; 
                    background: white; 
                    color: #374151; 
                    border: 2px solid #e5e7eb; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-size: 0.9rem;
                    transition: all 0.2s;
                " onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#374151'">
                    ${i}
                </button>
            `;
        }
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span style="color: #9ca3af; padding: 0 8px;">...</span>`;
        }
        paginationHTML += `
            <button onclick="goToPage(${totalPages})" style="
                padding: 8px 12px; 
                background: white; 
                color: #374151; 
                border: 2px solid #e5e7eb; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 0.9rem;
                transition: all 0.2s;
            " onmouseover="this.style.borderColor='#3b82f6'; this.style.color='#3b82f6'" onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#374151'">
                ${totalPages}
            </button>
        `;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <button onclick="goToPage(${currentPage + 1})" style="
                padding: 8px 12px; 
                background: #3b82f6; 
                color: white; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 0.9rem;
                transition: all 0.2s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
    } else {
        paginationHTML += `
            <button disabled style="
                padding: 8px 12px; 
                background: #e5e7eb; 
                color: #9ca3af; 
                border: none; 
                border-radius: 6px; 
                cursor: not-allowed; 
                font-size: 0.9rem;
            ">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
    paginationContainer.innerHTML = paginationHTML;
}

// Navigate to specific page
function goToPage(pageNumber) {
    currentPage = pageNumber;
    applyFiltersAndSearch(false); // Don't reset to first page since we're explicitly navigating
}

// Clear all filters and search
function clearAllFilters() {
    const searchInput = document.getElementById('studentSearchInput');
    const filterBy = document.getElementById('filterBy');
    const classFilter = document.getElementById('classFilter');
    const gradeFilter = document.getElementById('gradeFilter');
    
    // Reset all inputs
    if (searchInput) searchInput.value = '';
    if (filterBy) filterBy.value = 'all';
    if (classFilter) classFilter.value = '';
    if (gradeFilter) gradeFilter.value = '';
    
    // Reset pagination
    currentPage = 1;
    
    // Hide filter containers
    handleFilterChange();
    
    // Apply filters (which will show all students)
    applyFiltersAndSearch();
    
    // Focus back on search input
    if (searchInput) searchInput.focus();
}

// Enhanced delete function with confirmation
function confirmDeleteStudent(studentId, studentName) {
    // Create custom confirmation modal instead of browser alert
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.style.display = 'flex';
    confirmModal.style.zIndex = '10001'; // Higher than students modal
    
    confirmModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; text-align: center;">
            <div class="modal-header" style="padding: 30px 30px 20px; border-bottom: 1px solid #e5e7eb;">
                <h2 style="color: #ef4444; margin: 0; font-size: 1.5rem;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
                    Confirm Deletion
                </h2>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <p style="color: #374151; font-size: 1.1rem; margin-bottom: 10px;">
                    Are you sure you want to delete
                </p>
                <p style="color: #1e40af; font-weight: 700; font-size: 1.2rem; margin-bottom: 20px;">
                    ${studentName}?
                </p>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 30px;">
                    This action cannot be undone. All student data and pickup history will be permanently removed.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="cancelDeleteStudent()" style="flex: 1; max-width: 120px; background: #6b7280; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500;">
                        Cancel
                    </button>
                    <button onclick="executeDeleteStudent(${studentId}, '${studentName.replace(/'/g, "\\\'")}')" style="flex: 1; max-width: 120px; background: #ef4444; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
}

// Cancel delete function
function cancelDeleteStudent() {
    const confirmModal = document.querySelector('.modal[style*="z-index: 10001"]');
    if (confirmModal) {
        document.body.removeChild(confirmModal);
    }
}

// Execute delete function
async function executeDeleteStudent(studentId, studentName) {
    try {
        // Remove confirmation modal
        cancelDeleteStudent();
        
        // Show loading toast
        if (typeof showToast === 'function') {
            showToast(`Deleting ${studentName}...`, 'info');
        }
        
        // Delete from database
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', studentId);
            
        if (error) throw error;
        
        console.log('✅ Student deleted successfully:', studentId);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast(`${studentName} has been deleted successfully`, 'success');
        }
        
        // Remove from local data and refresh display
        if (window.allStudentsData) {
            window.allStudentsData = window.allStudentsData.filter(s => s.id !== studentId);
            applyFiltersAndSearch(); // Refresh the display
        }
        
        // Refresh statistics
        await loadStatistics();
        
        // Update session time
        updateSessionTime();
        
    } catch (error) {
        console.error('Error deleting student:', error);
        if (typeof showToast === 'function') {
            showToast(`Failed to delete ${studentName}. Please try again.`, 'error');
        }
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        console.log('Loading recent activity...');
        
        // Get recent pickup calls (last 10)
        const { data, error } = await supabase
            .from('pickup_calls')
            .select(`
                id,
                called_time,
                student_name,
                caller_name,
                status,
                completed_time,
                completed_at
            `)
            .order('called_time', { ascending: false })
            .limit(10);

        if (error) throw error;

        const activityList = document.getElementById('activityList');
        
        if (!data || data.length === 0) {
            activityList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #64748b;">
                    <i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No recent activity to display.</p>
                </div>
            `;
        } else {
            activityList.innerHTML = data.map(activity => {
                const timeAgo = getTimeAgo(new Date(activity.called_time));
                const isCompleted = activity.status === 'completed';
                const iconClass = isCompleted ? 'check-circle' : 'phone-alt';
                const iconColor = isCompleted ? '#10b981' : '#3b82f6';
                
                // Calculate duration for completed calls
                let durationText = '';
                if (isCompleted) {
                    const completionTime = activity.completed_time || activity.completed_at;
                    if (completionTime && activity.called_time) {
                        try {
                            const callTimeMs = new Date(activity.called_time).getTime();
                            const completionTimeMs = new Date(completionTime).getTime();
                            
                            // Check if both timestamps are valid
                            if (!isNaN(callTimeMs) && !isNaN(completionTimeMs) && completionTimeMs >= callTimeMs) {
                                const diffMs = completionTimeMs - callTimeMs;
                                const durationMinutes = diffMs / 1000 / 60; // Keep as decimal for precise calculation
                                const durationFormatted = formatDurationWithColor(durationMinutes);
                                durationText = ` • <span style="color: ${durationFormatted.color}; font-weight: 600;">${durationFormatted.text}</span>`;
                            }
                        } catch (error) {
                            console.warn('Error calculating duration for activity:', activity.id, error);
                            // durationText remains empty
                        }
                    }
                }
                
                return `
                    <div class="activity-item" style="
                        display: flex; 
                        align-items: flex-start; 
                        padding: 12px 0; 
                        border-bottom: 1px solid #f3f4f6;
                        min-height: 60px;
                        cursor: pointer;
                        transition: background-color 0.2s ease;
                    " onclick="showStudentPickupHistory('${activity.student_name.replace(/'/g, "\\\'")}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="
                            width: 36px; 
                            height: 36px; 
                            border-radius: 50%; 
                            background: ${iconColor}20; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            margin-right: 12px; 
                            flex-shrink: 0;
                            margin-top: 2px;
                        ">
                            <i class="fas fa-${iconClass}" style="color: ${iconColor}; font-size: 0.9rem;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0; overflow: hidden;">
                            <div style="
                                display: flex; 
                                align-items: center; 
                                justify-content: space-between; 
                                margin-bottom: 4px;
                                gap: 8px;
                            ">
                                <div style="
                                    font-weight: 600; 
                                    color: #1e40af; 
                                    font-size: 0.9rem;
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    flex: 1;
                                ">
                                    ${isCompleted ? 'Completed' : 'Requested'}: ${activity.student_name}
                                </div>
                                <span class="status-badge ${activity.status}" style="
                                    font-size: 0.7rem; 
                                    padding: 3px 6px;
                                    border-radius: 4px;
                                    flex-shrink: 0;
                                ">${activity.status}</span>
                            </div>
                            <div style="
                                font-size: 0.8rem; 
                                color: #6b7280; 
                                margin-bottom: 2px;
                                line-height: 1.3;
                            ">
                                ${isCompleted ? 'Student picked up' : 'Pickup initiated'}${activity.caller_name ? ` by ${formatCallerName(activity.caller_name)}` : ''}
                            </div>
                            <div style="
                                font-size: 0.75rem; 
                                color: #9ca3af;
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            ">
                                <i class="fas fa-clock" style="font-size: 0.65rem;"></i>
                                <span>${timeAgo}${durationText}</span>
                                <span style="margin-left: 8px; color: #3b82f6; font-size: 0.7rem;">
                                    <i class="fas fa-history"></i> Click for history
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        console.log('✅ Recent activity loaded successfully');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load recent activity', 'error');
        }
    }
}

// Helper function to get time ago text
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

// Close Modal Function
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Edit Student Function - Load student data and show edit modal
async function editStudent(studentId) {
    try {
        console.log('Loading student data for editing:', studentId);
        
        // Show loading toast
        if (typeof showToast === 'function') {
            showToast('Loading student data...', 'info');
        }
        
        // Get student data from Supabase
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();
            
        if (error) throw error;
        
        if (!data) {
            throw new Error('Student not found');
        }
        
        console.log('✅ Student data loaded:', data);
        
        // Populate the edit form with student data
        document.getElementById('editStudentId').value = data.id;
        document.getElementById('editStudentName').value = data.name || '';
        document.getElementById('editStudentClass').value = data.class || '';
        document.getElementById('editStudentGrade').value = data.grade || '';
        document.getElementById('editParentContact').value = data.parent_contact || '';
        
        // Handle photo preview if student has a photo
        const editPhotoPreview = document.getElementById('editPhotoPreview');
        const editUploadContent = document.getElementById('editUploadContent');
        
        if (data.photo_url && editPhotoPreview && editUploadContent) {
            editPhotoPreview.src = data.photo_url;
            editPhotoPreview.style.display = 'block';
            editUploadContent.style.display = 'none';
        } else if (editPhotoPreview && editUploadContent) {
            editPhotoPreview.style.display = 'none';
            editUploadContent.style.display = 'block';
        }
        
        // Show the edit modal
        document.getElementById('editStudentModal').classList.add('show');
        
        // Focus on the name field
        setTimeout(() => {
            document.getElementById('editStudentName').focus();
        }, 100);
        
    } catch (error) {
        console.error('Error loading student for editing:', error);
        if (typeof showToast === 'function') {
            showToast(`Failed to load student data: ${error.message}`, 'error');
        }
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearAuthentication();
        redirectToLogin();
    }
}

// Show Student Pickup History Modal
async function showStudentPickupHistory(studentName) {
    try {
        console.log('Loading pickup history for student:', studentName);
        
        // Show loading toast
        if (typeof showToast === 'function') {
            showToast(`Loading ${studentName}'s pickup history...`, 'info');
        }
        
        // Get all pickup calls for this student
        const { data, error } = await supabase
            .from('pickup_calls')
            .select(`
                id,
                called_time,
                student_name,
                caller_name,
                status,
                completed_time,
                completed_at
            `)
            .eq('student_name', studentName)
            .order('called_time', { ascending: false });

        if (error) throw error;

        // Create and show the modal
        createPickupHistoryModal(studentName, data || []);
        
    } catch (error) {
        console.error('Error loading pickup history:', error);
        if (typeof showToast === 'function') {
            showToast(`Failed to load pickup history for ${studentName}`, 'error');
        }
    }
}

// Create the pickup history modal
function createPickupHistoryModal(studentName, pickupData) {
    // Remove any existing history modal
    const existingModal = document.getElementById('pickupHistoryModal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'pickupHistoryModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '10002'; // Higher than other modals
    
    // Group pickups by date
    const pickupsByDate = {};
    pickupData.forEach(pickup => {
        const date = new Date(pickup.called_time).toDateString();
        if (!pickupsByDate[date]) {
            pickupsByDate[date] = [];
        }
        pickupsByDate[date].push(pickup);
    });
    
    // Calculate some statistics
    const totalPickups = pickupData.length;
    const completedPickups = pickupData.filter(p => p.status === 'completed').length;
    const averageDuration = calculateAverageForStudent(pickupData.filter(p => p.status === 'completed'));
    
    let historyContent = '';
    
    if (Object.keys(pickupsByDate).length === 0) {
        historyContent = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <p style="font-size: 1.2rem;">No pickup history found for ${studentName}</p>
            </div>
        `;
    } else {
        // Create content for each date
        Object.keys(pickupsByDate).forEach(date => {
            const pickups = pickupsByDate[date];
            const dateObj = new Date(date);
            const isToday = dateObj.toDateString() === new Date().toDateString();
            const isYesterday = dateObj.toDateString() === new Date(Date.now() - 86400000).toDateString();
            
            let dateLabel = date;
            if (isToday) dateLabel = 'Today';
            else if (isYesterday) dateLabel = 'Yesterday';
            else dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            historyContent += `
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #1e40af; margin-bottom: 12px; font-size: 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                        <i class="fas fa-calendar-day" style="margin-right: 8px;"></i>
                        ${dateLabel}
                    </h4>
                    <div style="space-y: 8px;">
                        ${pickups.map(pickup => {
                            const callTime = new Date(pickup.called_time);
                            const isCompleted = pickup.status === 'completed';
                            const completionTime = pickup.completed_time || pickup.completed_at;
                            
                            let durationText = '';
                            if (isCompleted && completionTime) {
                                try {
                                    const callTimeMs = callTime.getTime();
                                    const completionTimeMs = new Date(completionTime).getTime();
                                    
                                    // Check if both timestamps are valid
                                    if (!isNaN(callTimeMs) && !isNaN(completionTimeMs) && completionTimeMs >= callTimeMs) {
                                        const diffMs = completionTimeMs - callTimeMs;
                                        const duration = diffMs / 1000 / 60; // Keep as decimal for precise calculation
                                        const durationFormatted = formatDurationWithColor(duration);
                                        durationText = ` • Duration: <span style="color: ${durationFormatted.color}; font-weight: 600;">${durationFormatted.text}</span>`;
                                    }
                                } catch (error) {
                                    console.warn('Error calculating duration for pickup:', pickup.id, error);
                                    // durationText remains empty
                                }
                            }
                            
                            return `
                                <div style="
                                    background: ${isCompleted ? '#f0fdf4' : '#fef3c7'}; 
                                    border-left: 4px solid ${isCompleted ? '#10b981' : '#f59e0b'}; 
                                    padding: 12px 16px; 
                                    border-radius: 0 8px 8px 0;
                                    margin-bottom: 8px;
                                ">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <span style="font-weight: 600; color: ${isCompleted ? '#065f46' : '#92400e'}; font-size: 0.9rem;">
                                            <i class="fas fa-${isCompleted ? 'check-circle' : 'clock'}" style="margin-right: 6px;"></i>
                                            ${isCompleted ? 'Completed' : 'Requested'}
                                        </span>
                                        <span style="font-size: 0.8rem; color: #6b7280; font-weight: 500;">
                                            ${callTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div style="font-size: 0.85rem; color: #374151;">
                                        ${isCompleted ? 'Student was picked up' : 'Pickup was requested'}${pickup.caller_name ? ` by ${formatCallerName(pickup.caller_name)}` : ''}${durationText}
                                    </div>
                                    ${isCompleted && completionTime ? `
                                        <div style="font-size: 0.8rem; color: #6b7280; margin-top: 4px;">
                                            Completed at: ${new Date(completionTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header" style="padding: 25px 30px 20px; border-bottom: 2px solid #e5e7eb; position: sticky; top: 0; background: white; z-index: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="color: #1e40af; margin: 0; font-size: 1.4rem;">
                            <i class="fas fa-history" style="margin-right: 10px;"></i>
                            ${studentName}'s Pickup History
                        </h2>
                        <div style="margin-top: 8px; font-size: 0.9rem; color: #6b7280;">
                            <span style="margin-right: 15px;">
                                <i class="fas fa-list" style="margin-right: 5px;"></i>
                                ${totalPickups} total pickup${totalPickups !== 1 ? 's' : ''}
                            </span>
                            <span style="margin-right: 15px;">
                                <i class="fas fa-check-circle" style="margin-right: 5px; color: #10b981;"></i>
                                ${completedPickups} completed
                            </span>
                            ${averageDuration ? `
                                <span>
                                    <i class="fas fa-clock" style="margin-right: 5px; color: #3b82f6;"></i>
                                    Avg: ${averageDuration}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <button onclick="closePickupHistoryModal()" style="
                        background: #ef4444; 
                        color: white; 
                        border: none; 
                        width: 36px; 
                        height: 36px; 
                        border-radius: 50%; 
                        cursor: pointer; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="modal-body" style="padding: 25px 30px;">
                ${historyContent}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Calculate average duration for a student
function calculateAverageForStudent(completedPickups) {
    if (!completedPickups.length) return null;
    
    const durations = completedPickups.map(pickup => {
        const completionTime = pickup.completed_time || pickup.completed_at;
        if (!completionTime || !pickup.called_time) return null;
        
        try {
            const callTimeMs = new Date(pickup.called_time).getTime();
            const completionTimeMs = new Date(completionTime).getTime();
            
            // Check if both timestamps are valid
            if (!isNaN(callTimeMs) && !isNaN(completionTimeMs) && completionTimeMs >= callTimeMs) {
                const diffMs = completionTimeMs - callTimeMs;
                const duration = diffMs / 1000 / 60; // Keep as decimal for precise calculation
                return duration;
            }
        } catch (error) {
            console.warn('Error calculating duration for average:', pickup.id, error);
        }
        
        return null;
    }).filter(d => d !== null);
    
    if (!durations.length) return null;
    
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length; // Keep as decimal for precise calculation
    const durationFormatted = formatDurationWithColor(avg);
    return `<span style="color: ${durationFormatted.color}; font-weight: 600;">${durationFormatted.text}</span>`;
}

// Close pickup history modal
function closePickupHistoryModal() {
    const modal = document.getElementById('pickupHistoryModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Show Today's Completed Pickups (Response Time Modal)
async function showTodaysCompletedPickups() {
    try {
        console.log('Loading today\'s completed pickups for response time analysis...');
        
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's completed calls
        const { data: todayData, error: todayError } = await supabase
            .from('pickup_calls')
            .select(`
                called_time,
                completed_time,
                completed_at,
                status,
                student_name
            `)
            .gte('called_time', `${today}T00:00:00.000Z`)
            .lt('called_time', `${today}T23:59:59.999Z`)
            .eq('status', 'completed')
            .order('called_time', { ascending: false });

        if (todayError) throw todayError;

        // Get this month's completed calls
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: monthData, error: monthError } = await supabase
            .from('pickup_calls')
            .select(`
                called_time,
                completed_time,
                completed_at,
                status
            `)
            .gte('called_time', monthStart)
            .eq('status', 'completed');

        if (monthError) throw monthError;

        // Get all completed calls
        const { data: allData, error: allError } = await supabase
            .from('pickup_calls')
            .select(`
                called_time,
                completed_time,
                completed_at,
                status
            `)
            .eq('status', 'completed');

        if (allError) throw allError;

        // Calculate averages
        const todayAvg = calculateAverageFromCalls(todayData);
        const monthAvg = calculateAverageFromCalls(monthData);
        const overallAvg = calculateAverageFromCalls(allData);

        // Update modal content
        document.getElementById('todayAvgTime').textContent = todayAvg.display;
        document.getElementById('monthAvgTime').textContent = monthAvg.display;
        document.getElementById('overallAvgTime').textContent = overallAvg.display;

        // Show details
        const detailsContainer = document.getElementById('responseTimeDetails');
        if (todayData && todayData.length > 0) {
            detailsContainer.innerHTML = `
                <h4 style="margin-bottom: 15px; color: #1e40af;">Today's Completed Pickups (${todayData.length})</h4>
                ${todayData.map(call => {
                    const completionTime = call.completed_time || call.completed_at;
                    let duration = 0;
                    
                    if (completionTime && call.called_time) {
                        try {
                            const callTimeMs = new Date(call.called_time).getTime();
                            const completionTimeMs = new Date(completionTime).getTime();
                            
                            if (!isNaN(callTimeMs) && !isNaN(completionTimeMs) && completionTimeMs >= callTimeMs) {
                                const diffMs = completionTimeMs - callTimeMs;
                                duration = diffMs / 1000 / 60; // Keep as decimal for precise calculation
                            }
                        } catch (error) {
                            console.warn('Error calculating duration for response time:', call, error);
                        }
                    }
                    
                    const durationFormatted = formatDurationWithColor(duration);
                    return `
                        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                            <span style="font-weight: 500;">${call.student_name}</span>
                            <span style="font-weight: 600;">${durationFormatted.html}</span>
                        </div>
                    `;
                }).join('')}
            `;
        } else {
            detailsContainer.innerHTML = `
                <p style="text-align: center; color: #64748b; padding: 20px;">
                    <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                    No completed pickups today yet.
                </p>
            `;
        }

        document.getElementById('responseTimeModal').classList.add('show');
        
    } catch (error) {
        console.error('Error loading response time data:', error);
        if (typeof showToast === 'function') {
            showToast('Failed to load response time data', 'error');
        }
    }
}

// System Statistics Function
function showSystemStats() {
    showToast('System statistics feature coming soon!', 'info');
}

// Add CSS for spinner in JavaScript
const spinnerCSS = `
.spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Add the CSS to the document
if (!document.getElementById('spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'spinner-styles';
    style.textContent = spinnerCSS;
    document.head.appendChild(style);
} 