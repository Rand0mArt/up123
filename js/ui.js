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


