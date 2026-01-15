let allMoviesData = [];
let currentMovieMediaData = null; 
let editingMovieId = null; // Variable globale pour savoir si on modifie ou ajoute

// CHARGEMENT
async function loadMovies() {
    document.getElementById('collectionTitle').innerText = "Ma Collection";
    document.getElementById('collectionTitle').style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/movies?userId=${currentUser.id}`);
        allMoviesData = await res.json();
        filterMovies(); // On filtre direct pour afficher
    } catch (e) { console.error("Erreur load movies", e); }
}

// AFFICHAGE
function renderMoviesGrid(list) {
    const div = document.getElementById('myCollection');
    div.innerHTML = '';
    
    if(list.length === 0) { div.innerHTML = '<p style="padding:20px; color:#666">Rien à afficher.</p>'; return; }

    list.forEach(m => {
        let badges = `<span class="badge ${m.format === '4K' ? 'bg-4k' : m.format === 'BLURAY' ? 'bg-br' : 'bg-dvd'}">${m.format}</span>`;
        
        // Les Combos
        if(m.includeBluray) badges += `<span class="badge badge-combo" style="background:#007bff;">+ BR</span>`;
        if(m.includeDvd) badges += `<span class="badge badge-combo" style="background:#6c757d;">+ DVD</span>`;

        // Les Finitions
        if(m.isSteelbook) badges += `<span class="badge bg-steel">Steelbook</span>`;
        
        // NOUVELLE LIGNE POUR LE FOURREAU (Gris Anthracite)
        if(m.isSlipcover) badges += `<span class="badge" style="background:#34495e;">Fourreau</span>`;

        const imgSrc = m.posterPath ? `https://image.tmdb.org/t/p/w500${m.posterPath}` : 'https://via.placeholder.com/500x750';

        div.innerHTML += `
            <div class="card">
                <img src="${imgSrc}" loading="lazy" onclick="openEditModal(${m.id})">
                <div class="card-body">
                    <div class="card-title">${m.title}</div>
                    <div class="badge-container">${badges}</div>
                    <div class="card-actions">
                        <button class="btn-action btn-edit" onclick="openEditModal(${m.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn-action btn-delete" onclick="deleteMovie(${m.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });
}

// FILTRES
function filterMovies() {
    const formatVal = document.getElementById('filterFormat').value;
    const steelbookVal = document.getElementById('filterSteelbook').checked;
    const sortVal = document.getElementById('sortSelect').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allMoviesData.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchQuery);
        let matchesFormat = (formatVal === 'all') ? true : (m.format === formatVal);
        if (formatVal === 'BLURAY' && (m.includeBluray || m.format === '4K')) matchesFormat = true; 
        if (formatVal === 'DVD' && m.includeDvd) matchesFormat = true;
        
        const matchesSteel = steelbookVal ? m.isSteelbook : true;
        return matchesSearch && matchesFormat && matchesSteel;
    });

    // Tri
    filtered.sort((a, b) => {
        if (sortVal === 'date_desc') return new Date(b.addedAt) - new Date(a.addedAt);
        if (sortVal === 'date_asc') return new Date(a.addedAt) - new Date(b.addedAt);
        if (sortVal === 'alpha_asc') return a.title.localeCompare(b.title);
        if (sortVal === 'year_desc') return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        return 0;
    });

    renderMoviesGrid(filtered);
    const count = filtered.length;
    const label = count > 1 ? 'Films' : 'Film'; // Singulier ou Pluriel
    const badge = document.getElementById('countBadge');
    if(badge) badge.innerText = `${count} ${label}`;
}

// RECHERCHE API TMDB
async function searchMovies(query) {
    const div = document.getElementById('myCollection');
    document.getElementById('collectionTitle').innerText = `Résultats pour "${query}"`;
    div.innerHTML = '<p>Recherche en cours...</p>';

    try {
        const res = await fetch(`${API_URL}/movies/search?q=${query}`);
        const results = await res.json();
        div.innerHTML = ''; // On vide

        results.forEach(movie => {
            if(!movie.poster_path) return;
            const card = document.createElement('div');
            card.className = 'card';
            // Clic sur l'affiche -> Ouvre Modale AJOUT
            card.onclick = () => openAddModal(movie); 
            card.innerHTML = `
                <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}">
                <div class="card-body" style="background:#f4f4f4">
                    <div class="card-title">${movie.title}</div>
                    <div style="font-size:0.8em; color:#666; margin-top:5px;">Clique pour ajouter</div>
                </div>`;
            div.appendChild(card);
        });
    } catch (e) { div.innerHTML = '<p>Erreur recherche.</p>'; }
}

// MODALES
function openAddModal(movieTmdb) {
    editingMovieId = null;
    currentMovieMediaData = movieTmdb; 

    document.getElementById('modalTitle').innerText = movieTmdb.title;
    document.getElementById('modalActionTitle').innerText = "Ajouter un Film";
    document.getElementById('btnSaveMovie').innerText = "Enregistrer le Film";
    
    const imagePath = movieTmdb.backdrop_path || movieTmdb.poster_path;
    document.getElementById('modalImg').src = `https://image.tmdb.org/t/p/w780${imagePath}`;
    document.getElementById('modalOverview').innerText = movieTmdb.overview || '';
    document.getElementById('modalYear').innerText = movieTmdb.release_date ? movieTmdb.release_date.split('-')[0] : '';

    // CACHER option Série
    document.getElementById('seriesTypeSection').style.display = 'none';

    // Reset Form
    document.querySelector(`input[name="format"][value="BLURAY"]`).checked = true; 
    document.getElementById('checkSteelbook').checked = false;
    document.getElementById('editionInput').value = '';
    document.getElementById('checkIncludeBR').checked = false;
    document.getElementById('checkIncludeDVD').checked = false;
    
    updateComboOptions();

    document.getElementById('btnSaveMovie').onclick = saveMovie;
    document.getElementById('movieModal').style.display = 'flex';
}

function openEditModal(localId) {
    const m = allMoviesData.find(i => i.id === localId);
    if(!m) return;

    editingMovieId = localId;
    currentMovieMediaData = m;

    document.getElementById('modalTitle').innerText = m.title;
    document.getElementById('modalActionTitle').innerText = "Modifier le Film";
    document.getElementById('btnSaveMovie').innerText = "Mettre à jour";
    const imagePath = m.backdropPath || m.posterPath;
    document.getElementById('modalImg').src = `https://image.tmdb.org/t/p/w780${imagePath}`;

    document.getElementById('modalOverview').innerText = m.overview || '';
    document.getElementById('modalYear').innerText = m.releaseDate ? m.releaseDate.split('-')[0] : '';

    document.getElementById('seriesTypeSection').style.display = 'none';

    document.querySelector(`input[name="format"][value="${m.format}"]`).checked = true;
    document.getElementById('checkIncludeBR').checked = m.includeBluray;
    document.getElementById('checkIncludeDVD').checked = m.includeDvd;
    document.getElementById('checkSteelbook').checked = m.isSteelbook;
    document.getElementById('checkSlipcover').checked = m.isSlipcover;
    document.getElementById('editionInput').value = m.edition || '';

    updateComboOptions();
    
    document.getElementById('btnSaveMovie').onclick = saveMovie;
    document.getElementById('movieModal').style.display = 'flex';
}

async function saveMovie() {
    const format = document.querySelector('input[name="format"]:checked').value;
    const includeBluray = document.getElementById('checkIncludeBR').checked;
    const includeDvd = document.getElementById('checkIncludeDVD').checked;
    const isSteelbook = document.getElementById('checkSteelbook').checked;
    const isSlipcover = document.getElementById('checkSlipcover').checked;
    const edition = document.getElementById('editionInput').value;

    let url = `${API_URL}/movies`;
    let method = 'POST';

    const bodyData = {
        userId: currentUser.id,
        format, includeBluray, includeDvd, isSteelbook, isSlipcover, edition
    };

    if (editingMovieId) {
        url = `${API_URL}/movies/${editingMovieId}`;
        method = 'PUT';
    } else {
        bodyData.tmdbId = currentMovieMediaData.id;
        bodyData.title = currentMovieMediaData.title;
        bodyData.overview = currentMovieMediaData.overview;
        bodyData.releaseDate = currentMovieMediaData.release_date;
        bodyData.posterPath = currentMovieMediaData.poster_path;
        bodyData.backdropPath = currentMovieMediaData.backdrop_path;
    }

    const res = await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(bodyData)
    });

    if(res.ok) {
        closeModal();
        if(editingMovieId) loadMovies(); else resetView();
    } else { alert("Erreur sauvegarde"); }
}

async function deleteMovie(id) {
    if(!confirm('Supprimer ?')) return;
    await fetch(`${API_URL}/movies/${id}`, { method: 'DELETE' });
    loadMovies();
}