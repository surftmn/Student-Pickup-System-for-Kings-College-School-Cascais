// Security Dashboard JavaScript

class SecurityDashboard {
    constructor() {
        this.currentUser = null;
        this.students = [];
        this.readyForPickup = [];
        this.selectedStudent = null;
        this.db = window.supabaseManager;
        
        this.checkAuthentication();
        this.initializeEventListeners();
        this.updateTime();
        this.loadData();
        this.loadChat();
        
        // Update time every second
        setInterval(() => this.updateTime(), 1000);
        
        // Check for new ready students every 5 seconds
        setInterval(() => this.loadReadyStudents(), 5000);
        
        // Refresh chat every 3 seconds
        setInterval(() => this.loadChat(), 3000);
    }

    checkAuthentication() {
        this.currentUser = AuthSystem.requireAuth(['security']);
        if (!this.currentUser) return;
        
        document.getElementById('userName').textContent = this.currentUser.name;
    }

    initializeEventListeners() {
        // Search functionality
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchStudents();
            }
        });

        // Student modal controls
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideStudentModal();
        });

        document.getElementById('cancelModal').addEventListener('click', () => {
            this.hideStudentModal();
        });

        document.getElementById('markPickedUp').addEventListener('click', () => {
            this.markStudentPickedUp();
        });

        // Toast close
        document.getElementById('toastClose').addEventListener('click', () => {
            this.hideToast();
        });

        // Close modal when clicking outside
        document.getElementById('studentModal').addEventListener('click', (e) => {
            if (e.target.id === 'studentModal') {
                this.hideStudentModal();
            }
        });
    }

    updateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        document.getElementById('currentTime').textContent = now.toLocaleDateString('en-US', options);
    }

    async loadData() {
        try {
            // Load all students from Supabase
            const studentsResult = await this.db.getStudents();
            if (studentsResult.success) {
                this.students = studentsResult.data;
            }
            
            await this.loadReadyStudents();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading student data', 'error');
        }
    }

    async loadReadyStudents() {
        try {
            // Get students with status 'found' or 'ready'
            const readyStudents = this.students.filter(student => 
                student.status === 'found' || student.status === 'ready'
            );
            
            this.readyForPickup = readyStudents;
            this.renderReadyStudents();
            
        } catch (error) {
            console.error('Error loading ready students:', error);
        }
    }

    async searchStudents() {
        const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
        
        if (!searchTerm) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }

        try {
            this.showLoading(true);
            
            // Filter students based on search term
            const results = this.students.filter(student => 
                student.name.toLowerCase().includes(searchTerm) ||
                student.class.toLowerCase().includes(searchTerm)
            );

            this.renderSearchResults(results, searchTerm);
            
        } catch (error) {
            console.error('Error searching students:', error);
            this.showToast('Error searching students', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderSearchResults(results, searchTerm) {
        const container = document.getElementById('searchResults');
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No students found</h3>
                    <p>No students match "${searchTerm}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="search-results-header">
                <h4>Search Results for "${searchTerm}" (${results.length} found)</h4>
            </div>
            ${results.map(student => `
                <div class="queue-item" onclick="securityDashboard.viewStudentDetails(${student.id})">
                    <div class="queue-item-header">
                        <div class="child-info-inline">
                            <div class="child-photo-small">
                                <img src="${student.photo_url || 'https://via.placeholder.com/60x60/e5e7eb/9ca3af?text=' + student.name.charAt(0)}" 
                                     alt="${student.name}">
                            </div>
                            <div class="child-basic-info">
                                <div class="queue-item-name">${student.name}</div>
                                <div class="child-class">Class ${student.class}</div>
                            </div>
                        </div>
                        <div class="call-info">
                            <div class="status-badge ${student.status}">
                                ${this.getStatusLabel(student.status)}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    renderReadyStudents() {
        const container = document.getElementById('pickupQueueList');
        
        if (this.readyForPickup.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No students ready for pickup</h3>
                    <p>Students will appear here when monitors mark them as found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.readyForPickup.map(student => `
            <div class="queue-item priority" onclick="securityDashboard.viewStudentDetails(${student.id})">
                <div class="queue-item-header">
                    <div class="child-info-inline">
                        <div class="child-photo-small">
                            <img src="${student.photo_url || 'https://via.placeholder.com/60x60/e5e7eb/9ca3af?text=' + student.name.charAt(0)}" 
                                 alt="${student.name}">
                        </div>
                        <div class="child-basic-info">
                            <div class="queue-item-name">${student.name}</div>
                            <div class="child-class">Class ${student.class}</div>
                        </div>
                    </div>
                    <div class="call-info">
                        <div class="status-badge found">Ready</div>
                        <div class="queue-item-time">Found by monitor</div>
                    </div>
                </div>
                <div class="queue-item-actions">
                    <button class="btn-success" onclick="event.stopPropagation(); securityDashboard.quickMarkPickup(${student.id})">
                        <i class="fas fa-check-circle"></i> Complete Pickup
                    </button>
                    <button class="btn-secondary" onclick="event.stopPropagation(); securityDashboard.viewStudentDetails(${student.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewStudentDetails(studentId) {
        this.selectedStudent = this.students.find(student => student.id === studentId);
        
        if (!this.selectedStudent) return;
        
        // Populate modal with student details
        document.getElementById('modalStudentName').textContent = this.selectedStudent.name;
        document.getElementById('modalStudentDetails').textContent = `${this.selectedStudent.name} - Class ${this.selectedStudent.class}`;
        document.getElementById('modalStudentClass').textContent = this.selectedStudent.class;
        document.getElementById('modalStudentStatus').textContent = this.getStatusLabel(this.selectedStudent.status);
        document.getElementById('modalLastUpdated').textContent = new Date().toLocaleTimeString();
        document.getElementById('modalStudentImage').src = this.selectedStudent.photo_url || 'https://via.placeholder.com/100x100/e5e7eb/9ca3af?text=' + this.selectedStudent.name.charAt(0);
        document.getElementById('modalStudentImage').alt = this.selectedStudent.name;
        
        // Show/hide pickup button based on status
        const pickupBtn = document.getElementById('markPickedUp');
        if (this.selectedStudent.status === 'found' || this.selectedStudent.status === 'ready') {
            pickupBtn.style.display = 'flex';
        } else {
            pickupBtn.style.display = 'none';
        }
        
        this.showStudentModal();
    }

    async quickMarkPickup(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;
        
        await this.markPickupInternal(student);
    }

    async markStudentPickedUp() {
        if (!this.selectedStudent) return;
        
        await this.markPickupInternal(this.selectedStudent);
        this.hideStudentModal();
    }

    async markPickupInternal(student) {
        this.showLoading(true);
        
        try {
            // Update student status to 'picked_up'
            const { data, error } = await this.db.supabase
                .from('students')
                .update({ status: 'picked_up' })
                .eq('id', student.id);

            if (error) throw error;

            // Add to pickup log
            await this.db.addPickupLog({
                student_id: student.id,
                parent_name: 'Parent', // In real app, get from parent data
                pickup_time: new Date().toISOString(),
                status: 'completed',
                notes: 'Completed by security'
            });

            // Update local data
            student.status = 'picked_up';
            
            this.showToast(`${student.name} pickup completed!`, 'success');
            this.loadReadyStudents();
            
            // Send chat notification
            await this.sendSystemMessage(`${student.name} (Class ${student.class}) has been picked up successfully.`);
            
        } catch (error) {
            console.error('Error marking pickup:', error);
            this.showToast('Failed to complete pickup. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadChat() {
        try {
            const result = await this.db.getChatMessages(20);
            if (result.success) {
                this.renderChatMessages(result.data.reverse()); // Reverse to show newest at bottom
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        }
    }

    renderChatMessages(messages) {
        const container = document.getElementById('chatMessages');
        
        container.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.user_role}">
                <div class="message-header">
                    <span class="user-name">${msg.user_name}</span>
                    <span class="user-role">(${msg.user_role})</span>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${msg.message}</div>
            </div>
        `).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        try {
            await this.db.sendChatMessage({
                user_role: 'security',
                user_name: this.currentUser.name,
                message: message
            });
            
            input.value = '';
            await this.loadChat();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    async sendSystemMessage(message) {
        try {
            await this.db.sendChatMessage({
                user_role: 'system',
                user_name: 'Security System',
                message: message
            });
        } catch (error) {
            console.error('Error sending system message:', error);
        }
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

    showStudentModal() {
        document.getElementById('studentModal').classList.add('show');
    }

    hideStudentModal() {
        document.getElementById('studentModal').classList.remove('show');
        this.selectedStudent = null;
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
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.securityDashboard = new SecurityDashboard();
}); 