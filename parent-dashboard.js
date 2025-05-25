// Parent Dashboard JavaScript

class ParentDashboard {
    constructor() {
        this.currentUser = null;
        this.children = [];
        this.selectedChild = null;
        this.db = window.supabaseManager;
        
        this.checkAuthentication();
        this.initializeEventListeners();
        this.updateTime();
        this.loadData();
        
        // Update time every second
        setInterval(() => this.updateTime(), 1000);
        
        // Check for pickup status updates every 10 seconds
        setInterval(() => this.checkPickupStatus(), 10000);
    }

    checkAuthentication() {
        this.currentUser = AuthSystem.requireAuth(['parent']);
        if (!this.currentUser) return;
        
        document.getElementById('userName').textContent = this.currentUser.name;
    }

    initializeEventListeners() {
        // Modal controls
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('cancelModal').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('confirmPickup').addEventListener('click', () => {
            this.confirmPickupRequest();
        });

        // Toast close
        document.getElementById('toastClose').addEventListener('click', () => {
            this.hideToast();
        });

        // Close modal when clicking outside
        document.getElementById('childModal').addEventListener('click', (e) => {
            if (e.target.id === 'childModal') {
                this.hideModal();
            }
        });
    }

    updateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentTime').textContent = now.toLocaleDateString('en-US', options);
    }

    async loadData() {
        try {
            // In a real implementation, this would filter by parent ID
            // For demo, we'll show all students
            const studentsResult = await this.db.getStudents();
            if (studentsResult.success) {
                this.children = studentsResult.data.map(student => ({
                    id: student.id,
                    name: student.name,
                    class: student.class,
                    photo: student.photo_url,
                    status: student.status
                }));
            }

            this.renderChildren();
            this.updatePickupStatus();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading your children', 'error');
        }
    }

    renderChildren() {
        const container = document.getElementById('childrenGrid');
        
        if (this.children.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate"></i>
                    <h3>No Children Found</h3>
                    <p>Please contact the school to register your children.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.children.map(child => `
            <div class="child-card ${child.status === 'called' ? 'called' : ''}" 
                 onclick="parentDashboard.selectChild(${child.id})"
                 data-child-id="${child.id}">
                ${child.status === 'called' ? '<div class="pickup-status">Called</div>' : ''}
                <div class="child-photo">
                    <img src="${child.photo || 'https://via.placeholder.com/120x120/e5e7eb/9ca3af?text=' + child.name.charAt(0)}" 
                         alt="${child.name}">
                </div>
                <div class="child-info">
                    <h4>${child.name}</h4>
                    <p>Class ${child.class}</p>
                </div>
            </div>
        `).join('');
    }

    selectChild(childId) {
        this.selectedChild = this.children.find(child => child.id === childId);
        
        if (!this.selectedChild) return;
        
        // Check if child is already called
        if (this.selectedChild.status === 'called' || this.selectedChild.status === 'searching' || this.selectedChild.status === 'found') {
            this.showToast('This child has already been called for pickup', 'warning');
            return;
        }
        
        this.showModal();
    }

    showModal() {
        if (!this.selectedChild) return;
        
        document.getElementById('modalChildName').textContent = `Request Pickup - ${this.selectedChild.name}`;
        document.getElementById('modalChildDetails').textContent = `${this.selectedChild.name} - Class ${this.selectedChild.class}`;
        document.getElementById('modalChildImage').src = this.selectedChild.photo || 'https://via.placeholder.com/100x100/e5e7eb/9ca3af?text=' + this.selectedChild.name.charAt(0);
        document.getElementById('modalChildImage').alt = this.selectedChild.name;
        
        document.getElementById('childModal').classList.add('show');
    }

    hideModal() {
        document.getElementById('childModal').classList.remove('show');
        this.selectedChild = null;
    }

    async confirmPickupRequest() {
        if (!this.selectedChild) return;
        
        this.showLoading(true);
        
        try {
            // Update student status to 'called' in Supabase
            const { data, error } = await this.db.supabase
                .from('students')
                .update({ status: 'called' })
                .eq('id', this.selectedChild.id);

            if (error) throw error;

            // Update local data
            this.selectedChild.status = 'called';
            
            this.showToast(`${this.selectedChild.name} has been called for pickup!`, 'success');
            this.renderChildren();
            this.updatePickupStatus();
            this.hideModal();
            
        } catch (error) {
            console.error('Error requesting pickup:', error);
            this.showToast('Failed to request pickup. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updatePickupStatus() {
        const calledChildren = this.children.filter(child => 
            child.status === 'called' || child.status === 'searching' || child.status === 'found'
        );
        const statusCard = document.getElementById('statusCard');
        
        if (calledChildren.length === 0) {
            statusCard.className = 'status-card';
            statusCard.innerHTML = `
                <div class="status-content">
                    <i class="fas fa-car"></i>
                    <p>No active pickup requests</p>
                </div>
            `;
        } else {
            statusCard.className = 'status-card active';
            statusCard.innerHTML = `
                <div class="status-content">
                    <i class="fas fa-bell"></i>
                    <p>${calledChildren.length} child${calledChildren.length > 1 ? 'ren' : ''} called for pickup</p>
                    <div style="margin-top: 15px; font-size: 0.9rem; color: #059669;">
                        ${calledChildren.map(child => child.name).join(', ')}
                    </div>
                </div>
            `;
        }
    }

    async checkPickupStatus() {
        // Refresh data from Supabase to check for status updates
        try {
            const studentsResult = await this.db.getStudents();
            if (studentsResult.success) {
                const oldChildren = [...this.children];
                this.children = studentsResult.data.map(student => ({
                    id: student.id,
                    name: student.name,
                    class: student.class,
                    photo: student.photo_url,
                    status: student.status
                }));

                // Check for status changes
                oldChildren.forEach(oldChild => {
                    const newChild = this.children.find(c => c.id === oldChild.id);
                    if (newChild && oldChild.status !== newChild.status && newChild.status === 'picked_up') {
                        this.showToast(`${newChild.name} has been picked up successfully!`, 'success');
                    }
                });

                this.renderChildren();
                this.updatePickupStatus();
            }
        } catch (error) {
            console.error('Error checking pickup status:', error);
        }
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
    window.parentDashboard = new ParentDashboard();
}); 