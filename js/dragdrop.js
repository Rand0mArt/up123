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


