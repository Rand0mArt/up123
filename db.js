// ===== Database Connection Module =====
// Waits for Supabase CDN to be ready, then initializes

const SUPABASE_URL = 'https://czdialdmmsfiguuxmojr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZGlhbGRtbXNmaWd1dXhtb2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTA0MzcsImV4cCI6MjA4NjE2NjQzN30.-_pYzLDDG5ZdLOoJ-MgfgR0hOC_McYDNUGVvy7nAI_E';

// Wait for Supabase CDN to load (it loads async sometimes)
function waitForSupabase(maxWait = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                resolve(window.supabase);
            } else if (Date.now() - start > maxWait) {
                reject(new Error('Supabase CDN no cargó después de ' + maxWait + 'ms'));
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

// Initialize DB object immediately (methods will wait for supabase)
let supabaseClient = null;

async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    const sb = await waitForSupabase();
    supabaseClient = sb.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase conectado correctamente');
    return supabaseClient;
}

const DB = {
    // Convert local project format to DB format
    toDbFormat(project) {
        return {
            id: project.id,
            nombre: project.nombre,
            status: project.status,
            order: project.order || 0,
            tipo: project.tipo,
            artista: project.artista,
            cliente: project.cliente,
            fecha_inicio: project.fechaInicio || null,
            fecha_fin: project.fechaFin || null,
            gastos: parseFloat(project.gastos) || 0,
            utilidad: parseFloat(project.utilidad) || 0,
            data: {
                tasks: project.tasks || [],
                conclusion: project.conclusion || null,
                completedAt: project.completedAt || null,
                contexto: project.contexto || '',
                ubicacion: project.ubicacion || '',
                formato: project.formato || '',
                medidas: project.medidas || '',
                presupuesto: project.presupuesto || '',
                contacto: project.contacto || '',
                driveLink: project.driveLink || '',
                taskOrder: project.taskOrder !== undefined ? project.taskOrder : (project.order || 0)
            }
        };
    },

    fromDbFormat(row) {
        return {
            id: row.id,
            nombre: row.nombre,
            status: row.status,
            order: parseFloat(row.order),
            tipo: row.tipo,
            artista: row.artista,
            cliente: row.cliente,
            fechaInicio: row.fecha_inicio,
            fechaFin: row.fecha_fin,
            gastos: parseFloat(row.gastos) || 0,
            utilidad: parseFloat(row.utilidad) || 0,
            ...row.data
        };
    },

    async fetchProjects() {
        const supabase = await getSupabase();
        const { data, error } = await supabase
            .from('projectos')
            .select('*')
            .order('order', { ascending: true });

        if (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
        return data.map(this.fromDbFormat);
    },

    async createProject(project) {
        const supabase = await getSupabase();
        const { error } = await supabase
            .from('projectos')
            .insert(this.toDbFormat(project));

        if (error) {
            console.error('Error creating project:', error);
            alert('Error guardando proyecto: ' + error.message);
        }
        return !error;
    },

    async updateProject(project) {
        const supabase = await getSupabase();
        const { error } = await supabase
            .from('projectos')
            .update(this.toDbFormat(project))
            .eq('id', project.id);

        if (error) {
            console.error('Error updating project:', error);
            alert('Error actualizando proyecto: ' + error.message);
        }
        return !error;
    },

    async deleteProject(id) {
        const supabase = await getSupabase();
        const { error } = await supabase
            .from('projectos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            alert('Error eliminando proyecto: ' + error.message);
        }
        return !error;
    },

    async saveAll(projects) {
        const supabase = await getSupabase();
        const updates = projects.map(this.toDbFormat);
        const { error } = await supabase
            .from('projectos')
            .upsert(updates);

        if (error) {
            console.error('Error saving all:', error);
            alert('Error guardando cambios: ' + error.message);
        }
    },

    // Real-time synchronization
    async subscribeToChanges(callback) {
        const supabase = await getSupabase();

        console.log('📡 Suscribiendo a cambios en tiempo real...');

        supabase
            .channel('public:projectos')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'projectos'
            }, payload => {
                console.log('🔔 Cambio detectado en DB:', payload);
                if (callback && typeof callback === 'function') {
                    callback(payload);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Conectado a Realtime de Supabase');
                } else if (status === 'CLOSED') {
                    console.log('🔌 Desconectado de Realtime');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Error en el canal Realtime');
                }
            });
    }
};

// Expose DB globally IMMEDIATELY - methods handle async internally
window.DB = DB;
console.log('✅ DB module loaded');
