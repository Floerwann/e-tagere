// ==========================================
// 🧠 MAIN.JS - Cerveau Global
// ==========================================

const API_URL = '/api';

// Récupération de l'utilisateur connecté via Login.html
const storedUser = localStorage.getItem('myAppUser');
const currentUser = storedUser ? JSON.parse(storedUser) : { id: 1, name: "Invité" };

let currentTab = 'movies'; // Onglet par défaut

// --- 1. INITIALISATION ---

function initApp() {
    console.log("🚀 Application démarrée");
    
    // Afficher le nom d'utilisateur
    const userDisplay = document.getElementById('usernameDisplay');
    if(userDisplay) userDisplay.innerText = currentUser.username || currentUser.name;

    // Gestion touche "Entrée" dans recherche
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') search();
        });
    }

    // Charger le contenu par défaut
    loadContent();
}

// --- 2. NAVIGATION & ONGLETS ---

function switchTab(tab, element) {
    currentTab = tab;

    // Mise à jour menu
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    // Textes dynamiques
    const titles = { 'movies': 'Mes Films', 'series': 'Mes Séries', 'vinyls': 'Mes Vinyles' };
    const placeholders = { 'movies': 'Chercher un film...', 'series': 'Chercher une série...', 'vinyls': 'Chercher un album...' };

    if(document.querySelector('.top-bar h2')) {
        document.querySelector('.top-bar h2').innerText = titles[tab];
    }
    
    const sInput = document.getElementById('searchInput');
    if(sInput) {
        sInput.placeholder = placeholders[tab];
        sInput.value = ''; // Reset recherche
    }

    // GESTION TOOLBAR FILTRES
    const toolbar = document.getElementById('moviesToolbar');
    const vinylsToolbar = document.getElementById('vinylsToolbar');
    const seriesTypeSelect = document.getElementById('filterSeriesType');

    // IMPORTANT : On cache TOUT d'abord pour éviter les superpositions
    if (toolbar) toolbar.style.display = 'none';
    if (vinylsToolbar) vinylsToolbar.style.display = 'none';

    // Ensuite, on affiche seulement ce qu'il faut
    if (tab === 'movies') {
        if (toolbar) toolbar.style.display = 'flex';
        if (seriesTypeSelect) seriesTypeSelect.style.display = 'none'; 
        document.getElementById('filterFormat').value = 'all';
    } 
    else if (tab === 'series') {
        if (toolbar) toolbar.style.display = 'flex';
        if (seriesTypeSelect) seriesTypeSelect.style.display = 'block';
        document.getElementById('filterFormat').value = 'all';
    } 
    else if (tab === 'vinyls') {
        if (vinylsToolbar) vinylsToolbar.style.display = 'flex';
    }

    loadContent();
}

function loadContent() {
    if(currentTab === 'movies' && typeof loadMovies === 'function') loadMovies();
    else if(currentTab === 'series' && typeof loadSeries === 'function') loadSeries();
    else if(currentTab === 'vinyls' && typeof loadVinyls === 'function') loadVinyls();
}

// --- 3. RECHERCHE & FILTRES ---

// --- 3. RECHERCHE & FILTRES ---

function search() {
    const q = document.getElementById('searchInput').value;
    
    // Si la recherche est vide, on réinitialise la vue normale
    if (!q) { 
        resetView(); 
        return; 
    }

    // --- NOUVEAU : ON CACHE LES BARRES D'OUTILS PENDANT LA RECHERCHE ---
    const moviesToolbar = document.getElementById('moviesToolbar');
    const vinylsToolbar = document.getElementById('vinylsToolbar');
    
    if (moviesToolbar) moviesToolbar.style.display = 'none';
    if (vinylsToolbar) vinylsToolbar.style.display = 'none';
    // -------------------------------------------------------------------

    if(currentTab === 'movies' && typeof searchMovies === 'function') searchMovies(q); 
    else if (currentTab === 'series' && typeof searchSeries === 'function') searchSeries(q);
    else if (currentTab === 'vinyls' && typeof searchVinyls === 'function') searchVinyls(q);
}

function resetView() {
    document.getElementById('searchInput').value = ''; // Vide la recherche
    
    // --- NOUVEAU : ON RÉAFFICHE LA BONNE BARRE D'OUTILS ---
    const moviesToolbar = document.getElementById('moviesToolbar');
    const vinylsToolbar = document.getElementById('vinylsToolbar');
    
    // 1. On cache tout par sécurité
    if (moviesToolbar) moviesToolbar.style.display = 'none';
    if (vinylsToolbar) vinylsToolbar.style.display = 'none';

    // 2. On réaffiche seulement celle de l'onglet actif
    if (currentTab === 'movies' || currentTab === 'series') {
        if (moviesToolbar) moviesToolbar.style.display = 'flex';
    } 
    else if (currentTab === 'vinyls') {
        if (vinylsToolbar) vinylsToolbar.style.display = 'flex';
    }
    // -------------------------------------------------------

    loadContent(); // Recharge la collection
}

function refreshFilters() {
    if (currentTab === 'movies' && typeof filterMovies === 'function') filterMovies();
    else if (currentTab === 'series' && typeof filterSeries === 'function') filterSeries();
    else if (currentTab === 'vinyls' && typeof filterVinyls === 'function') filterVinyls();
} // <--- C'ÉTAIT ICI L'ERREUR, il manquait l'accolade fermante !

// --- 4. GESTION MODALES ---

function closeModal() {
    document.getElementById('movieModal').style.display = 'none';
    // Reset des variables d'édition globales
    if(typeof editingMovieId !== 'undefined') editingMovieId = null;
}

// --- 5. UTILITAIRES ---

// Gère les cases à cocher (Logic "Update Combo Options")
function updateComboOptions() {
    const formatEl = document.querySelector('input[name="format"]:checked');
    if (!formatEl) return;

    const format = formatEl.value;
    const chkBr = document.getElementById('checkIncludeBR');
    const chkDvd = document.getElementById('checkIncludeDVD');

    // Reset état
    if (chkBr) { chkBr.disabled = false; chkBr.parentElement.style.opacity = "1"; }
    if (chkDvd) { chkDvd.disabled = false; chkDvd.parentElement.style.opacity = "1"; }

    // Logique Combo
    if (format === 'DVD' && chkDvd) {
        chkDvd.checked = false; chkDvd.disabled = true; chkDvd.parentElement.style.opacity = "0.5"; 
    } 
    else if (format === 'BLURAY' && chkBr) {
        chkBr.checked = false; chkBr.disabled = true; chkBr.parentElement.style.opacity = "0.5"; 
    }
}

function toggleMobileFilters() {
    const toolbar = document.getElementById('moviesToolbar');
    if(toolbar) toolbar.classList.toggle('mobile-open');
}

// --- 6. SYSTÈME DE NOTIFICATIONS (TOASTS) ---
function showToast(message, type = 'success') {
    // Crée le conteneur s'il n'existe pas encore
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Crée la bulle
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icône selon le type
    let icon = '<i class="fas fa-check-circle"></i>';
    if(type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    if(type === 'info') icon = '<i class="fas fa-info-circle"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    container.appendChild(toast);

    // Supprime la bulle après 3 secondes
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500); // Attend la fin de l'anim
    }, 3000);
}

// --- 7. MODALE DE CONFIRMATION ---
let currentConfirmCallback = null;

function openConfirmModal(message, onConfirm) {
    // 1. On remplit le message
    document.getElementById('confirmMessage').innerText = message;
    
    // 2. On stocke l'action à faire si l'utilisateur dit OUI
    currentConfirmCallback = onConfirm;
    
    // 3. On configure le bouton "Supprimer"
    const btnConfirm = document.getElementById('btnConfirmAction');
    btnConfirm.onclick = function() {
        if (currentConfirmCallback) currentConfirmCallback();
        closeConfirmModal();
    };

    // 4. On affiche
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentConfirmCallback = null;
}

// --- GESTION UNIQUE DES FERMETURES AU CLIC ---
window.onclick = function(event) {
    const movieModal = document.getElementById('movieModal');
    const vinylModal = document.getElementById('vinylModal');
    const confirmModal = document.getElementById('confirmModal');

    // 1. Fermeture Modale FILM
    if (event.target == movieModal) {
        closeModal(); 
    }

    // 2. Fermeture Modale VINYLE
    if (event.target == vinylModal && typeof closeVinylModal === 'function') {
        closeVinylModal(); 
    }

    // 3. Fermeture Modale CONFIRMATION
    if (event.target == confirmModal) {
        closeConfirmModal(); 
    }
}

// --- 8. LOGOUT ---

function logout() {
    localStorage.removeItem('myAppUser');
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', initApp);