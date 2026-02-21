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

// ===== Google Calendar Bidirectional Sync =====
async function syncFromGCal() {
    if (!window.GCal) return;
    const btn = document.getElementById('gcal-sync-btn');
    if (!btn) return;

    // UI feedback
    const originalText = btn.textContent;
    btn.textContent = '🔄 Buscando...';
    btn.disabled = true;

    try {
        const updatedCount = await window.GCal.fetchUpdatesFromCalendar(projects);

        if (updatedCount > 0) {
            saveProjects();
            renderKanban();
            if (currentView === 'calendar') renderCalendar();
            if (currentView === 'tasks') renderTasksView();
            alert(`✅ Sincronización exitosa. Se actualizaron las fechas de ${updatedCount} proyecto(s) desde Google Calendar.`);
        } else {
            alert('Las fechas en el Kanban ya están sincronizadas con tu Google Calendar.');
        }
    } catch (err) {
        console.error('Error during GCal sync:', err);
        alert('Hubo un problema al sincronizar con Google Calendar.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}


