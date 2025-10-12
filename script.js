class TimeTracker {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.totalTime = 0;
        this.tasks = [];
        this.activities = [];
        this.currentTask = null;
        
        this.initializeElements();
        this.bindEvents();
        this.updateCurrentTime();
        this.loadData();
        this.renderTasks();
        this.renderActivities();
        this.updateStats();
        
        // Update current time every second
        setInterval(() => this.updateCurrentTime(), 1000);
    }

    initializeElements() {
        this.timerDisplay = document.getElementById('timerDisplay');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.taskInput = document.getElementById('taskInput');
        this.saveTaskBtn = document.getElementById('saveTaskBtn');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.taskList = document.getElementById('taskList');
        this.activitiesList = document.getElementById('activitiesList');
        this.totalTimeDisplay = document.getElementById('totalTime');
        this.totalTasksDisplay = document.getElementById('totalTasks');
        this.todayTimeDisplay = document.getElementById('todayTime');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.stopBtn.addEventListener('click', () => this.stopTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.saveTaskBtn.addEventListener('click', () => this.saveTask());
        this.addTaskBtn.addEventListener('click', () => this.showTaskInput());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveTask();
        });
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ro-RO');
        this.currentTimeDisplay.textContent = timeString;
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.startTime = Date.now() - this.pausedTime;
            
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.stopBtn.disabled = false;
            this.resetBtn.disabled = true;
            
            this.addActivity('Timer pornit');
            this.timerInterval = setInterval(() => this.updateTimer(), 100);
        }
    }

    pauseTimer() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.pausedTime = Date.now() - this.startTime;
            
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            
            this.addActivity('Timer pus pe pauză');
            clearInterval(this.timerInterval);
        }
    }

    stopTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.isPaused = false;
            
            const sessionTime = this.isPaused ? this.pausedTime : Date.now() - this.startTime;
            this.totalTime += sessionTime;
            
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.stopBtn.disabled = true;
            this.resetBtn.disabled = false;
            
            this.addActivity(`Timer oprit - ${this.formatTime(sessionTime)}`);
            clearInterval(this.timerInterval);
            this.saveData();
            this.updateStats();
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        
        this.timerDisplay.textContent = '00:00:00';
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = true;
        this.resetBtn.disabled = true;
        
        this.addActivity('Timer resetat');
        clearInterval(this.timerInterval);
    }

    updateTimer() {
        if (this.isRunning && !this.isPaused) {
            const elapsed = Date.now() - this.startTime;
            this.timerDisplay.textContent = this.formatTime(elapsed);
        }
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    showTaskInput() {
        this.taskInput.style.display = 'block';
        this.saveTaskBtn.style.display = 'inline-block';
        this.taskInput.focus();
    }

    saveTask() {
        const taskName = this.taskInput.value.trim();
        if (taskName) {
            const task = {
                id: Date.now(),
                name: taskName,
                time: 0,
                completed: false,
                createdAt: new Date()
            };
            
            this.tasks.push(task);
            this.taskInput.value = '';
            this.taskInput.style.display = 'none';
            this.saveTaskBtn.style.display = 'none';
            
            this.renderTasks();
            this.addActivity(`Sarcină adăugată: ${taskName}`);
            this.saveData();
        }
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.renderTasks();
            this.addActivity(`Sarcină ${task.completed ? 'completată' : 'necompletată'}: ${task.name}`);
            this.saveData();
            this.updateStats();
        }
    }

    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = this.tasks[taskIndex];
            this.tasks.splice(taskIndex, 1);
            this.renderTasks();
            this.addActivity(`Sarcină ștearsă: ${task.name}`);
            this.saveData();
            this.updateStats();
        }
    }

    renderTasks() {
        this.taskList.innerHTML = '';
        
        this.tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="timeTracker.toggleTask(${task.id})">
                    <span class="task-name">${task.name}</span>
                    <span class="task-time">${this.formatTime(task.time)}</span>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm btn-danger" onclick="timeTracker.deleteTask(${task.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            this.taskList.appendChild(taskElement);
        });
    }

    addActivity(description) {
        const activity = {
            id: Date.now(),
            description,
            timestamp: new Date()
        };
        
        this.activities.unshift(activity);
        if (this.activities.length > 10) {
            this.activities = this.activities.slice(0, 10);
        }
        
        this.renderActivities();
        this.saveData();
    }

    renderActivities() {
        this.activitiesList.innerHTML = '';
        
        this.activities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.innerHTML = `
                <div class="activity-content">
                    <span class="activity-description">${activity.description}</span>
                    <span class="activity-time">${activity.timestamp.toLocaleTimeString('ro-RO')}</span>
                </div>
            `;
            this.activitiesList.appendChild(activityElement);
        });
    }

    updateStats() {
        const completedTasks = this.tasks.filter(t => t.completed).length;
        this.totalTasksDisplay.textContent = completedTasks;
        this.totalTimeDisplay.textContent = this.formatTime(this.totalTime);
        
        // Calculate today's time (simplified - in real app would filter by date)
        this.todayTimeDisplay.textContent = this.formatTime(this.totalTime);
    }

    saveData() {
        const data = {
            tasks: this.tasks,
            activities: this.activities,
            totalTime: this.totalTime
        };
        localStorage.setItem('timeTrackerData', JSON.stringify(data));
    }

    loadData() {
        const data = localStorage.getItem('timeTrackerData');
        if (data) {
            const parsed = JSON.parse(data);
            this.tasks = parsed.tasks || [];
            this.activities = parsed.activities || [];
            this.totalTime = parsed.totalTime || 0;
        }
    }
}

// Initialize the application
const timeTracker = new TimeTracker();