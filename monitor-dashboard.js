// Monitor Dashboard JavaScript

class MonitorDashboard {
    constructor() {
        this.currentUser = null;
        this.calledChildren = [];
        this.selectedChild = null;
        this.db = window.supabaseManager;
        
        this.checkAuthentication();
        this.initializeEventListeners();
        this.updateTime();
        this.loadData();
        
        // Update time every second
        setInterval(() => this.updateTime(), 1000);
        
        // Check for new called children every 5 seconds
        setInterval(() => this.refreshList(), 5000);
    }

    checkAuthentication() {
        this.currentUser = AuthSystem.requireAuth(['monitor']);
        if (!this.currentUser) return;
        
        document.getElementById('userName').textContent = this.currentUser.name;
    }

    initializeEventListeners() {
        // Child modal controls
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideChildModal();
        });

        document.getElementById('cancelModal').addEventListener('click', () => {
            this.hideChildModal();
        });

        document.getElementById('markFound').addEventListener('click', () => {
            this.markChildAsFound();
        });

        // Help modal controls
        document.getElementById('helpModalClose').addEventListener('click', () => {
            this.hideHelpModal();
        });

        document.getElementById('closeHelp').addEventListener('click', () => {
            this.hideHelpModal();
        });

        // Toast close
        document.getElementById('toastClose').addEventListener('click', () => {
            this.hideToast();
        });

        // Close modals when clicking outside
        document.getElementById('childModal').addEventListener('click', (e) => {
            if (e.target.id === 'childModal') {
                this.hideChildModal();
            }
        });

        document.getElementById('helpModal').addEventListener('click', (e) => {
            if (e.target.id === 'helpModal') {
                this.hideHelpModal();
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
        await this.refreshList();
    }

    async refreshList() {
        try {
            // Load students with status 'called' or 'searching'
            const studentsResult = await this.db.getStudents();
            if (studentsResult.success) {
                this.calledChildren = studentsResult.data.filter(student => 
                    student.status === 'called' || student.status === 'searching'
                ).map(student => ({
                    id: student.id,
                    name: student.name,
                    class: student.class,
                    photo: student.photo_url,
                    parentName: 'Parent', // In real app, get from parent data
                    calledAt: new Date().toLocaleTimeString(),
                    status: student.status === 'called' ? 'searching' : student.status,
                    location: `Class ${student.class} - Location TBD`
                }));
                
                this.renderCalledChildren();
            }
            
        } catch (error) {
            console.error('Error loading called children:', error);
            this.showToast('Error loading called children', 'error');
        }
    }

    renderCalledChildren() {
        const container = document.getElementById('calledChildrenList');
        
        if (this.calledChildren.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <h3>No children have been called yet for today</h3>
                    <p>When parents request pickup, students will appear here for you to locate.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.calledChildren.map(child => `
            <div class="queue-item" onclick="monitorDashboard.viewChildDetails(${child.id})">
                <div class="queue-item-header">
                    <div class="child-info-inline">
                        <div class="child-photo-small">
                            <img src="${child.photo || 'https://via.placeholder.com/60x60/e5e7eb/9ca3af?text=' + child.name.charAt(0)}" 
                                 alt="${child.name}">
                        </div>
                        <div class="child-basic-info">
                            <div class="queue-item-name">${child.name}</div>
                            <div class="child-class">Class ${child.class}</div>
                        </div>
                    </div>
                    <div class="call-info">
                        <div class="queue-item-time">Called at ${child.calledAt}</div>
                        <div class="status-badge ${child.status}">
                            ${child.status === 'searching' ? 'Searching' : 'Found'}
                        </div>
                    </div>
                </div>
                <div class="queue-item-details">
                    <div class="detail-row">
                        <strong>Parent:</strong> ${child.parentName}
                    </div>
                    <div class="detail-row">
                        <strong>Location:</strong> ${child.location}
                    </div>
                </div>
                <div class="queue-item-actions">
                    <button class="btn-success" onclick="event.stopPropagation(); monitorDashboard.quickMarkFound(${child.id})">
                        <i class="fas fa-check"></i> Mark as Found
                    </button>
                    <button class="btn-secondary" onclick="event.stopPropagation(); monitorDashboard.viewChildDetails(${child.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    viewChildDetails(childId) {
        this.selectedChild = this.calledChildren.find(child => child.id === childId);
        
        if (!this.selectedChild) return;
        
        // Populate modal with child details
        document.getElementById('modalChildName').textContent = this.selectedChild.name;
        document.getElementById('modalChildDetails').textContent = `${this.selectedChild.name} - Class ${this.selectedChild.class}`;
        document.getElementById('modalParentName').textContent = this.selectedChild.parentName;
        document.getElementById('modalCallTime').textContent = this.selectedChild.calledAt;
        document.getElementById('modalStatus').textContent = this.selectedChild.status === 'searching' ? 'Searching' : 'Found';
        document.getElementById('modalChildImage').src = this.selectedChild.photo || 'https://via.placeholder.com/100x100/e5e7eb/9ca3af?text=' + this.selectedChild.name.charAt(0);
        document.getElementById('modalChildImage').alt = this.selectedChild.name;
        
        // Show/hide mark found button based on status
        const markFoundBtn = document.getElementById('markFound');
        if (this.selectedChild.status === 'found') {
            markFoundBtn.style.display = 'none';
        } else {
            markFoundBtn.style.display = 'flex';
        }
        
        this.showChildModal();
    }

    async quickMarkFound(childId) {
        const child = this.calledChildren.find(c => c.id === childId);
        if (!child) return;
        
        await this.markChildFoundInternal(child);
    }

    async markChildAsFound() {
        if (!this.selectedChild) return;
        
        await this.markChildFoundInternal(this.selectedChild);
        this.hideChildModal();
    }

    async markChildFoundInternal(child) {
        try {
            // Update student status to 'found' in Supabase
            const { data, error } = await this.db.supabase
                .from('students')
                .update({ status: 'found' })
                .eq('id', child.id);

            if (error) throw error;

            // Update local data
            child.status = 'found';
            
            this.showToast(`${child.name} marked as found!`, 'success');
            this.notifySecurity(child);
            
            // Refresh the list
            await this.refreshList();
            
        } catch (error) {
            console.error('Error marking child as found:', error);
            this.showToast('Failed to mark child as found. Please try again.', 'error');
        }
    }

    notifySecurity(child) {
        // In a real implementation, this would send a notification to security
        console.log(`Notifying security: ${child.name} is ready for pickup`);
        
        // For now, just show a success message
        setTimeout(() => {
            this.showToast(`Security has been notified that ${child.name} is ready for pickup`, 'info');
        }, 1000);
    }

    showChildModal() {
        document.getElementById('childModal').classList.add('show');
    }

    hideChildModal() {
        document.getElementById('childModal').classList.remove('show');
        this.selectedChild = null;
    }

    showHelp() {
        document.getElementById('helpModal').classList.add('show');
    }

    hideHelpModal() {
        document.getElementById('helpModal').classList.remove('show');
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
    window.monitorDashboard = new MonitorDashboard();
}); 