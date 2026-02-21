// ===== Google Calendar & Drive Integration =====
// Uses Google Identity Services (GIS) token model — no client secret needed

const GCAL_CLIENT_ID = '965045865337-mscb5vc06sfunfidmlf69bkouqoofagv.apps.googleusercontent.com';
const GCAL_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.file'
].join(' ');

const GCal = {
    tokenClient: null,
    accessToken: null,
    tokenExpiry: null,

    // ─── Init ──────────────────────────────────────────────
    init() {
        if (typeof google === 'undefined') {
            console.warn('GIS library not loaded yet');
            return;
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GCAL_CLIENT_ID,
            scope: GCAL_SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error('GCal auth error:', response.error);
                    GCal._updateUI(false);
                    return;
                }
                GCal.accessToken = response.access_token;
                GCal.tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
                GCal._updateUI(true);
                console.log('✅ Google autorizado correctamente');
                // Dispatch event so script.js can react
                window.dispatchEvent(new CustomEvent('gcal-authed'));
            }
        });
        // Check if we already have a valid token in sessionStorage
        const saved = sessionStorage.getItem('gcal_token');
        const savedExpiry = sessionStorage.getItem('gcal_expiry');
        if (saved && savedExpiry && Date.now() < parseInt(savedExpiry)) {
            this.accessToken = saved;
            this.tokenExpiry = parseInt(savedExpiry);
            this._updateUI(true);
        } else {
            this._updateUI(false);
        }
    },

    // Request or refresh token
    authorize() {
        if (!this.tokenClient) {
            alert('Google Identity Services no está listo. Intenta en un momento.');
            return;
        }
        if (this._hasValidToken()) {
            this._updateUI(true);
            return;
        }
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
    },

    signOut() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log('Token revocado');
            });
        }
        this.accessToken = null;
        this.tokenExpiry = null;
        sessionStorage.removeItem('gcal_token');
        sessionStorage.removeItem('gcal_expiry');
        this._updateUI(false);
    },

    _hasValidToken() {
        return this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
    },

    _updateUI(authed) {
        // Persist valid token
        if (authed && this.accessToken) {
            sessionStorage.setItem('gcal_token', this.accessToken);
            sessionStorage.setItem('gcal_expiry', this.tokenExpiry);
        }
        const btn = document.getElementById('gcal-auth-btn');
        const status = document.getElementById('gcal-status');
        if (!btn || !status) return;
        if (authed) {
            btn.textContent = '✅ Google conectado';
            btn.classList.add('connected');
            status.textContent = 'Sesión activa';
            status.style.color = 'var(--success)';
        } else {
            btn.textContent = '🔗 Conectar Google';
            btn.classList.remove('connected');
            status.textContent = 'Sin conectar';
            status.style.color = 'var(--text-muted)';
        }
    },

    // ─── Google Calendar ──────────────────────────────────
    async syncProjectToCalendar(project) {
        if (!this._hasValidToken()) {
            alert('Primero conecta tu cuenta de Google.');
            this.authorize();
            return null;
        }
        if (!project.fechaInicio && !project.fechaFin) {
            alert('El proyecto necesita fecha de inicio o fecha fin para sincronizar al calendario.');
            return null;
        }

        const startDate = project.fechaInicio || project.fechaFin;
        const endDate = project.fechaFin || project.fechaInicio;

        const event = {
            summary: `[KANBAN] ${project.nombre}`,
            description: [
                project.cliente ? `Cliente: ${project.cliente}` : '',
                project.artista ? `Artista: ${project.artista}` : '',
                project.tipo ? `Tipo: ${project.tipo}` : '',
                project.contexto ? `\n${project.contexto}` : '',
                project.driveLink ? `\nDrive: ${project.driveLink}` : ''
            ].filter(Boolean).join('\n'),
            start: { date: startDate },
            end: { date: endDate < startDate ? startDate : endDate },
            colorId: this._colorIdForStatus(project.status)
        };

        try {
            const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('✅ Evento creado:', data.htmlLink);
            return data;
        } catch (err) {
            console.error('Error creando evento:', err);
            alert('Error al crear evento en Google Calendar: ' + err.message);
            return null;
        }
    },

    async syncTaskToCalendar(task, project) {
        if (!this._hasValidToken()) {
            alert('Primero conecta tu cuenta de Google.');
            this.authorize();
            return null;
        }
        if (!task.dueDate) {
            alert('La tarea necesita fecha para sincronizar al calendario.');
            return null;
        }

        const event = {
            summary: `[TAREA] ${task.text}`,
            description: [
                `Proyecto: ${project.nombre}`,
                project.cliente ? `Cliente: ${project.cliente}` : '',
                task.priority && task.priority !== 'normal' ? `Prioridad: ${task.priority}` : ''
            ].filter(Boolean).join('\n'),
            start: { date: task.dueDate },
            end: { date: task.dueDate },
            colorId: task.priority === 'alta' ? '11' : task.priority === 'media' ? '5' : '1'
        };

        try {
            const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data;
        } catch (err) {
            console.error('Error creando tarea en calendario:', err);
            alert('Error al crear tarea en Google Calendar: ' + err.message);
            return null;
        }
    },

    _colorIdForStatus(status) {
        const colorMap = {
            'nuevo': '7',      // Peacock (cyan)
            'en-curso': '9',   // Blueberry
            'terminado': '10', // Sage (green)
            'pausa': '6'       // Tangerine (orange)
        };
        return colorMap[status] || '1';
    },

    // ─── Google Drive ─────────────────────────────────────
    async createProjectFolder(projectName) {
        if (!this._hasValidToken()) {
            alert('Primero conecta tu cuenta de Google.');
            this.authorize();
            return null;
        }

        // 1. Find or create root "RANDOM Proyectos" folder
        const rootId = await this._ensureRootFolder();
        if (!rootId) return null;

        // 2. Create project subfolder inside root
        const metadata = {
            name: projectName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootId]
        };

        try {
            const res = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const driveLink = `https://drive.google.com/drive/folders/${data.id}`;
            console.log('✅ Carpeta creada:', driveLink);
            return driveLink;
        } catch (err) {
            console.error('Error creando carpeta en Drive:', err);
            alert('Error al crear carpeta en Google Drive: ' + err.message);
            return null;
        }
    },

    async _ensureRootFolder() {
        const ROOT_NAME = 'RANDOM Proyectos';

        // Search for existing folder
        try {
            const q = encodeURIComponent(`name='${ROOT_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const data = await res.json();
            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }

            // Create it
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: ROOT_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            const created = await createRes.json();
            return created.id;
        } catch (err) {
            console.error('Error buscando/creando carpeta raíz:', err);
            return null;
        }
    }
};

// Expose globally
window.GCal = GCal;

// Auto-init when GIS is ready
window.addEventListener('load', () => {
    // GIS loads async, poll until ready
    const tryInit = () => {
        if (typeof google !== 'undefined' && google.accounts) {
            GCal.init();
        } else {
            setTimeout(tryInit, 200);
        }
    };
    setTimeout(tryInit, 500);
});

console.log('✅ GCal module loaded');
