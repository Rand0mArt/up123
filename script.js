// ===== Kanban App v3.0 =====
let projects = [];
console.log('Kanban Layout v3.0 - Loaded');

let currentProjectId = null;
let pendingTerminadoProjectId = null;
let currentView = 'kanban';
let isEditMode = false;
let profitChart = null;

// ===== Service Color Identity =====
const SERVICE_COLORS = {
    'Mural': { bg: 'rgba(194,120,48,0.15)', border: '#c27830', label: '#c27830' },
    'Obra Original': { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', label: '#8b5cf6' },
    'Tattoo': { bg: 'rgba(236,72,153,0.15)', border: '#ec4899', label: '#ec4899' },
    'Ilustración': { bg: 'rgba(34,211,238,0.15)', border: '#22d3ee', label: '#22d3ee' },
    'Diseño': { bg: 'rgba(232,62,140,0.15)', border: '#e83e8c', label: '#e83e8c' },
    'Fotografía': { bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', label: '#fbbf24' },
    'Video': { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', label: '#ef4444' },
    'Merch': { bg: 'rgba(16,185,129,0.15)', border: '#10b981', label: '#10b981' },
    'Producto': { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', label: '#6366f1' },
    'Otro': { bg: 'rgba(161,161,166,0.15)', border: '#a1a1a6', label: '#a1a1a6' }
};

function getServiceColor(tipo) {
    return SERVICE_COLORS[tipo] || SERVICE_COLORS['Otro'];
}

// DOM References
const projectForm = document.getElementById('project-form');
const modalOverlay = document.getElementById('modal-overlay');
const detailModalOverlay = document.getElementById('detail-modal-overlay');
const conclusionModalOverlay = document.getElementById('conclusion-modal-overlay');
const conclusionForm = document.getElementById('conclusion-form');

let calendarDate = new Date();

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        projects = await DB.fetchProjects();
        console.log(`✅ ${projects.length} proyectos cargados`);
    } catch (e) {
        console.error('Error cargando proyectos:', e);
        alert('Error conectando a la base de datos: ' + e.message);
    }
    renderKanban();
    updateCounts();
    initDragAndDrop();
    initViewToggle();
    setTodayAsDefault();
});

function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    const fechaInicio = document.getElementById('fecha-inicio');
    const fechaConclusion = document.getElementById('fecha-conclusion');
    if (fechaInicio && !fechaInicio.value) fechaInicio.value = today;
    if (fechaConclusion && !fechaConclusion.value) fechaConclusion.value = today;
}

// ===== View Toggle =====
function initViewToggle() {
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            currentView = view;

            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.getElementById('kanban-board').style.display = view === 'kanban' ? 'grid' : 'none';
            document.getElementById('history-view').style.display = view === 'history' ? 'block' : 'none';
            document.getElementById('calendar-view').style.display = view === 'calendar' ? 'block' : 'none';
            document.getElementById('analytics-view').style.display = view === 'analytics' ? 'flex' : 'none';
            document.getElementById('tasks-view').style.display = view === 'tasks' ? 'block' : 'none';

            if (view === 'history') renderHistory();
            if (view === 'calendar') renderCalendar();
            if (view === 'analytics') renderAnalytics();
            if (view === 'tasks') renderTasksView();
        });
    });
}

// ===== Drag and Drop =====
function initDragAndDrop() {
    const dropZones = document.querySelectorAll('.column-cards');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragenter', handleDragEnter);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.column-cards').forEach(zone => {
        zone.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const column = e.currentTarget;
    const draggingCard = document.querySelector('.dragging');
    const afterElement = getDragAfterElement(column, e.clientY);

    if (draggingCard) {
        if (afterElement == null) {
            column.appendChild(draggingCard);
        } else {
            column.insertBefore(draggingCard, afterElement);
        }
    }
}

function getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.project-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const projectId = e.dataTransfer.getData('text/plain');
    const column = e.currentTarget;
    const newStatus = column.closest('.kanban-column').dataset.status;

    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    const currentStatus = projects[projectIndex].status;

    if (newStatus === 'terminado' && currentStatus !== 'terminado') {
        pendingTerminadoProjectId = projectId;
        openConclusionModal();
    } else {
        projects[projectIndex].status = newStatus;

        const cardIds = [...column.querySelectorAll('.project-card')].map(card => card.dataset.id);
        cardIds.forEach((id, index) => {
            const proj = projects.find(p => p.id === id);
            if (proj) proj.order = index;
        });

        saveProjects();
        renderKanban();
        updateCounts();
    }
}

// ===== Modal Functions =====
function openModal() {
    setTodayAsDefault();
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    projectForm.reset();
}

function openDetailModal(id) {
    currentProjectId = id;
    isEditMode = false;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('detail-title').textContent = project.nombre;

    document.getElementById('detail-content').style.display = 'block';
    document.getElementById('tasks-section').style.display = 'block';
    document.getElementById('edit-form').style.display = 'none';
    document.getElementById('detail-actions').style.display = 'flex';
    document.getElementById('edit-btn').classList.remove('active');

    renderDetailContent(project);
    renderTasks(project);

    detailModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderDetailContent(project) {
    const content = document.getElementById('detail-content');
    let conclusionHtml = '';
    let deadlineHtml = '';

    // Deadline status
    const deadlineStatus = getDeadlineStatus(project);
    if (deadlineStatus && project.status !== 'terminado') {
        const colorMap = { urgent: 'var(--danger)', warning: '#f59e0b', safe: 'var(--success)' };
        const bgMap = { urgent: 'rgba(239, 68, 68, 0.1)', warning: 'rgba(245, 158, 11, 0.1)', safe: 'rgba(16, 185, 129, 0.1)' };
        deadlineHtml = `
            <div class="detail-row" style="background: ${bgMap[deadlineStatus.level]}; margin: -24px -24px 16px; padding: 12px 24px; border-radius: 8px 8px 0 0;">
                <span class="detail-label" style="color: ${colorMap[deadlineStatus.level]}; font-weight: 600;">${deadlineStatus.icon} ${deadlineStatus.message}</span>
                <span class="detail-value"></span>
            </div>
        `;
    }

    // Conclusion section for completed projects
    if (project.status === 'terminado' && project.conclusion) {
        const utilidad = parseFloat(project.utilidad) || 0;
        const gastos = parseFloat(project.gastos) || 0;
        const utilColor = utilidad >= 0 ? 'var(--success)' : 'var(--danger)';
        const utilSign = utilidad >= 0 ? '+' : '';

        conclusionHtml = `
            <div class="detail-row" style="background: rgba(139, 92, 246, 0.1); margin: -24px -24px 10px; padding: 15px 24px; border-radius: 8px 8px 0 0;">
                <span class="detail-label" style="color: var(--terminado); font-weight: 600;">✓ CONCLUSIÓN</span>
                <span class="detail-value"></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Fecha conclusión</span>
                <span class="detail-value">${project.conclusion.fecha || '-'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">💰 Gasto total</span>
                <span class="detail-value" style="font-weight: 600;">$${gastos.toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">📊 Utilidad</span>
                <span class="detail-value" style="color: ${utilColor}; font-weight: 700; font-size: 16px;">${utilSign}$${utilidad.toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Calificación</span>
                <span class="detail-value">${getStars(project.conclusion.calificacion)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Notas finales</span>
                <span class="detail-value">${project.conclusion.notas || '-'}</span>
            </div>
            ${project.conclusion.linkResultado ? `
            <div class="detail-row">
                <span class="detail-label">Resultado</span>
                <span class="detail-value"><a href="${project.conclusion.linkResultado}" target="_blank" rel="noopener">Ver resultado</a></span>
            </div>
            ` : ''}
            <div class="detail-row" style="border-top: 2px solid var(--border); margin-top: 10px; padding-top: 15px;">
                <span class="detail-label" style="font-weight: 600;">PROYECTO</span>
                <span class="detail-value"></span>
            </div>
        `;
    }

    content.innerHTML = `
        ${deadlineHtml}
        ${conclusionHtml}
        <div class="detail-row">
            <span class="detail-label">Tipo</span>
            <span class="detail-value">${project.tipo || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Artista</span>
            <span class="detail-value">${project.artista || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Cliente</span>
            <span class="detail-value">${project.cliente || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Contacto</span>
            <span class="detail-value">${project.contacto || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Ubicación</span>
            <span class="detail-value">${project.ubicacion || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Formato</span>
            <span class="detail-value">${project.formato || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Medidas</span>
            <span class="detail-value">${project.medidas || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Presupuesto</span>
            <span class="detail-value">${project.presupuesto ? '$' + parseFloat(project.presupuesto).toLocaleString() : '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha inicio</span>
            <span class="detail-value">${project.fechaInicio || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha fin</span>
            <span class="detail-value">${project.fechaFin || '-'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Contexto</span>
            <span class="detail-value">${project.contexto || '-'}</span>
        </div>
        ${project.driveLink ? `
        <div class="detail-row">
            <span class="detail-label">Google Drive</span>
            <span class="detail-value"><a href="${project.driveLink}" target="_blank" rel="noopener">Abrir enlace</a></span>
        </div>
        ` : ''}
    `;
}

function getStars(rating) {
    if (!rating) return '-';
    const stars = '⭐'.repeat(parseInt(rating));
    const labels = { '5': 'Excelente', '4': 'Muy bueno', '3': 'Bueno', '2': 'Regular', '1': 'Malo' };
    return `${stars} ${labels[rating] || ''}`;
}

function closeDetailModal() {
    detailModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    currentProjectId = null;
    isEditMode = false;
}

function openConclusionModal() {
    setTodayAsDefault();
    // Show presupuesto hint if available
    if (pendingTerminadoProjectId) {
        const project = projects.find(p => p.id === pendingTerminadoProjectId);
        const hint = document.getElementById('presupuesto-hint');
        if (project && project.presupuesto && hint) {
            hint.textContent = `Presupuesto del proyecto: $${parseFloat(project.presupuesto).toLocaleString()}`;
            hint.style.color = 'var(--text-muted)';
        }
    }
    conclusionModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeConclusionModal() {
    conclusionModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    conclusionForm.reset();
    pendingTerminadoProjectId = null;
}

function cancelConclusion() {
    closeConclusionModal();
    renderKanban();
}

// ===== Edit Mode =====
function toggleEditMode() {
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    isEditMode = !isEditMode;

    if (isEditMode) {
        document.getElementById('detail-content').style.display = 'none';
        document.getElementById('tasks-section').style.display = 'none';
        document.getElementById('edit-form').style.display = 'block';
        document.getElementById('detail-actions').style.display = 'none';
        document.getElementById('edit-btn').classList.add('active');

        document.getElementById('edit-nombre').value = project.nombre || '';
        document.getElementById('edit-tipo').value = project.tipo || '';
        document.getElementById('edit-artista').value = project.artista || '';
        document.getElementById('edit-cliente').value = project.cliente || '';
        document.getElementById('edit-contacto').value = project.contacto || '';
        document.getElementById('edit-ubicacion').value = project.ubicacion || '';
        document.getElementById('edit-formato').value = project.formato || '';
        document.getElementById('edit-medidas').value = project.medidas || '';
        document.getElementById('edit-presupuesto').value = project.presupuesto || '';
        document.getElementById('edit-fecha-inicio').value = project.fechaInicio || '';
        document.getElementById('edit-fecha-fin').value = project.fechaFin || '';
        document.getElementById('edit-contexto').value = project.contexto || '';
        document.getElementById('edit-drive-link').value = project.driveLink || '';

        // Show/populate conclusion fields for terminado projects
        const conclusionSection = document.getElementById('edit-conclusion-section');
        if (project.status === 'terminado') {
            conclusionSection.style.display = 'block';
            // Populate fecha de conclusión (what history displays)
            const fechaConc = project.conclusion?.fecha || project.completedAt || '';
            document.getElementById('edit-fecha-conclusion').value = fechaConc ? fechaConc.substring(0, 10) : '';
            document.getElementById('edit-gastos').value = project.gastos || '';
            document.getElementById('edit-calificacion').value = project.conclusion?.calificacion || '';
            document.getElementById('edit-notas-conclusion').value = project.conclusion?.notas || '';
            document.getElementById('edit-link-resultado').value = project.conclusion?.linkResultado || '';
        } else {
            conclusionSection.style.display = 'none';
        }
    } else {
        cancelEdit();
    }
}

function cancelEdit() {
    isEditMode = false;
    document.getElementById('detail-content').style.display = 'block';
    document.getElementById('tasks-section').style.display = 'block';
    document.getElementById('edit-form').style.display = 'none';
    document.getElementById('detail-actions').style.display = 'flex';
    document.getElementById('edit-btn').classList.remove('active');
}

function saveProjectEdits(event) {
    event.preventDefault();

    const projectIndex = projects.findIndex(p => p.id === currentProjectId);
    if (projectIndex === -1) return;

    const formData = new FormData(document.getElementById('edit-form'));

    projects[projectIndex] = {
        ...projects[projectIndex],
        nombre: formData.get('nombre'),
        tipo: formData.get('tipo'),
        artista: formData.get('artista'),
        cliente: formData.get('cliente'),
        contacto: formData.get('contacto'),
        ubicacion: formData.get('ubicacion'),
        formato: formData.get('formato'),
        medidas: formData.get('medidas'),
        presupuesto: formData.get('presupuesto'),
        fechaInicio: formData.get('fecha-inicio'),
        fechaFin: formData.get('fecha-fin'),
        contexto: formData.get('contexto'),
        driveLink: formData.get('drive-link')
    };

    // Save conclusion fields for terminado projects
    if (projects[projectIndex].status === 'terminado') {
        const gastos = parseFloat(formData.get('gastos')) || 0;
        const presupuesto = parseFloat(projects[projectIndex].presupuesto) || 0;
        projects[projectIndex].gastos = gastos;
        projects[projectIndex].utilidad = presupuesto - gastos;

        if (!projects[projectIndex].conclusion) {
            projects[projectIndex].conclusion = {};
        }
        const fechaConclusionVal = formData.get('fecha-conclusion') || '';
        projects[projectIndex].conclusion.fecha = fechaConclusionVal;
        projects[projectIndex].completedAt = fechaConclusionVal;
        projects[projectIndex].conclusion.calificacion = formData.get('calificacion') || '';
        projects[projectIndex].conclusion.notas = formData.get('notas-conclusion') || '';
        projects[projectIndex].conclusion.linkResultado = formData.get('link-resultado') || '';
    }

    saveProjects();

    if (window.GCal) {
        window.GCal.syncProjectToCalendar(projects[projectIndex]);
    }

    document.getElementById('detail-title').textContent = projects[projectIndex].nombre;
    renderDetailContent(projects[projectIndex]);
    renderTasks(projects[projectIndex]);
    cancelEdit();
    renderKanban();
    renderHistory();
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// ===== Deadline Functions (v2.0 — 3 levels) =====
function getDeadlineStatus(project) {
    if (!project.fechaFin || project.status === 'terminado') return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(project.fechaFin);
    deadline.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { level: 'urgent', icon: '🔴', message: `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`, days: diffDays };
    } else if (diffDays <= 2) {
        return { level: 'urgent', icon: '🔴', message: `${diffDays === 0 ? 'Vence hoy' : `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`}`, days: diffDays };
    } else if (diffDays <= 6) {
        return { level: 'warning', icon: '🟡', message: `Vence en ${diffDays} días`, days: diffDays };
    } else {
        return { level: 'safe', icon: '🟢', message: `${diffDays} días restantes`, days: diffDays };
    }
}

function getTaskProgress(project) {
    if (!project.tasks || project.tasks.length === 0) return null;

    const completed = project.tasks.filter(t => t.completed).length;
    const total = project.tasks.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
}

// ===== Form Handling =====
function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(projectForm);

    const project = {
        id: Date.now().toString(),
        nombre: formData.get('nombre'),
        tipo: formData.get('tipo'),
        artista: formData.get('artista'),
        cliente: formData.get('cliente'),
        contacto: formData.get('contacto'),
        ubicacion: formData.get('ubicacion'),
        formato: formData.get('formato'),
        medidas: formData.get('medidas'),
        presupuesto: formData.get('presupuesto'),
        fechaInicio: formData.get('fecha-inicio'),
        fechaFin: formData.get('fecha-fin'),
        contexto: formData.get('contexto'),
        driveLink: formData.get('drive-link'),
        status: 'nuevo',
        tasks: [],
        gastos: 0,
        utilidad: 0,
        createdAt: new Date().toISOString()
    };

    projects.push(project);
    saveProjects();
    closeModal();
    renderKanban();
    updateCounts();

    if (window.GCal) {
        window.GCal.syncProjectToCalendar(project);
    }
}

function handleConclusionSubmit(event) {
    event.preventDefault();

    if (!pendingTerminadoProjectId) return;

    const formData = new FormData(conclusionForm);
    const projectIndex = projects.findIndex(p => p.id === pendingTerminadoProjectId);

    if (projectIndex !== -1) {
        const gastos = parseFloat(formData.get('gastos')) || 0;
        const presupuesto = parseFloat(projects[projectIndex].presupuesto) || 0;
        const utilidad = presupuesto - gastos;

        projects[projectIndex].status = 'terminado';
        projects[projectIndex].gastos = gastos;
        projects[projectIndex].utilidad = utilidad;
        projects[projectIndex].conclusion = {
            fecha: formData.get('fecha-conclusion'),
            calificacion: formData.get('calificacion'),
            notas: formData.get('notas-conclusion'),
            linkResultado: formData.get('link-resultado')
        };
        projects[projectIndex].completedAt = new Date().toISOString();

        saveProjects();
        closeConclusionModal();
        renderKanban();
        updateCounts();
    }
}

// ===== Project Actions =====
async function deleteProject() {
    if (!currentProjectId) return;

    if (confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
        const idToDelete = currentProjectId;
        projects = projects.filter(p => p.id !== idToDelete);

        closeDetailModal();
        renderKanban();
        renderHistory();
        updateCounts();

        await DB.deleteProject(idToDelete);
    }
}

// ===== Render Functions =====
function renderKanban() {
    const statuses = ['nuevo', 'en-curso', 'completo', 'terminado'];

    statuses.forEach(status => {
        const container = document.getElementById(`cards-${status}`);
        let statusProjects = projects
            .filter(p => p.status === status)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        // Limit "terminado" column to last 3 projects
        const isTerminado = status === 'terminado';
        const totalTerminado = statusProjects.length;
        if (isTerminado && statusProjects.length > 3) {
            statusProjects = statusProjects
                .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
                .slice(0, 3);
        }

        if (statusProjects.length === 0) {
            container.innerHTML = `
                <div class="column-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M12 8v8M8 12h8"/>
                    </svg>
                    <span>Sin proyectos</span>
                </div>
            `;
        } else {
            let html = statusProjects.map(project => {
                const deadlineStatus = getDeadlineStatus(project);
                const taskProgress = getTaskProgress(project);
                const sColor = getServiceColor(project.tipo);

                // Deadline badge
                let deadlineBadgeHtml = '';
                if (deadlineStatus) {
                    deadlineBadgeHtml = `<span class="deadline-badge ${deadlineStatus.level}">${deadlineStatus.icon} ${deadlineStatus.message}</span>`;
                }

                // Task progress bar
                let taskHtml = '';
                if (taskProgress) {
                    taskHtml = `
                        <div class="task-progress">
                            <div class="task-progress-bar">
                                <div class="task-progress-fill ${taskProgress.percentage === 100 ? 'complete' : ''}" style="width: ${taskProgress.percentage}%"></div>
                            </div>
                            <span>${taskProgress.completed}/${taskProgress.total}</span>
                        </div>
                    `;
                }

                // Utilidad badge for terminado
                let utilidadHtml = '';
                if (isTerminado && project.utilidad !== undefined) {
                    const u = parseFloat(project.utilidad) || 0;
                    const uClass = u >= 0 ? 'utilidad-positive' : 'utilidad-negative';
                    const uSign = u >= 0 ? '+' : '';
                    utilidadHtml = `<span class="utilidad-badge ${uClass}">${uSign}$${u.toLocaleString()}</span>`;
                }

                return `
                    <article class="project-card" 
                             draggable="true" 
                             data-id="${project.id}"
                             style="border-left: 4px solid ${sColor.border};"
                             ondragstart="handleDragStart(event)"
                             ondragend="handleDragEnd(event)"
                             onclick="openDetailModal('${project.id}')">
                        ${deadlineBadgeHtml}
                        <span class="project-type" style="background: ${sColor.bg}; color: ${sColor.label};">${project.tipo}</span>
                        ${isTerminado && project.conclusion ? '<span class="conclusion-badge">✓ Finalizado</span>' : ''}
                        <h3 class="project-name">${project.nombre}</h3>
                        <p class="project-artist">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            ${project.artista}
                        </p>
                        ${utilidadHtml}
                        ${taskHtml}
                    </article>
                `;
            }).join('');

            // "Ver todos" link if truncated
            if (isTerminado && totalTerminado > 3) {
                html += `
                    <div class="see-all-link" onclick="switchToHistory()">
                        Ver todos (${totalTerminado}) →
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    });
}

function switchToHistory() {
    const historyBtn = document.querySelector('.view-btn[data-view="history"]');
    if (historyBtn) historyBtn.click();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    const sortBy = document.getElementById('history-sort')?.value || 'fecha';

    let terminadoProjects = projects.filter(p => p.status === 'terminado');

    // Sort logic
    switch (sortBy) {
        case 'calificacion':
            terminadoProjects.sort((a, b) => (parseInt(b.conclusion?.calificacion) || 0) - (parseInt(a.conclusion?.calificacion) || 0));
            break;
        case 'presupuesto':
            terminadoProjects.sort((a, b) => (parseFloat(b.presupuesto) || 0) - (parseFloat(a.presupuesto) || 0));
            break;
        case 'utilidad':
            terminadoProjects.sort((a, b) => (parseFloat(b.utilidad) || 0) - (parseFloat(a.utilidad) || 0));
            break;
        case 'tipo':
            terminadoProjects.sort((a, b) => (a.tipo || '').localeCompare(b.tipo || ''));
            break;
        case 'fecha':
        default:
            terminadoProjects.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
            break;
    }

    document.getElementById('history-count').textContent = `${terminadoProjects.length} proyecto${terminadoProjects.length !== 1 ? 's' : ''}`;

    if (terminadoProjects.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 3v18M3 9h6M3 15h6"/>
                </svg>
                <p>No hay proyectos terminados aún</p>
            </div>
        `;
    } else {
        historyList.innerHTML = terminadoProjects.map(project => {
            const sColor = getServiceColor(project.tipo);
            const utilidad = parseFloat(project.utilidad) || 0;
            const utilClass = utilidad >= 0 ? 'utilidad-positive' : 'utilidad-negative';
            const utilSign = utilidad >= 0 ? '+' : '';

            return `
            <div class="history-item" onclick="openDetailModal('${project.id}')" style="border-left: 4px solid ${sColor.border};">
                <div class="history-info">
                    <span class="history-name">${project.nombre}</span>
                    <span class="history-meta">${project.tipo} · ${project.artista} · ${project.cliente}</span>
                </div>
                <span class="history-date">${formatDate(project.conclusion?.fecha || project.completedAt)}</span>
                <span class="history-budget ${utilClass}">${utilSign}$${utilidad.toLocaleString()}</span>
                <span class="history-rating">${getStars(project.conclusion?.calificacion) || '-'}</span>
            </div>
        `}).join('');
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateCounts() {
    const counts = {
        'nuevo': 0,
        'en-curso': 0,
        'completo': 0,
        'terminado': 0
    };

    projects.forEach(p => {
        if (counts.hasOwnProperty(p.status)) {
            counts[p.status]++;
        }
    });

    Object.keys(counts).forEach(status => {
        const el = document.getElementById(`count-${status}`);
        if (el) el.textContent = counts[status];
    });
}

// ===== Storage =====
async function saveProjects() {
    await DB.saveAll(projects);
}

// ===== Analytics (Chart.js) =====
function renderAnalytics() {
    const terminados = projects.filter(p => p.status === 'terminado' && p.completedAt);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get month boundaries
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0);

    // Calculate monthly utilities
    let currentMonthUtil = 0;
    let prevMonthUtil = 0;

    // Build last 6 months data for the chart
    const monthLabels = [];
    const monthData = [];

    for (let i = 5; i >= 0; i--) {
        const mDate = new Date(currentYear, currentMonth - i, 1);
        const mEnd = new Date(currentYear, currentMonth - i + 1, 0);
        const label = mDate.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
        monthLabels.push(label);

        const monthUtil = terminados
            .filter(p => {
                const d = new Date(p.completedAt);
                return d >= mDate && d <= mEnd;
            })
            .reduce((sum, p) => sum + (parseFloat(p.utilidad) || 0), 0);

        monthData.push(monthUtil);

        if (i === 0) currentMonthUtil = monthUtil;
        if (i === 1) prevMonthUtil = monthUtil;
    }

    // Update stat cards
    const totalCompleted = terminados.length;
    const totalUtilidad = terminados.reduce((sum, p) => sum + (parseFloat(p.utilidad) || 0), 0);
    const avgProfit = totalCompleted > 0 ? totalUtilidad / totalCompleted : 0;

    document.getElementById('stat-current-month').textContent = `$${currentMonthUtil.toLocaleString()}`;
    document.getElementById('stat-current-month').className = `stat-value ${currentMonthUtil >= 0 ? 'utilidad-positive' : 'utilidad-negative'}`;

    document.getElementById('stat-prev-month').textContent = `$${prevMonthUtil.toLocaleString()}`;
    document.getElementById('stat-prev-month').className = `stat-value ${prevMonthUtil >= 0 ? 'utilidad-positive' : 'utilidad-negative'}`;

    document.getElementById('stat-total-completed').textContent = totalCompleted;
    document.getElementById('stat-avg-profit').textContent = `$${Math.round(avgProfit).toLocaleString()}`;
    document.getElementById('stat-avg-profit').className = `stat-value ${avgProfit >= 0 ? 'utilidad-positive' : 'utilidad-negative'}`;

    // Render Chart
    const ctx = document.getElementById('profit-chart');
    if (!ctx) return;

    if (profitChart) {
        profitChart.destroy();
    }

    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Utilidad ($)',
                data: monthData,
                backgroundColor: monthData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                borderColor: monthData.map(v => v >= 0 ? '#10b981' : '#ef4444'),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a1d',
                    titleColor: '#f5f5f7',
                    bodyColor: '#a1a1a6',
                    borderColor: '#2a2a2e',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            const val = context.parsed.y;
                            return `Utilidad: ${val >= 0 ? '+' : ''}$${val.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(42, 42, 46, 0.5)' },
                    ticks: { color: '#a1a1a6', font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: 'rgba(42, 42, 46, 0.5)' },
                    ticks: {
                        color: '#a1a1a6',
                        font: { family: 'Inter' },
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// ===== Modal Close on Outside Click =====
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

detailModalOverlay.addEventListener('click', (e) => {
    if (e.target === detailModalOverlay) closeDetailModal();
});

conclusionModalOverlay.addEventListener('click', (e) => {
    if (e.target === conclusionModalOverlay) cancelConclusion();
});

// ===== Keyboard Events =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeDetailModal();
        cancelConclusion();
    }
});

// ===== Calendar Functions =====
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = startingDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.appendChild(createDayElement(day, dateStr, true, false));
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        calendarDays.appendChild(createDayElement(day, dateStr, false, isToday));
    }

    const remainingDays = 42 - (startingDay + totalDays);
    for (let day = 1; day <= remainingDays; day++) {
        const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.appendChild(createDayElement(day, dateStr, true, false));
    }
}

function createDayElement(day, dateStr, isOtherMonth, isToday) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day${isOtherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`;

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    const projectsContainer = document.createElement('div');
    projectsContainer.className = 'day-projects';

    // Projects on this day
    const dayProjects = projects.filter(p => {
        if (p.status === 'terminado') return false;
        if (!p.fechaInicio && !p.fechaFin) return false;
        const start = p.fechaInicio || p.fechaFin;
        const end = p.fechaFin || p.fechaInicio;
        return dateStr >= start && dateStr <= end;
    });

    // Tasks with dueDate on this day
    const dayTasks = [];
    projects.forEach(p => {
        if (p.status === 'terminado' || !p.tasks) return;
        p.tasks.forEach((task, idx) => {
            if (task.dueDate === dateStr) {
                dayTasks.push({ task, project: p, taskIndex: idx });
            }
        });
    });

    const maxShow = 3;
    let shown = 0;
    const totalItems = dayProjects.length + dayTasks.length;

    // Render projects first
    dayProjects.forEach(project => {
        if (shown >= maxShow) return;
        const start = project.fechaInicio || project.fechaFin;
        const end = project.fechaFin || project.fechaInicio;

        let positionClass = 'single';
        if (start !== end) {
            if (dateStr === start) positionClass = 'start';
            else if (dateStr === end) positionClass = 'end';
            else positionClass = 'middle';
        }

        const sColor = getServiceColor(project.tipo);
        const projectEl = document.createElement('div');
        projectEl.className = `calendar-project ${project.status} ${positionClass}`;
        projectEl.style.borderLeftColor = sColor.border;
        projectEl.textContent = project.nombre;
        projectEl.title = `📁 ${project.nombre} (${project.tipo || 'General'})`;
        projectEl.onclick = () => openDetailModal(project.id);
        projectsContainer.appendChild(projectEl);
        shown++;
    });

    // Render tasks
    dayTasks.forEach(({ task, project, taskIndex }) => {
        if (shown >= maxShow) return;
        const sColor = getServiceColor(project.tipo);
        const taskEl = document.createElement('div');
        taskEl.className = `calendar-project calendar-task ${task.completed ? 'task-done' : ''} single`;
        taskEl.style.borderLeftColor = sColor.border;
        const priorityIcon = task.priority === 'alta' ? '🔴' : task.priority === 'media' ? '🟡' : '';
        taskEl.textContent = `✓ ${task.text || 'Tarea'}`;
        taskEl.title = `✓ Tarea: ${task.text}\n📁 ${project.nombre}${priorityIcon ? '\n⚡ ' + task.priority : ''}`;
        taskEl.onclick = () => openDetailModal(project.id);
        projectsContainer.appendChild(taskEl);
        shown++;
    });

    if (totalItems > maxShow) {
        const more = document.createElement('div');
        more.className = 'day-more';
        more.textContent = `+ ${totalItems - maxShow} más`;
        projectsContainer.appendChild(more);
    }

    dayEl.appendChild(projectsContainer);
    return dayEl;
}

function prevMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
}

function goToToday() {
    calendarDate = new Date();
    renderCalendar();
}
