// ===== Tasks/Checklist =====
const PRIORITY_ICONS = { alta: '🔴', media: '🟡', normal: '⚪' };
const PRIORITY_ORDER = ['alta', 'media', 'normal'];

function ensureTaskFields(task, index) {
    if (!task.priority) task.priority = 'normal';
    if (task.dueDate === undefined) task.dueDate = null;
    if (task.order === undefined) task.order = index;
    return task;
}

function renderTasks(project) {
    const tasksList = document.getElementById('tasks-list');

    if (!project.tasks || project.tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="tasks-empty">
                <p>No hay tareas aún</p>
            </div>
        `;
        return;
    }

    // Ensure all tasks have new fields
    project.tasks.forEach((t, i) => ensureTaskFields(t, i));

    tasksList.innerHTML = project.tasks.map((task, index) => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-index="${index}">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span class="task-priority-select" onclick="cycleTaskPriority('${project.id}', ${index})" title="Prioridad: ${task.priority}">${PRIORITY_ICONS[task.priority] || '⚪'}</span>
            <input type="text" class="task-text" value="${escapeHtml(task.text)}" onblur="updateTaskText(${index}, this.value)" placeholder="Describe la tarea...">
            <input type="date" class="task-date-input" value="${task.dueDate || ''}" onchange="updateTaskDate(${index}, this.value)" title="Fecha límite">
            <button class="btn-delete-task" onclick="deleteTask(${index})" title="Eliminar tarea">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function addTask() {
    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
    if (projectIndex === -1) return;

    if (!projects[projectIndex].tasks) {
        projects[projectIndex].tasks = [];
    }

    projects[projectIndex].tasks.push({
        text: '',
        completed: false,
        priority: 'normal',
        dueDate: null,
        order: projects[projectIndex].tasks.length
    });

    saveProjects();
    renderTasks(projects[projectIndex]);

    setTimeout(() => {
        const inputs = document.querySelectorAll('.task-item .task-text');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }, 50);
}

function toggleTask(index) {
    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    projects[projectIndex].tasks[index].completed = !projects[projectIndex].tasks[index].completed;
    saveProjects();
    renderTasks(projects[projectIndex]);
    renderKanban();
}

function updateTaskText(index, text) {
    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    projects[projectIndex].tasks[index].text = text;
    saveProjects();
}

function updateTaskDate(index, date) {
    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    projects[projectIndex].tasks[index].dueDate = date || null;
    saveProjects();

    if (window.GCal && date) {
        window.GCal.syncTaskToCalendar(projects[projectIndex].tasks[index], projects[projectIndex]);
    }
}

function cycleTaskPriority(projectId, taskIndex) {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    const task = projects[projectIndex].tasks[taskIndex];
    ensureTaskFields(task, taskIndex);
    const currentIdx = PRIORITY_ORDER.indexOf(task.priority);
    task.priority = PRIORITY_ORDER[(currentIdx + 1) % PRIORITY_ORDER.length];
    saveProjects();

    // Re-render based on context
    if (currentView === 'tasks') {
        renderTasksView();
    } else {
        renderTasks(projects[projectIndex]);
    }
}

function deleteTask(index) {
    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    projects[projectIndex].tasks.splice(index, 1);
    saveProjects();
    renderTasks(projects[projectIndex]);
    renderKanban();
}


// ===== Aggregate Tasks View (v3.0) =====
function renderTasksView() {
    const board = document.getElementById('tasks-board');
    const countEl = document.getElementById('tasks-view-count');
    const filterProject = document.getElementById('tasks-filter-project').value;
    const filterPriority = document.getElementById('tasks-filter-priority').value;
    const filterPending = document.getElementById('tasks-filter-pending').checked;

    // Populate project filter dropdown (preserve selection)
    const projectSelect = document.getElementById('tasks-filter-project');
    const prevVal = projectSelect.value;
    const activeProjects = projects.filter(p => p.status !== 'terminado');

    // Only rebuild options if list changed
    const optionIds = [...projectSelect.options].map(o => o.value).filter(v => v !== 'all');
    const projectIds = activeProjects.map(p => p.id);
    if (JSON.stringify(optionIds) !== JSON.stringify(projectIds)) {
        projectSelect.innerHTML = '<option value="all">Todos los proyectos</option>' +
            activeProjects.map(p => `<option value="${p.id}">${escapeHtml(p.nombre || p.id)}</option>`).join('');
        projectSelect.value = prevVal;
    }

    // Gather tasks from active projects
    let totalTasks = 0;
    const projectsWithTasks = activeProjects
        .filter(p => filterProject === 'all' || p.id === filterProject)
        .map(project => {
            if (!project.tasks) project.tasks = [];
            project.tasks.forEach((t, i) => ensureTaskFields(t, i));

            let tasks = [...project.tasks];

            if (filterPriority !== 'all') {
                tasks = tasks.filter(t => t.priority === filterPriority);
            }
            if (filterPending) {
                tasks = tasks.filter(t => !t.completed);
            }

            // Sort by order
            tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

            totalTasks += tasks.length;
            return { project, tasks };
        })
        .filter(g => g.tasks.length > 0);

    countEl.textContent = `${totalTasks} tarea${totalTasks !== 1 ? 's' : ''}`;

    if (projectsWithTasks.length === 0) {
        board.innerHTML = `
            <div class="tasks-view-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <p>No hay tareas que mostrar</p>
                <p class="hint">Agrega tareas desde los detalles de cada proyecto</p>
            </div>
        `;
        return;
    }

    board.innerHTML = projectsWithTasks.map(({ project, tasks }) => {
        const sColor = getServiceColor(project.tipo);
        const completedCount = tasks.filter(t => t.completed).length;

        const tasksHtml = tasks.map((task, filteredIdx) => {
            // Find original index in project.tasks
            const origIdx = project.tasks.indexOf(task);
            const priorityIcon = PRIORITY_ICONS[task.priority] || '⚪';
            const dueBadge = formatDueBadge(task.dueDate);

            return `
                <div class="task-board-item ${task.completed ? 'completed' : ''}"
                     data-project-id="${project.id}"
                     data-task-index="${origIdx}"
                     data-priority="${task.priority}"
                     draggable="true">
                    <span class="task-drag-handle" title="Arrastrar para reordenar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                        </svg>
                    </span>
                    <span class="task-priority-badge ${task.priority}"
                          onclick="cycleTaskPriorityFromBoard('${project.id}', ${origIdx})"
                          title="Prioridad: ${task.priority}">${priorityIcon}</span>
                    <input type="checkbox" ${task.completed ? 'checked' : ''}
                           onchange="toggleTaskFromBoard('${project.id}', ${origIdx})">
                    <span class="task-board-text">${escapeHtml(task.text) || '<em>Sin descripción</em>'}</span>
                    ${dueBadge}
                </div>
            `;
        }).join('');

        return `
            <div class="task-group" data-project-id="${project.id}">
                <div class="task-group-header" onclick="toggleTaskGroup(this)">
                    <span class="task-group-toggle">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </span>
                    <span class="task-group-badge" style="background:${sColor.bg};color:${sColor.border}">${project.tipo || 'General'}</span>
                    <span class="task-group-name">${escapeHtml(project.nombre || project.id)}</span>
                    <span class="task-group-status">${completedCount}/${tasks.length} ✓</span>
                </div>
                <div class="task-group-items">
                    ${tasksHtml}
                </div>
            </div>
        `;
    }).join('');

    // Attach drag events for task reordering
    initTaskDragReorder();
}

function formatDueBadge(dueDate) {
    if (!dueDate) return '';
    const due = new Date(dueDate + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    let cls = '';
    if (diffDays < 0) cls = 'overdue';
    else if (diffDays <= 3) cls = 'soon';

    const label = due.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `<span class="task-due-badge ${cls}" title="${dueDate}">${label}</span>`;
}

function toggleTaskGroup(headerEl) {
    headerEl.closest('.task-group').classList.toggle('collapsed');
}

function toggleTaskFromBoard(projectId, taskIndex) {
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    projects[projectIndex].tasks[taskIndex].completed = !projects[projectIndex].tasks[taskIndex].completed;
    saveProjects();
    renderTasksView();
    renderKanban();
}

function cycleTaskPriorityFromBoard(projectId, taskIndex) {
    // Same as cycleTaskPriority but doesn't try to render modal tasks
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1 || !projects[projectIndex].tasks) return;

    const task = projects[projectIndex].tasks[taskIndex];
    ensureTaskFields(task, taskIndex);
    const currentIdx = PRIORITY_ORDER.indexOf(task.priority);
    task.priority = PRIORITY_ORDER[(currentIdx + 1) % PRIORITY_ORDER.length];
    saveProjects();
    renderTasksView();
}

// ===== Task Drag-to-Reorder =====
let draggedTaskEl = null;

function initTaskDragReorder() {
    const items = document.querySelectorAll('.task-board-item[draggable="true"]');

    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedTaskEl = item;
            item.classList.add('dragging-task');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); // required for Firefox
        });

        item.addEventListener('dragend', () => {
            if (draggedTaskEl) {
                draggedTaskEl.classList.remove('dragging-task');
            }
            draggedTaskEl = null;
            document.querySelectorAll('.drag-over-above, .drag-over-below').forEach(el => {
                el.classList.remove('drag-over-above', 'drag-over-below');
            });
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedTaskEl || draggedTaskEl === item) return;
            // Only allow reorder within same project
            if (draggedTaskEl.dataset.projectId !== item.dataset.projectId) return;

            e.dataTransfer.dropEffect = 'move';
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            item.classList.remove('drag-over-above', 'drag-over-below');
            if (e.clientY < midY) {
                item.classList.add('drag-over-above');
            } else {
                item.classList.add('drag-over-below');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over-above', 'drag-over-below');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedTaskEl || draggedTaskEl === item) return;
            if (draggedTaskEl.dataset.projectId !== item.dataset.projectId) return;

            const projectId = item.dataset.projectId;
            const projectIndex = projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) return;

            const fromIdx = parseInt(draggedTaskEl.dataset.taskIndex);
            let toIdx = parseInt(item.dataset.taskIndex);

            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertAfter = e.clientY >= midY;

            // Remove task from old position
            const [movedTask] = projects[projectIndex].tasks.splice(fromIdx, 1);

            // Recalculate toIdx after splice
            if (fromIdx < toIdx) toIdx--;
            if (insertAfter) toIdx++;

            projects[projectIndex].tasks.splice(toIdx, 0, movedTask);

            // Update order field
            projects[projectIndex].tasks.forEach((t, i) => t.order = i);

            saveProjects();
            renderTasksView();
        });
    });
}


