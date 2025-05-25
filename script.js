// School Pickup System JavaScriptclass SchoolPickupSystem {    constructor() {        this.students = [];        this.queue = [];        this.isOnline = false;        this.db = window.supabaseManager;                this.initializeEventListeners();        this.updateDateTime();        this.initializeDatabase();                // Update datetime every second        setInterval(() => this.updateDateTime(), 1000);    }    async initializeDatabase() {        this.showToast('Connecting to database...', 'info');                try {            // Test Supabase connection            const connectionTest = await this.db.testConnection();                        if (connectionTest.needsSetup) {                this.showToast('Database setup required - check console for instructions', 'warning');                await this.db.setupDatabase();                return;            }                        if (!connectionTest.success) {                throw new Error('Failed to connect to database');            }                        this.isOnline = true;            this.showToast('Connected! Loading data...', 'success');                        // Load data from Supabase            await this.loadAllData();                        // Setup real-time subscriptions            this.setupRealTimeSubscriptions();                        this.showToast('Real-time sync enabled!', 'success');                    } catch (error) {            console.error('Database initialization failed:', error);            this.isOnline = false;            this.showToast('Offline mode - using local storage', 'warning');                        // Fallback to localStorage            this.loadLocalData();        }    }    async loadAllData() {        try {            // Load students            const studentsResult = await this.db.getStudents();            if (studentsResult.success) {                this.students = studentsResult.data.map(student => ({                    id: student.id,                    name: student.name,                    grade: student.grade,                    parentContact: student.parent_contact                }));            }            // Load pickup queue            const queueResult = await this.db.getPickupQueue();            if (queueResult.success) {                this.queue = queueResult.data.map(item => ({                    id: item.id,                    parentName: item.parent_name,                    students: item.student_ids,                    vehicleInfo: item.vehicle_info,                    specialInstructions: item.special_instructions,                    timestamp: item.timestamp,                    completed: item.completed                }));            }            // If no students exist, offer to load demo data            if (this.students.length === 0) {                this.showDemoDataPrompt();            }            // Render everything            this.renderStudents();            this.renderQueue();            this.renderStudentList();                    } catch (error) {            console.error('Error loading data:', error);            this.showToast('Error loading data from database', 'error');        }    }    loadLocalData() {        this.students = JSON.parse(localStorage.getItem('students') || '[]');        this.queue = JSON.parse(localStorage.getItem('queue') || '[]');                if (this.students.length === 0) {            this.loadDemoData();        }                this.renderStudents();        this.renderQueue();        this.renderStudentList();    }    setupRealTimeSubscriptions() {        // Subscribe to student changes        this.db.subscribeToStudents((payload) => {            console.log('Students updated:', payload);            this.handleStudentUpdate(payload);        });        // Subscribe to pickup queue changes        this.db.subscribeToPickupQueue((payload) => {            console.log('Pickup queue updated:', payload);            this.handleQueueUpdate(payload);        });    }    async handleStudentUpdate(payload) {        // Reload students data and re-render        const studentsResult = await this.db.getStudents();        if (studentsResult.success) {            this.students = studentsResult.data.map(student => ({                id: student.id,                name: student.name,                grade: student.grade,                parentContact: student.parent_contact            }));            this.renderStudents();            this.renderStudentList();        }    }    async handleQueueUpdate(payload) {        // Reload queue data and re-render        const queueResult = await this.db.getPickupQueue();        if (queueResult.success) {            this.queue = queueResult.data.map(item => ({                id: item.id,                parentName: item.parent_name,                students: item.student_ids,                vehicleInfo: item.vehicle_info,                specialInstructions: item.special_instructions,                timestamp: item.timestamp,                completed: item.completed            }));            this.renderQueue();        }    }    showDemoDataPrompt() {        const shouldLoad = confirm('No students found. Would you like to load demo data to get started?');        if (shouldLoad) {            this.loadDemoData();        }    }

        // Initialize all event listeners    initializeEventListeners() {
        // Parent check-in form
        document.getElementById('checkinForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleParentCheckin();
        });

        // Staff interface toggle
        document.getElementById('toggleStaff').addEventListener('click', () => {
            this.toggleStaffPanel();
        });

        // Staff actions
        document.getElementById('addStudent').addEventListener('click', () => {
            this.showAddStudentModal();
        });

        document.getElementById('clearQueue').addEventListener('click', () => {
            this.clearQueue();
        });

        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        // Modal controls
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideAddStudentModal();
        });

        document.getElementById('cancelStudent').addEventListener('click', () => {
            this.hideAddStudentModal();
        });

        document.getElementById('addStudentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStudent();
        });

        // Toast close
        document.getElementById('toastClose').addEventListener('click', () => {
            this.hideToast();
        });

        // Close modal when clicking outside
        document.getElementById('addStudentModal').addEventListener('click', (e) => {
            if (e.target.id === 'addStudentModal') {
                this.hideAddStudentModal();
            }
        });
    }

    // Update date and time display
    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        document.getElementById('datetime').textContent = now.toLocaleDateString('en-US', options);
    }

    // Load demo data for first-time users
    loadDemoData() {
        const demoStudents = [
            { id: 1, name: 'Emma Johnson', grade: '3', parentContact: 'Sarah Johnson - (555) 123-4567' },
            { id: 2, name: 'Liam Smith', grade: 'K', parentContact: 'Michael Smith - (555) 234-5678' },
            { id: 3, name: 'Sophia Davis', grade: '5', parentContact: 'Jennifer Davis - (555) 345-6789' },
            { id: 4, name: 'Noah Wilson', grade: '2', parentContact: 'David Wilson - (555) 456-7890' },
            { id: 5, name: 'Olivia Brown', grade: '4', parentContact: 'Amanda Brown - (555) 567-8901' }
        ];
        
        this.students = demoStudents;
        this.saveData();
        this.renderStudents();
        this.renderStudentList();
        this.showToast('Demo students loaded successfully!', 'success');
    }

    // Handle parent check-in
    handleParentCheckin() {
        const parentName = document.getElementById('parentName').value.trim();
        const vehicleInfo = document.getElementById('vehicleInfo').value.trim();
        const specialInstructions = document.getElementById('specialInstructions').value.trim();
        
        // Get selected students
        const selectedStudents = [];
        const checkboxes = document.querySelectorAll('#studentSelect input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            const studentId = parseInt(checkbox.value);
            const student = this.students.find(s => s.id === studentId);
            if (student) {
                selectedStudents.push(student);
            }
        });

        if (!parentName) {
            this.showToast('Please enter parent name', 'error');
            return;
        }

        if (selectedStudents.length === 0) {
            this.showToast('Please select at least one student', 'error');
            return;
        }

        // Create queue entry
        const queueEntry = {
            id: Date.now(),
            parentName,
            students: selectedStudents,
            vehicleInfo,
            specialInstructions,
            timestamp: new Date().toLocaleTimeString(),
            completed: false
        };

        this.queue.push(queueEntry);
        this.saveData();
        this.renderQueue();
        this.clearCheckinForm();
        
        this.showToast(`${parentName} checked in for ${selectedStudents.length} student(s)`, 'success');
    }

    // Clear the check-in form
    clearCheckinForm() {
        document.getElementById('checkinForm').reset();
        const checkboxes = document.querySelectorAll('#studentSelect input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    // Render student selection checkboxes
    renderStudents() {
        const container = document.getElementById('studentSelect');
        
        if (this.students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate"></i>
                    <p>No students available. Please add students using the staff interface.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.students.map(student => `
            <div class="student-item">
                <input type="checkbox" id="student-${student.id}" value="${student.id}">
                <label for="student-${student.id}">
                    ${student.name} (Grade ${student.grade})
                </label>
            </div>
        `).join('');
    }

    // Render pickup queue
    renderQueue() {
        const container = document.getElementById('queueList');
        const queueCount = document.getElementById('queueCount');
        
        const activeQueue = this.queue.filter(item => !item.completed);
        queueCount.textContent = `${activeQueue.length} parent${activeQueue.length !== 1 ? 's' : ''} waiting`;

        if (this.queue.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No pickups in queue</h3>
                    <p>Parents will appear here when they check in</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.queue.map(item => `
            <div class="queue-item ${item.completed ? 'completed' : ''}">
                <div class="queue-item-header">
                    <div class="queue-item-name">${item.parentName}</div>
                    <div class="queue-item-time">${item.timestamp}</div>
                </div>
                <div class="queue-item-students">
                    ${item.students.map(student => 
                        `<span class="student-tag">${student.name} (${student.grade})</span>`
                    ).join('')}
                </div>
                ${item.vehicleInfo ? `<div><strong>Vehicle:</strong> ${item.vehicleInfo}</div>` : ''}
                ${item.specialInstructions ? `<div><strong>Instructions:</strong> ${item.specialInstructions}</div>` : ''}
                <div class="queue-item-actions">
                    ${!item.completed ? `
                        <button class="btn-complete" onclick="pickupSystem.completePickup(${item.id})">
                            <i class="fas fa-check"></i> Complete Pickup
                        </button>
                    ` : ''}
                    <button class="btn-delete" onclick="pickupSystem.removeFromQueue(${item.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Complete a pickup
    completePickup(queueId) {
        const queueItem = this.queue.find(item => item.id === queueId);
        if (queueItem) {
            queueItem.completed = true;
            this.saveData();
            this.renderQueue();
            this.showToast(`Pickup completed for ${queueItem.parentName}`, 'success');
        }
    }

    // Remove item from queue
    removeFromQueue(queueId) {
        const index = this.queue.findIndex(item => item.id === queueId);
        if (index !== -1) {
            const removed = this.queue.splice(index, 1)[0];
            this.saveData();
            this.renderQueue();
            this.showToast(`Removed ${removed.parentName} from queue`, 'warning');
        }
    }

    // Toggle staff panel visibility
    toggleStaffPanel() {
        const panel = document.getElementById('staffPanel');
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
    }

    // Show add student modal
    showAddStudentModal() {
        const modal = document.getElementById('addStudentModal');
        modal.classList.add('show');
        document.getElementById('studentName').focus();
    }

    // Hide add student modal
    hideAddStudentModal() {
        const modal = document.getElementById('addStudentModal');
        modal.classList.remove('show');
        document.getElementById('addStudentForm').reset();
    }

    // Add new student
    addStudent() {
        const studentName = document.getElementById('studentName').value.trim();
        const studentGrade = document.getElementById('studentGrade').value;
        const parentContact = document.getElementById('parentContact').value.trim();

        if (!studentName || !studentGrade || !parentContact) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const newStudent = {
            id: Date.now(),
            name: studentName,
            grade: studentGrade,
            parentContact: parentContact
        };

        this.students.push(newStudent);
        this.saveData();
        this.renderStudents();
        this.renderStudentList();
        this.hideAddStudentModal();
        this.showToast(`${studentName} added successfully!`, 'success');
    }

    // Render student list for staff management
    renderStudentList() {
        const container = document.getElementById('studentList');
        
        if (this.students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No students registered. Click "Add Student" to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.students.map(student => `
            <div class="student-card">
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-details">Grade ${student.grade} • ${student.parentContact}</div>
                </div>
                <div class="student-actions">
                    <button class="btn-edit" onclick="pickupSystem.editStudent(${student.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="pickupSystem.deleteStudent(${student.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Edit student (placeholder - would need additional modal)
    editStudent(studentId) {
        this.showToast('Edit functionality coming soon!', 'info');
    }

    // Delete student
    deleteStudent(studentId) {
        if (confirm('Are you sure you want to delete this student?')) {
            const index = this.students.findIndex(s => s.id === studentId);
            if (index !== -1) {
                const deleted = this.students.splice(index, 1)[0];
                this.saveData();
                this.renderStudents();
                this.renderStudentList();
                this.showToast(`${deleted.name} deleted successfully`, 'warning');
            }
        }
    }

    // Clear entire queue
    clearQueue() {
        if (confirm('Are you sure you want to clear the entire pickup queue?')) {
            this.queue = [];
            this.saveData();
            this.renderQueue();
            this.showToast('Pickup queue cleared', 'warning');
        }
    }

    // Export data as JSON
    exportData() {
        const data = {
            students: this.students,
            queue: this.queue,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `school-pickup-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('Data exported successfully!', 'success');
    }

    // Show toast notification
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

    // Hide toast notification
    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('show');
    }

    // Save data to localStorage
    saveData() {
        localStorage.setItem('students', JSON.stringify(this.students));
        localStorage.setItem('queue', JSON.stringify(this.queue));
    }

    // Get statistics
    getStatistics() {
        return {
            totalStudents: this.students.length,
            activePickups: this.queue.filter(item => !item.completed).length,
            completedPickups: this.queue.filter(item => item.completed).length,
            totalPickups: this.queue.length
        };
    }
}

// Initialize the system when the page loads
let pickupSystem;

document.addEventListener('DOMContentLoaded', function() {
    pickupSystem = new SchoolPickupSystem();
    
    // Add some keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + A to add student (when staff panel is visible)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            const staffPanel = document.getElementById('staffPanel');
            if (staffPanel.style.display !== 'none') {
                e.preventDefault();
                pickupSystem.showAddStudentModal();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            pickupSystem.hideAddStudentModal();
            pickupSystem.hideToast();
        }
    });
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Export for global access
window.pickupSystem = pickupSystem; 