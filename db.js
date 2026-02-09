
const SUPABASE_URL = 'https://czdialdmmsfiguuxmojr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZGlhbGRtbXNmaWd1dXhtb2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTA0MzcsImV4cCI6MjA4NjE2NjQzN30.-_pYzLDDG5ZdLOoJ-MgfgR0hOC_McYDNUGVvy7nAI_E';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
            // Store everything else in data jsonb
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
                driveLink: project.driveLink || ''
            }
        };
    },

    // Convert DB format to local project format
    fromDbFormat(row) {
        return {
            id: row.id,
            nombre: row.nombre,
            status: row.status,
            order: parseFloat(row.order), // Ensure number
            tipo: row.tipo,
            artista: row.artista,
            cliente: row.cliente,
            fechaInicio: row.fecha_inicio,
            fechaFin: row.fecha_fin,
            ...row.data // Spread the jsonb data back to top level
        };
    },

    async fetchProjects() {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('order', { ascending: true });

        if (error) {
            console.error('Error fetching projects:', error);
            alert('Error leyendo base de datos: ' + error.message);
            return [];
        }
        return data.map(this.fromDbFormat);
    },

    async createProject(project) {
        const { error } = await supabase
            .from('projects')
            .insert(this.toDbFormat(project));

        if (error) {
            console.error('Error creating project:', error);
            alert('Error guardando proyecto: ' + error.message);
        }
        return !error;
    },

    async updateProject(project) {
        const { error } = await supabase
            .from('projects')
            .update(this.toDbFormat(project))
            .eq('id', project.id);

        if (error) {
            console.error('Error updating project:', error);
            alert('Error actualizando proyecto: ' + error.message);
        }
        return !error;
    },

    async deleteProject(id) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            alert('Error eliminando proyecto: ' + error.message);
        }
        return !error;
    },

    async saveAll(projects) {
        // For mass updates (reordering), upsert is best
        const updates = projects.map(this.toDbFormat);
        const { error } = await supabase
            .from('projects')
            .upsert(updates);

        if (error) {
            console.error('Error saving all:', error);
            alert('Error guardando cambios: ' + error.message);
        }
    }
};
