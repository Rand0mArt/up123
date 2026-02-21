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


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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


