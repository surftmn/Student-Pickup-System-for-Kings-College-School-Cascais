// Enhanced Email Notifications Management with AI Processing
class EnhancedPickupNotifications {
    constructor() {
        this.notifications = [];
        this.documents = [];
        this.activeFilters = {
            status: 'all',
            priority: 'all',
            isParent: 'all',
            needsId: 'all'
        };
        this.initializeEnhancedNotifications();
        this.startPolling();
    }

    async initializeEnhancedNotifications() {
        await this.loadPickupNotifications();
        this.updateNotificationBadges();
        this.setupEventListeners();
    }

    async loadPickupNotifications() {
        try {
            const { data, error } = await supabase
                .from('pickup_notifications_complete')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.notifications = data || [];
            this.renderPickupNotifications();
        } catch (error) {
            console.error('Error loading pickup notifications:', error);
            this.showToast('Error loading pickup notifications', 'error');
        }
    }

    renderPickupNotifications() {
        const container = document.getElementById('enhancedPickupNotifications');
        if (!container) return;

        const filteredNotifications = this.filterNotifications();

        if (filteredNotifications.length === 0) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-inbox"></i>
                    <p>No pickup notifications match your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="notifications-header">
                <div class="filter-controls">
                    <select id="statusFilter" onchange="enhancedPickupNotifications.updateFilter('status', this.value)">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                    
                    <select id="priorityFilter" onchange="enhancedPickupNotifications.updateFilter('priority', this.value)">
                        <option value="all">All Priority</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="normal">Normal</option>
                    </select>
                    
                    <select id="parentFilter" onchange="enhancedPickupNotifications.updateFilter('isParent', this.value)">
                        <option value="all">All Pickups</option>
                        <option value="true">Parent Pickups</option>
                        <option value="false">Non-Parent Pickups</option>
                    </select>
                    
                    <select id="idFilter" onchange="enhancedPickupNotifications.updateFilter('needsId', this.value)">
                        <option value="all">All ID Status</option>
                        <option value="true">Needs ID Verification</option>
                        <option value="false">No ID Required</option>
                    </select>
                </div>
            </div>
            
            <div class="notifications-list">
                ${filteredNotifications.map(notification => this.renderNotificationCard(notification)).join('')}
            </div>
        `;
    }

    renderNotificationCard(notification) {
        const priorityIcon = this.getPriorityIcon(notification.priority_level);
        const statusBadge = this.getStatusBadge(notification.status);
        const confidenceBadge = this.getConfidenceBadge(notification.confidence_level);
        
        return `
            <div class="enhanced-notification-card priority-${notification.priority_level} ${notification.status}" data-id="${notification.id}">
                <div class="notification-header">
                    <div class="student-info">
                        ${notification.student_photo_url ? `
                            <div class="student-avatar">
                                <img src="${notification.student_photo_url}" alt="${notification.verified_student_name || notification.student_name}">
                            </div>
                        ` : `
                            <div class="student-avatar-placeholder">
                                <i class="fas fa-user"></i>
                            </div>
                        `}
                        <div class="student-details">
                            <h3>${notification.verified_student_name || notification.student_name}
                                ${notification.student_id ? '' : ' <span class="warning-text">⚠️ Not Found</span>'}
                            </h3>
                            <p class="student-class">${notification.verified_student_class || notification.student_class || 'Unknown Class'}</p>
                            <p class="email-from">From: ${notification.sender_email}</p>
                        </div>
                    </div>
                    
                    <div class="notification-badges">
                        ${priorityIcon}
                        ${statusBadge}
                        ${confidenceBadge}
                        ${!notification.is_parent ? '<span class="non-parent-badge">NON-PARENT</span>' : ''}
                        ${notification.requires_id_verification ? '<span class="id-required-badge">ID REQUIRED</span>' : ''}
                    </div>
                </div>

                <div class="pickup-details">
                    <div class="detail-row">
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span><strong>Pickup Time:</strong> ${notification.pickup_time}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-user"></i>
                            <span><strong>Pickup Person:</strong> ${notification.pickup_person}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-item">
                            <i class="fas fa-info-circle"></i>
                            <span><strong>Reason:</strong> ${notification.reason}</span>
                        </div>
                        ${notification.special_instructions ? `
                            <div class="detail-item">
                                <i class="fas fa-sticky-note"></i>
                                <span><strong>Instructions:</strong> ${notification.special_instructions}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${notification.identity_documents && notification.identity_documents.length > 0 ? `
                    <div class="documents-section">
                        <h4><i class="fas fa-id-card"></i> Identity Documents (${notification.identity_documents.length})</h4>
                        <div class="documents-grid">
                            ${notification.identity_documents.map(doc => this.renderDocumentCard(doc)).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="notification-actions">
                    ${notification.status === 'pending' ? `
                        <button class="action-btn approve-btn" onclick="enhancedPickupNotifications.approveNotification(${notification.id})">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="action-btn reject-btn" onclick="enhancedPickupNotifications.rejectNotification(${notification.id})">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    
                    ${notification.status === 'approved' ? `
                        <button class="action-btn progress-btn" onclick="enhancedPickupNotifications.markInProgress(${notification.id})">
                            <i class="fas fa-play"></i> Start Pickup
                        </button>
                    ` : ''}
                    
                    ${notification.status === 'in_progress' ? `
                        <button class="action-btn complete-btn" onclick="enhancedPickupNotifications.completePickup(${notification.id})">
                            <i class="fas fa-check-circle"></i> Complete
                        </button>
                    ` : ''}
                    
                    <button class="action-btn view-btn" onclick="enhancedPickupNotifications.viewOriginalEmail(${notification.id})">
                        <i class="fas fa-envelope"></i> View Email
                    </button>
                    
                    <button class="action-btn notes-btn" onclick="enhancedPickupNotifications.addNotes(${notification.id})">
                        <i class="fas fa-sticky-note"></i> Add Notes
                    </button>
                </div>

                ${notification.notes ? `
                    <div class="admin-notes">
                        <i class="fas fa-comment"></i>
                        <strong>Admin Notes:</strong> ${notification.notes}
                    </div>
                ` : ''}
                
                <div class="timestamp-info">
                    <small>Created: ${new Date(notification.created_at).toLocaleString()}</small>
                    ${notification.approved_at ? `<small>Approved: ${new Date(notification.approved_at).toLocaleString()}</small>` : ''}
                </div>
            </div>
        `;
    }

    renderDocumentCard(doc) {
        return `
            <div class="document-card ${doc.verification_status}">
                <div class="document-preview" onclick="enhancedPickupNotifications.viewDocument('${doc.file_url}')">
                    <img src="${doc.file_url}" alt="${doc.filename}" loading="lazy">
                </div>
                <div class="document-info">
                    <p class="document-name">${doc.person_name || 'Name not detected'}</p>
                    <p class="document-type">${doc.document_type || 'Unknown type'}</p>
                    <div class="document-status ${doc.verification_status}">
                        ${this.getDocumentStatusIcon(doc.verification_status)} ${doc.verification_status}
                    </div>
                    ${doc.appears_valid ? '<span class="valid-badge">✓ Appears Valid</span>' : '<span class="invalid-badge">⚠ Needs Review</span>'}
                </div>
                <div class="document-actions">
                    <button class="verify-btn" onclick="enhancedPickupNotifications.verifyDocument(${doc.id}, 'verified')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="reject-btn" onclick="enhancedPickupNotifications.verifyDocument(${doc.id}, 'rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getPriorityIcon(priority) {
        const icons = {
            urgent: '<i class="fas fa-exclamation-triangle priority-urgent"></i>',
            high: '<i class="fas fa-exclamation priority-high"></i>',
            medium: '<i class="fas fa-minus priority-medium"></i>',
            normal: '<i class="fas fa-circle priority-normal"></i>',
            low: '<i class="fas fa-circle priority-low"></i>'
        };
        return icons[priority] || icons.normal;
    }

    getStatusBadge(status) {
        const badges = {
            pending: '<span class="status-badge pending">Pending</span>',
            approved: '<span class="status-badge approved">Approved</span>',
            in_progress: '<span class="status-badge in-progress">In Progress</span>',
            completed: '<span class="status-badge completed">Completed</span>',
            cancelled: '<span class="status-badge cancelled">Cancelled</span>',
            rejected: '<span class="status-badge rejected">Rejected</span>'
        };
        return badges[status] || badges.pending;
    }

    getConfidenceBadge(confidence) {
        const badges = {
            high: '<span class="confidence-badge high">High Confidence</span>',
            medium: '<span class="confidence-badge medium">Medium</span>',
            low: '<span class="confidence-badge low">Low Confidence</span>'
        };
        return badges[confidence] || badges.medium;
    }

    getDocumentStatusIcon(status) {
        const icons = {
            pending: '<i class="fas fa-clock"></i>',
            verified: '<i class="fas fa-check-circle"></i>',
            rejected: '<i class="fas fa-times-circle"></i>',
            needs_review: '<i class="fas fa-question-circle"></i>'
        };
        return icons[status] || icons.pending;
    }

    filterNotifications() {
        return this.notifications.filter(notification => {
            if (this.activeFilters.status !== 'all' && notification.status !== this.activeFilters.status) {
                return false;
            }
            if (this.activeFilters.priority !== 'all' && notification.priority_level !== this.activeFilters.priority) {
                return false;
            }
            if (this.activeFilters.isParent !== 'all') {
                const isParent = this.activeFilters.isParent === 'true';
                if (notification.is_parent !== isParent) return false;
            }
            if (this.activeFilters.needsId !== 'all') {
                const needsId = this.activeFilters.needsId === 'true';
                if (notification.requires_id_verification !== needsId) return false;
            }
            return true;
        });
    }

    updateFilter(filterType, value) {
        this.activeFilters[filterType] = value;
        this.renderPickupNotifications();
    }

    async approveNotification(notificationId) {
        try {
            const { error } = await supabase
                .from('pickup_email_notifications')
                .update({ 
                    status: 'approved', 
                    approved_at: new Date().toISOString(),
                    approved_by: 'admin' // You can get current user
                })
                .eq('id', notificationId);

            if (error) throw error;

            this.showToast('Pickup notification approved!', 'success');
            await this.loadPickupNotifications();
        } catch (error) {
            console.error('Error approving notification:', error);
            this.showToast('Error approving notification', 'error');
        }
    }

    async rejectNotification(notificationId) {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;

        try {
            const { error } = await supabase
                .from('pickup_email_notifications')
                .update({ 
                    status: 'rejected',
                    notes: reason,
                    approved_by: 'admin'
                })
                .eq('id', notificationId);

            if (error) throw error;

            this.showToast('Pickup notification rejected', 'success');
            await this.loadPickupNotifications();
        } catch (error) {
            console.error('Error rejecting notification:', error);
            this.showToast('Error rejecting notification', 'error');
        }
    }

    async markInProgress(notificationId) {
        try {
            const { error } = await supabase
                .from('pickup_email_notifications')
                .update({ status: 'in_progress' })
                .eq('id', notificationId);

            if (error) throw error;

            this.showToast('Pickup marked as in progress', 'success');
            await this.loadPickupNotifications();
        } catch (error) {
            console.error('Error updating status:', error);
            this.showToast('Error updating status', 'error');
        }
    }

    async completePickup(notificationId) {
        try {
            const { error } = await supabase
                .from('pickup_email_notifications')
                .update({ 
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', notificationId);

            if (error) throw error;

            this.showToast('Pickup completed!', 'success');
            await this.loadPickupNotifications();
        } catch (error) {
            console.error('Error completing pickup:', error);
            this.showToast('Error completing pickup', 'error');
        }
    }

    async verifyDocument(documentId, status) {
        try {
            const notes = status === 'rejected' ? prompt('Reason for rejection:') : '';
            
            const { error } = await supabase
                .from('pickup_documents')
                .update({ 
                    verification_status: status,
                    verified_at: new Date().toISOString(),
                    verified_by: 'admin', // Get current user
                    verification_notes: notes || null
                })
                .eq('id', documentId);

            if (error) throw error;

            this.showToast(`Document ${status}!`, 'success');
            await this.loadPickupNotifications();
        } catch (error) {
            console.error('Error verifying document:', error);
            this.showToast('Error verifying document', 'error');
        }
    }

    viewDocument(fileUrl) {
        window.open(fileUrl, '_blank');
    }

    viewOriginalEmail(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>Original Email - ${notification.student_name}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="email-details">
                        <p><strong>From:</strong> ${notification.sender_email}</p>
                        <p><strong>Subject:</strong> ${notification.original_subject}</p>
                        <p><strong>Processed:</strong> ${new Date(notification.processed_at).toLocaleString()}</p>
                        <p><strong>AI Confidence:</strong> ${notification.confidence_level}</p>
                    </div>
                    <div class="email-content">
                        <h4>Original Email Content:</h4>
                        <div class="original-email-text">
                            ${notification.original_body.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async addNotes(notificationId) {
        const notes = prompt('Add admin notes:');
        if (!notes) return;

        try {
            const { error } = await supabase
                .from('pickup_email_notifications')
                .update({ notes: notes })
                .eq('id', notificationId);

            if (error) throw error;

            this.showToast('Notes added successfully', 'success');
            await this.loadPickupNotifications();
        } catch (error) {
            console.error('Error adding notes:', error);
            this.showToast('Error adding notes', 'error');
        }
    }

    updateNotificationBadges() {
        const pendingCount = this.notifications.filter(n => n.status === 'pending').length;
        const approvedCount = this.notifications.filter(n => n.status === 'approved').length;
        const inProgressCount = this.notifications.filter(n => n.status === 'in_progress').length;
        const completedCount = this.notifications.filter(n => n.status === 'completed').length;
        const highPriorityCount = this.notifications.filter(n => ['high', 'urgent'].includes(n.priority_level)).length;
        const nonParentCount = this.notifications.filter(n => !n.is_parent && n.status === 'pending').length;

        // Update admin dashboard badge
        const badge = document.getElementById('pickupNotificationBadge');
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.style.display = 'inline-block';
                badge.className = highPriorityCount > 0 ? 'notification-badge urgent' : 'notification-badge';
            } else {
                badge.style.display = 'none';
            }
        }

        // Update stat counters in the pickup notifications section
        const pendingEl = document.getElementById('pendingNotifications');
        const approvedEl = document.getElementById('approvedNotifications');
        const inProgressEl = document.getElementById('inProgressNotifications');
        const completedEl = document.getElementById('completedNotifications');

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (approvedEl) approvedEl.textContent = approvedCount;
        if (inProgressEl) inProgressEl.textContent = inProgressCount;
        if (completedEl) completedEl.textContent = completedCount;

        // Update navigation badge if it exists
        const navBadge = document.querySelector('.nav-pickup-badge');
        if (navBadge) {
            navBadge.textContent = nonParentCount;
            navBadge.style.display = nonParentCount > 0 ? 'inline-block' : 'none';
        }
    }

    setupEventListeners() {
        // Set up filter values
        Object.keys(this.activeFilters).forEach(filterType => {
            const select = document.getElementById(`${filterType}Filter`);
            if (select) {
                select.value = this.activeFilters[filterType];
            }
        });
    }

    startPolling() {
        // Poll for new notifications every 30 seconds
        setInterval(() => {
            this.loadPickupNotifications();
        }, 30000);
    }

    showToast(message, type = 'info') {
        // Use existing toast function or create one
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Class is available for manual initialization