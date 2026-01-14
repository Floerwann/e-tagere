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
    const seriesTypeSelect = document.getElementById('filterSeriesType');

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
    else {
        if (toolbar) toolbar.style.display = 'none';
    }

    loadContent();
}

function loadContent() {
    if(currentTab === 'movies' && typeof loadMovies === 'function') loadMovies();
    else if(currentTab === 'series' && typeof loadSeries === 'function') loadSeries();
}

// --- 3. RECHERCHE & FILTRES ---

function search() {
    const q = document.getElementById('searchInput').value;
    
    // Si vide, on recharge la collection normale
    if (!q) { loadContent(); return; }

    if(currentTab === 'movies' && typeof searchMovies === 'function') searchMovies(q); 
    else if (currentTab === 'series' && typeof searchSeries === 'function') searchSeries(q);
}

function refreshFilters() {
    if (currentTab === 'movies' && typeof filterMovies === 'function') filterMovies();
    else if (currentTab === 'series' && typeof filterSeries === 'function') filterSeries();
}

// --- 4. GESTION MODALES ---

function closeModal() {
    document.getElementById('movieModal').style.display = 'none';
    // Reset des variables d'édition globales
    if(typeof editingMovieId !== 'undefined') editingMovieId = null;
}

window.onclick = function(event) {
    const modal = document.getElementById('movieModal');
    if (event.target == modal) closeModal();
}

function resetView() {
    document.getElementById('searchInput').value = ''; // Vide la recherche
    loadContent(); // Recharge la collection
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

function logout() {
    localStorage.removeItem('myAppUser');
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', initApp);