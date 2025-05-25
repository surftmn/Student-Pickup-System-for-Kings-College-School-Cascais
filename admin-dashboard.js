// Admin Dashboard JavaScript

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.students = [];
        this.pickupLogs = [];
        this.filteredStudents = [];
        this.selectedStudent = null;
        this.currentTab = 'students';
        
        // Check if supabaseManager is available
        if (window.supabaseManager) {
            this.db = window.supabaseManager;
        } else {
            console.error('Supabase manager not found!');
            this.showToast('Database connection error', 'error');
            return;
        }
        
        this.checkAuthentication();
        this.initializeEventListeners();
        this.loadData();
        
        // Auto-refresh data every 10 seconds
        setInterval(() => this.refreshData(), 10000);
    }

    checkAuthentication() {
        try {
            console.log('Checking authentication...');
            
            // Check if AuthSystem is available
            if (typeof AuthSystem === 'undefined') {
                console.error('AuthSystem not loaded');
                alert('Authentication system not loaded. Please refresh the page.');
                return;
            }
            
            this.currentUser = AuthSystem.requireAuth(['admin']);
            if (!this.currentUser) {
                console.log('Authentication failed, redirecting to login');
                return;
            }
            
            console.log('Authentication successful:', this.currentUser);
            
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = this.currentUser.name;
            }
        } catch (error) {
            console.error('Authentication error:', error);
            
            // Only redirect if we're not already being redirected
            if (!window.location.href.includes('login.html')) {
                console.log('Redirecting to login due to auth error');
                window.location.href = 'login.html';
            }
        }
    }

    initializeEventListeners() {
        // Form submission handlers
        const addStudentForm = document.getElementById('addStudentForm');
        if (addStudentForm) {
            addStudentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addStudent();
            });
        }
        
        const editStudentForm = document.getElementById('editStudentForm');
        if (editStudentForm) {
            editStudentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateStudent();
            });
        }

        // Modal controls
        const addModalClose = document.getElementById('addStudentModalClose');
        if (addModalClose) {
            addModalClose.addEventListener('click', () => {
                this.hideAddStudentModal();
            });
        }

        const cancelAddStudent = document.getElementById('cancelAddStudent');
        if (cancelAddStudent) {
            cancelAddStudent.addEventListener('click', () => {
                this.hideAddStudentModal();
            });
        }

        const editModalClose = document.getElementById('editStudentModalClose');
        if (editModalClose) {
            editModalClose.addEventListener('click', () => {
                this.hideEditStudentModal();
            });
        }

        const cancelEditStudent = document.getElementById('cancelEditStudent');
        if (cancelEditStudent) {
            cancelEditStudent.addEventListener('click', () => {
                this.hideEditStudentModal();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('studentSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchStudents();
                }
            });
        }

        // Toast close
        const toastClose = document.getElementById('toastClose');
        if (toastClose) {
            toastClose.addEventListener('click', () => {
                this.hideToast();
            });
        }

        // Modal close on outside click
        const addModal = document.getElementById('addStudentModal');
        if (addModal) {
            addModal.addEventListener('click', (e) => {
                if (e.target.id === 'addStudentModal') {
                    this.hideAddStudentModal();
                }
            });
        }

        const editModal = document.getElementById('editStudentModal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target.id === 'editStudentModal') {
                    this.hideEditStudentModal();
                }
            });
        }

        // Set default date filter to today
        const logDateFilter = document.getElementById('logDateFilter');
        if (logDateFilter) {
            logDateFilter.value = new Date().toISOString().split('T')[0];
        }
    }

    async loadData() {
        try {
            this.showLoading(true);
            
            // Load students
            const studentsResult = await this.db.getStudents();
            if (studentsResult.success) {
                this.students = studentsResult.data;
                this.filteredStudents = [...this.students];
            }

            // Load pickup logs
            const logsResult = await this.db.getPickupLog();
            if (logsResult.success) {
                this.pickupLogs = logsResult.data;
            }

            this.updateStats();
            this.renderStudents();
            this.renderLogs();
            this.populateClassFilter();
            this.loadSystemData();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshData() {
        // Silently refresh data without loading indicator
        try {
            const studentsResult = await this.db.getStudents();
            if (studentsResult.success) {
                this.students = studentsResult.data;
                this.filterStudents(); // Reapply current filters
            }

            const logsResult = await this.db.getPickupLog();
            if (logsResult.success) {
                this.pickupLogs = logsResult.data;
                this.renderLogs();
            }

            this.updateStats();
            
            if (this.currentTab === 'system') {
                this.loadSystemData();
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        if (tabName === 'system') {
            this.loadSystemData();
        }
    }

    updateStats() {
        const today = new Date().toDateString();
        
        document.getElementById('totalStudents').textContent = this.students.length;
        
        const pickedUpToday = this.pickupLogs.filter(log => 
            new Date(log.pickup_time).toDateString() === today && log.status === 'completed'
        ).length;
        document.getElementById('pickedUpToday').textContent = pickedUpToday;
        
        const calledToday = this.students.filter(student => 
            student.status === 'called' || student.status === 'found' || student.status === 'picked_up'
        ).length;
        document.getElementById('calledToday').textContent = calledToday;
        
        const pendingPickup = this.students.filter(student => 
            student.status === 'called' || student.status === 'found'
        ).length;
        document.getElementById('pendingPickup').textContent = pendingPickup;
    }

    populateClassFilter() {
        const classes = [...new Set(this.students.map(student => student.class))].sort();
        const classFilter = document.getElementById('classFilter');
        
        // Clear existing options except first
        classFilter.innerHTML = '<option value="">All Classes</option>';
        
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = `Class ${className}`;
            classFilter.appendChild(option);
        });
    }

    searchStudents() {
        const searchTerm = document.getElementById('studentSearchInput').value.trim().toLowerCase();
        this.filterStudents(searchTerm);
    }

    filterStudents(searchTerm = null) {
        if (searchTerm === null) {
            searchTerm = document.getElementById('studentSearchInput').value.trim().toLowerCase();
        }
        
        const classFilter = document.getElementById('classFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        this.filteredStudents = this.students.filter(student => {
            const matchesSearch = !searchTerm || 
                student.name.toLowerCase().includes(searchTerm) ||
                student.class.toLowerCase().includes(searchTerm);
            
            const matchesClass = !classFilter || student.class === classFilter;
            const matchesStatus = !statusFilter || student.status === statusFilter;
            
            return matchesSearch && matchesClass && matchesStatus;
        });
        
        this.renderStudents();
    }

    renderStudents() {
        const tbody = document.getElementById('studentsTableBody');
        
        if (this.filteredStudents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-row">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <p>No students found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredStudents.map(student => `
            <tr>
                <td>
                    <div class="student-photo">
                        <img src="${student.photo_url || 'https://via.placeholder.com/40x40/e5e7eb/9ca3af?text=' + student.name.charAt(0)}" 
                             alt="${student.name}">
                    </div>
                </td>
                <td>
                    <div class="student-name">${student.name}</div>
                </td>
                <td>
                    <div class="student-class">Class ${student.class}</div>
                </td>
                <td>
                    <span class="status-badge ${student.status}">
                        ${this.getStatusLabel(student.status)}
                    </span>
                </td>
                <td>
                    <div class="last-updated">${new Date().toLocaleTimeString()}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-secondary btn-sm" onclick="adminDashboard.editStudent(${student.id})">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn-danger btn-sm" onclick="adminDashboard.deleteStudent(${student.id}, '${student.name}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderLogs() {
        const tbody = document.getElementById('logsTableBody');
        const selectedDate = document.getElementById('logDateFilter').value;
        
        let filteredLogs = this.pickupLogs;
        if (selectedDate) {
            filteredLogs = this.pickupLogs.filter(log => 
                new Date(log.pickup_time).toDateString() === new Date(selectedDate).toDateString()
            );
        }
        
        if (filteredLogs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-row">
                        <div class="empty-state">
                            <i class="fas fa-clipboard-list"></i>
                            <p>No pickup logs found for selected date</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredLogs.map(log => {
            const student = this.students.find(s => s.id === log.student_id);
            return `
                <tr>
                    <td>
                        <div class="log-datetime">
                            ${new Date(log.pickup_time).toLocaleDateString()}
                            <br>
                            <small>${new Date(log.pickup_time).toLocaleTimeString()}</small>
                        </div>
                    </td>
                    <td>
                        <div class="log-student">
                            ${student ? student.name : 'Unknown Student'}
                        </div>
                    </td>
                    <td>
                        <div class="log-class">
                            ${student ? student.class : '-'}
                        </div>
                    </td>
                    <td>
                        <div class="log-parent">${log.parent_name || 'N/A'}</div>
                    </td>
                    <td>
                        <span class="status-badge ${log.status}">
                            ${log.status === 'completed' ? 'Completed' : log.status}
                        </span>
                    </td>
                    <td>
                        <div class="log-notes">${log.notes || '-'}</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async loadSystemData() {
        try {
            // Load chat messages for system overview
            const chatResult = await this.db.getChatMessages(50);
            if (chatResult.success) {
                document.getElementById('totalMessages').textContent = chatResult.data.length;
                this.renderSystemChat(chatResult.data.reverse());
            }

            document.getElementById('totalPickups').textContent = this.pickupLogs.length;
            
            this.renderActivityFeed();
            
        } catch (error) {
            console.error('Error loading system data:', error);
        }
    }

    renderSystemChat(messages) {
        const container = document.getElementById('systemChatMessages');
        
        container.innerHTML = messages.slice(-20).map(msg => `
            <div class="chat-message ${msg.user_role}">
                <div class="message-header">
                    <span class="user-name">${msg.user_name}</span>
                    <span class="user-role">(${msg.user_role})</span>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${msg.message}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    renderActivityFeed() {
        const container = document.getElementById('activityFeed');
        const activities = [];
        
        // Recent pickup logs
        this.pickupLogs.slice(0, 10).forEach(log => {
            const student = this.students.find(s => s.id === log.student_id);
            activities.push({
                time: new Date(log.pickup_time),
                icon: 'check-circle',
                color: 'green',
                text: `${student?.name || 'Student'} was picked up successfully`,
                type: 'pickup'
            });
        });
        
        // Sort by time
        activities.sort((a, b) => b.time - a.time);
        
        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.color}">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time.toLocaleTimeString()}</div>
                </div>
            </div>
        `).join('');
    }

    showAddStudentModal() {
        // Clear form
        document.getElementById('addStudentForm').reset();
        document.getElementById('addStudentModal').classList.add('show');
    }

    hideAddStudentModal() {
        document.getElementById('addStudentModal').classList.remove('show');
        
        // Reset the form
        const form = document.getElementById('addStudentForm');
        if (form) {
            form.reset();
        }
    }

    async addStudent() {
        const name = document.getElementById('studentName').value.trim();
        const className = document.getElementById('studentClass').value.trim();
        const photoUrl = document.getElementById('studentPhoto').value.trim();
        const parentContact = document.getElementById('parentContact').value.trim();
        
        if (!name || !className) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const result = await this.db.addStudent({
                name: name,
                class: className,
                photo_url: photoUrl || null,
                status: 'waiting',
                parent_contact: parentContact || 'No contact provided'
            });
            
            if (result.success) {
                this.showToast(`${name} added successfully!`, 'success');
                this.hideAddStudentModal();
                await this.loadData();
            } else {
                throw new Error(result.error?.message || 'Failed to add student');
            }
            
        } catch (error) {
            console.error('Error adding student:', error);
            this.showToast('Failed to add student', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editStudent(studentId) {
        this.selectedStudent = this.students.find(s => s.id === studentId);
        if (!this.selectedStudent) return;
        
        // Populate edit form
        document.getElementById('editStudentName').value = this.selectedStudent.name;
        document.getElementById('editStudentClass').value = this.selectedStudent.class;
        document.getElementById('editStudentPhoto').value = this.selectedStudent.photo_url || '';
        document.getElementById('editParentContact').value = this.selectedStudent.parent_contact || '';
        document.getElementById('editStudentStatus').value = this.selectedStudent.status;
        
        document.getElementById('editStudentModal').classList.add('show');
    }

    hideEditStudentModal() {
        document.getElementById('editStudentModal').classList.remove('show');
        this.selectedStudent = null;
    }

    async updateStudent() {
        if (!this.selectedStudent) return;
        
        const name = document.getElementById('editStudentName').value.trim();
        const className = document.getElementById('editStudentClass').value.trim();
        const photoUrl = document.getElementById('editStudentPhoto').value.trim();
        const parentContact = document.getElementById('editParentContact').value.trim();
        const status = document.getElementById('editStudentStatus').value;
        
        if (!name || !className) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            const result = await this.db.updateStudent(this.selectedStudent.id, {
                name: name,
                class: className,
                photo_url: photoUrl || null,
                status: status,
                parent_contact: parentContact || 'No contact provided'
            });
            
            if (result.success) {
                this.showToast(`${name} updated successfully!`, 'success');
                this.hideEditStudentModal();
                await this.loadData();
            } else {
                throw new Error(result.error?.message || 'Failed to update student');
            }
            
        } catch (error) {
            console.error('Error updating student:', error);
            this.showToast('Failed to update student', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteStudent(studentId, studentName) {
        if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
            return;
        }
        
        try {
            this.showLoading(true);
            
            const result = await this.db.deleteStudent(studentId);
            
            if (result.success) {
                this.showToast(`${studentName} deleted successfully`, 'success');
                await this.loadData();
            } else {
                throw new Error(result.error?.message || 'Failed to delete student');
            }
            
        } catch (error) {
            console.error('Error deleting student:', error);
            this.showToast('Failed to delete student', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    filterLogs() {
        this.renderLogs();
    }

    exportLogs() {
        const selectedDate = document.getElementById('logDateFilter').value;
        let filteredLogs = this.pickupLogs;
        
        if (selectedDate) {
            filteredLogs = this.pickupLogs.filter(log => 
                new Date(log.pickup_time).toDateString() === new Date(selectedDate).toDateString()
            );
        }
        
        if (filteredLogs.length === 0) {
            this.showToast('No logs to export', 'warning');
            return;
        }
        
        // Convert to CSV
        const headers = ['Date/Time', 'Student', 'Class', 'Parent', 'Status', 'Notes'];
        const csvContent = [
            headers.join(','),
            ...filteredLogs.map(log => {
                const student = this.students.find(s => s.id === log.student_id);
                return [
                    new Date(log.pickup_time).toLocaleString(),
                    student?.name || 'Unknown',
                    student?.class || '-',
                    log.parent_name || 'N/A',
                    log.status,
                    log.notes || ''
                ].map(field => `"${field}"`).join(',');
            })
        ].join('\n');
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pickup-logs-${selectedDate || 'all'}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showToast('Logs exported successfully', 'success');
    }

    getStatusLabel(status) {
        const labels = {
            'not_called': 'Not Called',
            'called': 'Called',
            'searching': 'Searching',
            'found': 'Ready',
            'ready': 'Ready',
            'picked_up': 'Picked Up'
        };
        return labels[status] || status;
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
        
        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('show');
    }
    
    // Logout function as backup
    logout() {
        try {
            if (window.authSystem && window.authSystem.logout) {
                window.authSystem.logout();
            } else {
                // Fallback logout
                sessionStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect as last resort
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing admin dashboard...');
    
    // Prevent multiple initialization
    if (window.adminDashboard) {
        console.log('Admin dashboard already initialized');
        return;
    }
    
    // Check for required dependencies
    function initializeDashboard() {
        if (window.AuthSystem && window.supabaseManager) {
            console.log('All dependencies loaded, creating AdminDashboard...');
            try {
                window.adminDashboard = new AdminDashboard();
                console.log('AdminDashboard created successfully');
            } catch (error) {
                console.error('Failed to create AdminDashboard:', error);
                alert('Failed to initialize admin dashboard. Please refresh the page.');
            }
        } else {
            console.log('Dependencies not ready:', {
                AuthSystem: !!window.AuthSystem,
                supabaseManager: !!window.supabaseManager
            });
            return false;
        }
        return true;
    }
    
    // Try immediate initialization
    if (!initializeDashboard()) {
        console.log('Retrying initialization in 100ms...');
        // Retry after a short delay
        setTimeout(() => {
            if (!initializeDashboard()) {
                console.log('Retrying initialization in 1000ms...');
                // Final retry after longer delay
                setTimeout(() => {
                    if (!initializeDashboard()) {
                        console.error('Failed to initialize admin dashboard after multiple attempts');
                        alert('System initialization failed. Please refresh the page.');
                    }
                }, 1000);
            }
        }, 100);
    }
}); 