// ===== Authentication & User Session Management =====

let currentUser = null;

async function initAuth() {
    const supabase = await getSupabase();

    // 1. Check for existing session right away
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error fetching session:', error);
    }

    handleAuthChange(session);

    // 2. Listen for auth changes (login, logout)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event:', event);
        handleAuthChange(session);
    });
}

function handleAuthChange(session) {
    const authOverlay = document.getElementById('auth-overlay');
    const appContainer = document.querySelector('.app-container');
    const userProfileEl = document.getElementById('user-profile');
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');

    if (session && session.user) {
        // User IS logged in
        currentUser = session.user;

        if (authOverlay) authOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';

        // Update User Profile UI
        if (userProfileEl) {
            userProfileEl.style.display = 'flex';
            const metadata = currentUser.user_metadata || {};
            if (userNameEl) userNameEl.textContent = metadata.full_name || currentUser.email;
            if (userAvatarEl && metadata.avatar_url) {
                userAvatarEl.src = metadata.avatar_url;
            } else if (userAvatarEl) {
                userAvatarEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236c757d"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
            }
        }

        // Trigger global data load now that we are authenticated
        window.dispatchEvent(new CustomEvent('auth-ready'));

    } else {
        // User is NOT logged in
        currentUser = null;

        if (authOverlay) authOverlay.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none'; // Hide app entirely
        if (userProfileEl) userProfileEl.style.display = 'none';
    }
}

async function signInWithGoogle() {
    const supabase = await getSupabase();

    const btn = document.getElementById('btn-login');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Iniciando sesión...';
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // Optional: redirect to a specific URL after login if needed
            // redirectTo: window.location.origin + window.location.pathname
        }
    });

    if (error) {
        console.error('Login error:', error);
        alert('Error al iniciar sesión: ' + error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/>
                </svg>
                Continuar con Google
            `;
        }
    }
}

async function signOut() {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    } else {
        // Optionally reload page to fully clear state
        window.location.reload();
    }
}

// Expose globally
window.Auth = {
    initAuth,
    signInWithGoogle,
    signOut,
    getCurrentUser: () => currentUser
};
