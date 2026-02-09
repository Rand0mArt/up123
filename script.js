// ===== State Management =====
let projects = []; // Initialize empty, load from DB

let currentProjectId = null;
let pendingTerminadoProjectId = null;
let currentView = 'kanban';
let isEditMode = false;
let calendarDate = new Date(); // Current month being viewed

// ===== DOM Elements =====
const modalOverlay = document.getElementById('modal-overlay');
const detailModalOverlay = document.getElementById('detail-modal-overlay');
const conclusionModalOverlay = document.getElementById('conclusion-modal-overlay');
const projectForm = document.getElementById('project-form');
const conclusionForm = document.getElementById('conclusion-form');
const kanbanBoard = document.getElementById('kanban-board');
const historyView = document.getElementById('history-view');
const calendarView = document.getElementById('calendar-view');

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    renderKanban();
    updateCounts();
    initDragAndDrop();
    initViewToggle();
    setTodayAsDefault();
});

function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-conclusion').value = today;
    document.getElementById('fecha-inicio').value = today;
    document.getElementById('fecha-fin').value = today;
}

// ===== View Toggle =====
function initViewToggle() {
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;

            kanbanBoard.style.display = 'none';
            historyView.style.display = 'none';
            calendarView.style.display = 'none';

            if (currentView === 'kanban') {
                kanbanBoard.style.display = 'grid';
            } else if (currentView === 'history') {
                historyView.style.display = 'block';
                renderHistory();
            } else if (currentView === 'calendar') {
                calendarView.style.display = 'block';
                renderCalendar();
            }
        });
    });
}

// ===== Drag and Drop =====
function initDragAndDrop() {
    const columns = document.querySelectorAll('.column-cards');

    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column-cards').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Get the element we're dragging over
    const column = e.currentTarget;
    const draggingCard = document.querySelector('.dragging');

    // Find the card below cursor for sorting
    const afterElement = getDragAfterElement(column, e.clientY);

    if (afterElement == null) {
        if (draggingCard && draggingCard.parentElement === column) {
            column.appendChild(draggingCard);
        }
    } else {
        if (draggingCard && draggingCard.parentElement === column) {
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

        // Save the new order from DOM
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
    setTodayAsDefault(); // Pre-fill dates when modal opens
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

    // Show view mode, hide edit mode
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

    // Check deadline status
    const deadlineStatus = getDeadlineStatus(project);
    if (deadlineStatus && project.status !== 'terminado') {
        deadlineHtml = `
            <div class="detail-row" style="background: ${deadlineStatus.urgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; margin: -24px -24px 16px; padding: 12px 24px; border-radius: 8px 8px 0 0;">
                <span class="detail-label" style="color: ${deadlineStatus.urgent ? 'var(--danger)' : 'var(--en-curso)'}; font-weight: 600;">⚠️ ${deadlineStatus.message}</span>
                <span class="detail-value"></span>
            </div>
        `;
    }

    if (project.status === 'terminado' && project.conclusion) {
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
                <span class="detail-label">Monto final</span>
                <span class="detail-value" style="color: var(--success); font-weight: 600;">${project.conclusion.montoFinal ? '$' + parseFloat(project.conclusion.montoFinal).toLocaleString() : '-'}</span>
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
        // Switch to edit mode
        document.getElementById('detail-content').style.display = 'none';
        document.getElementById('tasks-section').style.display = 'none';
        document.getElementById('edit-form').style.display = 'block';
        document.getElementById('detail-actions').style.display = 'none';
        document.getElementById('edit-btn').classList.add('active');

        // Populate form
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

    saveProjects();

    // Update title and refresh view
    document.getElementById('detail-title').textContent = projects[projectIndex].nombre;
    renderDetailContent(projects[projectIndex]);
    renderTasks(projects[projectIndex]);
    cancelEdit();
    renderKanban();
}

// ===== Tasks/Checklist =====
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

    tasksList.innerHTML = project.tasks.map((task, index) => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-index="${index}">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <input type="text" class="task-text" value="${escapeHtml(task.text)}" onblur="updateTaskText(${index}, this.value)" placeholder="Describe la tarea...">
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
        completed: false
    });

    saveProjects();
    renderTasks(projects[projectIndex]);

    // Focus on the new task input
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

// ===== Deadline Functions =====
function getDeadlineStatus(project) {
    if (!project.fechaFin || project.status === 'terminado') return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(project.fechaFin);
    deadline.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { urgent: true, message: `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}` };
    } else if (diffDays === 0) {
        return { urgent: true, message: 'Vence hoy' };
    } else if (diffDays <= 3) {
        return { urgent: false, message: `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}` };
    }

    return null;
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
        createdAt: new Date().toISOString()
    };

    projects.push(project);
    saveProjects();
    closeModal();
    renderKanban();
    updateCounts();
}

function handleConclusionSubmit(event) {
    event.preventDefault();

    if (!pendingTerminadoProjectId) return;

    const formData = new FormData(conclusionForm);
    const projectIndex = projects.findIndex(p => p.id === pendingTerminadoProjectId);

    if (projectIndex !== -1) {
        projects[projectIndex].status = 'terminado';
        projects[projectIndex].conclusion = {
            fecha: formData.get('fecha-conclusion'),
            montoFinal: formData.get('monto-final'),
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

        // Optimistic UI update
        closeDetailModal();
        renderKanban();
        renderHistory();
        updateCounts();

        // Delete from DB
        await DB.deleteProject(idToDelete);
    }
}

// ===== Render Functions =====
function renderKanban() {
    const statuses = ['nuevo', 'en-curso', 'completo', 'terminado'];

    statuses.forEach(status => {
        const container = document.getElementById(`cards-${status}`);
        const statusProjects = projects
            .filter(p => p.status === status)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

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
            container.innerHTML = statusProjects.map(project => {
                const deadlineStatus = getDeadlineStatus(project);
                const taskProgress = getTaskProgress(project);

                let deadlineHtml = '';
                if (deadlineStatus) {
                    deadlineHtml = `<span class="deadline-warning ${deadlineStatus.urgent ? 'urgent' : 'soon'}">⚠ ${deadlineStatus.message}</span>`;
                }

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

                return `
                    <article class="project-card" 
                             draggable="true" 
                             data-id="${project.id}"
                             ondragstart="handleDragStart(event)"
                             ondragend="handleDragEnd(event)"
                             onclick="openDetailModal('${project.id}')">
                        ${deadlineHtml}
                        <span class="project-type">${project.tipo}</span>
                        ${project.status === 'terminado' && project.conclusion ? '<span class="conclusion-badge">✓ Finalizado</span>' : ''}
                        <h3 class="project-name">${project.nombre}</h3>
                        <p class="project-artist">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            ${project.artista}
                        </p>
                        ${taskHtml}
                    </article>
                `;
            }).join('');
        }
    });
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    const terminadoProjects = projects
        .filter(p => p.status === 'terminado')
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

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
        historyList.innerHTML = terminadoProjects.map(project => `
            <div class="history-item" onclick="openDetailModal('${project.id}')">
                <div class="history-info">
                    <span class="history-name">${project.nombre}</span>
                    <span class="history-meta">${project.tipo} · ${project.artista} · ${project.cliente}</span>
                </div>
                <span class="history-date">${formatDate(project.conclusion?.fecha || project.completedAt)}</span>
                <span class="history-budget">${project.conclusion?.montoFinal ? '$' + parseFloat(project.conclusion.montoFinal).toLocaleString() : '-'}</span>
                <span class="history-rating">${getStars(project.conclusion?.calificacion) || '-'}</span>
            </div>
        `).join('');
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
    // Save to DB (Fire and forget or await depending on need)
    // For simple interactions, we might not await.
    // However, saveAll uses upsert.
    await DB.saveAll(projects);
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

    // Update header
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    // Get some days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Add days from previous month
    for (let i = startingDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.appendChild(createDayElement(day, dateStr, true, false));
    }

    // Add days of current month
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        calendarDays.appendChild(createDayElement(day, dateStr, false, isToday));
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - (startingDay + totalDays); // 6 rows * 7 days = 42
    for (let day = 1; day <= remainingDays; day++) {
        const dateStr = `${year}-${String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        calendarDays.appendChild(createDayElement(day, dateStr, true, false));
    }
}

function createDayElement(day, dateStr, isOtherMonth, isToday) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day${isOtherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`;

    // Day number
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayEl.appendChild(dayNumber);

    // Projects container
    const projectsContainer = document.createElement('div');
    projectsContainer.className = 'day-projects';

    // Find projects for this day (only active projects, not terminado)
    const dayProjects = projects.filter(p => {
        if (p.status === 'terminado') return false;
        if (!p.fechaInicio && !p.fechaFin) return false;
        const start = p.fechaInicio || p.fechaFin;
        const end = p.fechaFin || p.fechaInicio;
        return dateStr >= start && dateStr <= end;
    });

    // Show max 3 projects, then "+ X more"
    const maxShow = 3;
    dayProjects.slice(0, maxShow).forEach(project => {
        const start = project.fechaInicio || project.fechaFin;
        const end = project.fechaFin || project.fechaInicio;

        let positionClass = 'single';
        if (start !== end) {
            if (dateStr === start) positionClass = 'start';
            else if (dateStr === end) positionClass = 'end';
            else positionClass = 'middle';
        }

        const projectEl = document.createElement('div');
        projectEl.className = `calendar-project ${project.status} ${positionClass}`;
        projectEl.textContent = project.nombre;
        projectEl.onclick = () => openDetailModal(project.id);
        projectsContainer.appendChild(projectEl);
    });

    if (dayProjects.length > maxShow) {
        const more = document.createElement('div');
        more.className = 'day-more';
        more.textContent = `+ ${dayProjects.length - maxShow} más`;
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

// ===== Initialization & Migration =====
document.addEventListener('DOMContentLoaded', async () => {
    // Initial Render (Empty)
    renderKanban();
    updateCounts();

    // Fetch from Supabase
    try {
        const dbProjects = await DB.fetchProjects();

        // Check for local data to migrate
        const localProjects = JSON.parse(localStorage.getItem('kanban-projects') || '[]');

        if (dbProjects.length === 0 && localProjects.length > 0) {
            if (confirm('Se detectaron datos locales. ¿Deseas migrarlos a la nueva base de datos en la nube?')) {
                // Migrate
                await DB.saveAll(localProjects);
                projects = await DB.fetchProjects(); // Reload from DB
                alert('Migración completada. Tus datos están seguros en Supabase.');
                // Optional: localStorage.removeItem('kanban-projects');
            } else {
                projects = dbProjects;
            }
        } else {
            projects = dbProjects;
        }
    } catch (e) {
        console.error('Error initializing:', e);
    }

    // Re-render with data
    renderKanban();
    updateCounts();
});

