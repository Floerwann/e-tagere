// ==========================================
// 🧠 MAIN.JS - Cerveau Global
// ==========================================

const API_URL = '/api';
const storedUser = localStorage.getItem('myAppUser');
const currentUser = storedUser ? JSON.parse(storedUser) : { id: 1, name: "Invité" };

let currentTab = 'dashboard'; 

// --- 1. INITIALISATION ---

function initApp() {
    console.log("🚀 Application démarrée");
    const userDisplay = document.getElementById('usernameDisplay');
    if(userDisplay) userDisplay.innerText = currentUser.username || currentUser.name;

    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') search();
        });
    }

    loadContent();
}

// --- 2. NAVIGATION & ONGLETS ---

function switchTab(tab, element) {
    currentTab = tab;

    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    const titles = { 
        'dashboard': `Bonjour ${currentUser.name || 'Invité'} !`,
        'movies': 'Mes Films', 
        'series': 'Mes Séries', 
        'vinyls': 'Mes Vinyles' 
    };
    
    if(document.querySelector('.top-bar h2')) {
        document.querySelector('.top-bar h2').innerText = titles[tab] || 'E-Tagere';
    }

    // GESTION BARRES D'OUTILS
    const moviesToolbar = document.getElementById('moviesToolbar');
    const vinylsToolbar = document.getElementById('vinylsToolbar');

    if (moviesToolbar) moviesToolbar.style.display = 'none';
    if (vinylsToolbar) vinylsToolbar.style.display = 'none';

    if (tab === 'movies' || tab === 'series') {
        if (moviesToolbar) moviesToolbar.style.display = 'flex';
        const typeSelect = document.getElementById('filterSeriesType');
        if(typeSelect) typeSelect.style.display = (tab === 'series') ? 'block' : 'none';
    } 
    else if (tab === 'vinyls') {
        if (vinylsToolbar) vinylsToolbar.style.display = 'flex';
    }

    loadContent();
}

function loadContent() {
    const container = document.getElementById('myCollection');
    if(!container) return;

    container.innerHTML = '<p style="padding:20px;">Chargement...</p>';

    if(currentTab === 'dashboard') {
        container.classList.remove('grid');
        loadDashboard();
    } 
    else {
        container.classList.add('grid');
        if(currentTab === 'movies' && typeof loadMovies === 'function') loadMovies();
        else if(currentTab === 'series' && typeof loadSeries === 'function') loadSeries();
        else if(currentTab === 'vinyls' && typeof loadVinyls === 'function') loadVinyls();
    }
}

// --- 3. LE DASHBOARD (CORRIGÉ) ---

async function loadDashboard() {
    try {
        const [resMovies, resSeries, resVinyls] = await Promise.all([
            fetch(`${API_URL}/movies?userId=${currentUser.id}`),
            fetch(`${API_URL}/series?userId=${currentUser.id}`),
            fetch(`${API_URL}/vinyls?userId=${currentUser.id}`)
        ]);

        const movies = await resMovies.json();
        const series = await resSeries.json();
        const vinyls = await resVinyls.json();

        // --- CORRECTION 1 : On met à jour les variables globales ---
        // Cela permet aux fonctions "openEditModal" de retrouver les données
        if(typeof allMoviesData !== 'undefined') allMoviesData = movies;
        if(typeof allSeriesData !== 'undefined') allSeriesData = series;
        if(typeof allVinylsData !== 'undefined') allVinylsData = vinyls;
        // -----------------------------------------------------------

        // HTML Stats
        const htmlStats = `
            <div class="dashboard-stats">
                <div class="stat-card stat-movies" onclick="switchTab('movies', document.querySelectorAll('.menu-item')[2])">
                    <i class="fas fa-film"></i>
                    <div class="stat-info">
                        <h3>Films</h3>
                        <p>${movies.length}</p>
                    </div>
                </div>
                <div class="stat-card stat-series" onclick="switchTab('series', document.querySelectorAll('.menu-item')[3])">
                    <i class="fas fa-tv"></i>
                    <div class="stat-info">
                        <h3>Séries</h3>
                        <p>${series.length}</p>
                    </div>
                </div>
                <div class="stat-card stat-vinyls" onclick="switchTab('vinyls', document.querySelectorAll('.menu-item')[4])">
                    <i class="fas fa-record-vinyl"></i>
                    <div class="stat-info">
                        <h3>Vinyles</h3>
                        <p>${vinyls.length}</p>
                    </div>
                </div>
            </div>
            
            <h3 style="margin: 30px 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 10px; color:#555;">
                <i class="fas fa-history"></i> Derniers Ajouts
            </h3>
        `;

        // Mix Derniers Ajouts
        movies.forEach(m => m.dataType = 'movie');
        series.forEach(s => s.dataType = 'series');
        vinyls.forEach(v => v.dataType = 'vinyl');

        const allItems = [...movies, ...series, ...vinyls];

        // --- CORRECTION 2 : Tri par DATE (et pas par ID) ---
        // On essaie de prendre addedAt, sinon createdAt, sinon on met une date par défaut
        allItems.sort((a, b) => {
            const dateA = new Date(a.addedAt || a.createdAt || 0);
            const dateB = new Date(b.addedAt || b.createdAt || 0);
            return dateB - dateA; // Du plus récent au plus vieux
        });
        // ---------------------------------------------------

        const latestItems = allItems.slice(0, 6);

        let htmlGrid = '<div class="grid">';
        latestItems.forEach(item => {
            htmlGrid += generateDashboardCard(item);
        });
        htmlGrid += '</div>';

        document.getElementById('myCollection').innerHTML = htmlStats + htmlGrid;

    } catch(e) {
        console.error("Erreur Dashboard", e);
        document.getElementById('myCollection').innerHTML = '<p>Erreur chargement tableau de bord.</p>';
    }
}

function generateDashboardCard(item) {
    let imgSrc = '';
    let title = item.title;
    let subtitle = '';
    let badge = '';
    let clickAction = '';
    let imgClass = '';

    if (item.dataType === 'vinyl') {
        imgSrc = item.coverUrl || 'https://via.placeholder.com/500?text=No+Cover';
        subtitle = item.artist;
        badge = `<span class="badge" style="background:#9b59b6">Vinyle</span>`;
        clickAction = `openEditVinylModal(${item.id})`;
        imgClass = 'vinyl-cover-img'; 
    } else {
        imgSrc = item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : 'https://via.placeholder.com/500x750';
        subtitle = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
        
        if (item.dataType === 'movie') {
            badge = `<span class="badge" style="background:#e74c3c">Film</span>`;
            clickAction = `openEditModal(${item.id})`;
        } else {
            badge = `<span class="badge" style="background:#3498db">Série</span>`;
            clickAction = `openEditSeriesModal(${item.id})`;
        }
    }

    return `
        <div class="card">
            <img src="${imgSrc}" class="${imgClass}" onclick="${clickAction}">
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div style="font-size:0.8em; color:#666; margin-bottom:5px;">${subtitle}</div>
                <div class="badge-container">${badge}</div>
            </div>
        </div>
    `;
}

// --- 4. RECHERCHE & FILTRES ---

function search() {
    const q = document.getElementById('searchInput').value;
    if (!q) { resetView(); return; }

    const tb1 = document.getElementById('moviesToolbar');
    const tb2 = document.getElementById('vinylsToolbar');
    if(tb1) tb1.style.display = 'none';
    if(tb2) tb2.style.display = 'none';

    document.getElementById('myCollection').classList.add('grid');

    if(currentTab === 'movies' && typeof searchMovies === 'function') searchMovies(q); 
    else if (currentTab === 'series' && typeof searchSeries === 'function') searchSeries(q);
    else if (currentTab === 'vinyls' && typeof searchVinyls === 'function') searchVinyls(q);
    else if (currentTab === 'dashboard') {
        switchTab('movies'); 
        setTimeout(() => search(), 100); 
    }
}

function resetView() {
    document.getElementById('searchInput').value = '';
    
    const moviesToolbar = document.getElementById('moviesToolbar');
    const vinylsToolbar = document.getElementById('vinylsToolbar');
    if(moviesToolbar) moviesToolbar.style.display = 'none';
    if(vinylsToolbar) vinylsToolbar.style.display = 'none';

    if (currentTab === 'movies' || currentTab === 'series') {
        if (moviesToolbar) moviesToolbar.style.display = 'flex';
    } else if (currentTab === 'vinyls') {
        if (vinylsToolbar) vinylsToolbar.style.display = 'flex';
    }

    loadContent();
}

function refreshFilters() {
    if (currentTab === 'movies' && typeof filterMovies === 'function') filterMovies();
    else if (currentTab === 'series' && typeof filterSeries === 'function') filterSeries();
    else if (currentTab === 'vinyls' && typeof filterVinyls === 'function') filterVinyls();
}

// --- 5. UTILITAIRES & MODALES ---

function updateComboOptions() {
    const formatEl = document.querySelector('input[name="format"]:checked');
    if (!formatEl) return;
    const format = formatEl.value;
    const chkBr = document.getElementById('checkIncludeBR');
    const chkDvd = document.getElementById('checkIncludeDVD');

    if (chkBr) { chkBr.disabled = false; chkBr.parentElement.style.opacity = "1"; }
    if (chkDvd) { chkDvd.disabled = false; chkDvd.parentElement.style.opacity = "1"; }

    if (format === 'DVD' && chkDvd) {
        chkDvd.checked = false; chkDvd.disabled = true; chkDvd.parentElement.style.opacity = "0.5"; 
    } else if (format === 'BLURAY' && chkBr) {
        chkBr.checked = false; chkBr.disabled = true; chkBr.parentElement.style.opacity = "0.5"; 
    }
}

function toggleMobileFilters() {
    const toolbar = document.getElementById('moviesToolbar');
    if(toolbar) toolbar.classList.toggle('mobile-open');
}

// --- NOTIFICATIONS & CONFIRMATION ---

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = '<i class="fas fa-check-circle"></i>';
    if(type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    if(type === 'info') icon = '<i class="fas fa-info-circle"></i>';

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

let currentConfirmCallback = null;
function openConfirmModal(message, onConfirm) {
    document.getElementById('confirmMessage').innerText = message;
    currentConfirmCallback = onConfirm;
    const btnConfirm = document.getElementById('btnConfirmAction');
    btnConfirm.onclick = function() {
        if (currentConfirmCallback) currentConfirmCallback();
        closeConfirmModal();
    };
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    currentConfirmCallback = null;
}

function closeModal() {
    document.getElementById('movieModal').style.display = 'none';
    if(typeof editingMovieId !== 'undefined') editingMovieId = null;
}

// --- LOGOUT & EVENTS ---

window.onclick = function(event) {
    const movieModal = document.getElementById('movieModal');
    const vinylModal = document.getElementById('vinylModal');
    const confirmModal = document.getElementById('confirmModal');

    if (event.target == movieModal) closeModal();
    if (event.target == vinylModal && typeof closeVinylModal === 'function') closeVinylModal();
    if (event.target == confirmModal) closeConfirmModal();
}

function logout() {
    localStorage.removeItem('myAppUser');
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', initApp);