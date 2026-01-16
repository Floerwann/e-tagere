let allSeriesData = [];
let currentSeriesMediaData = null;

async function loadSeries() {
    document.getElementById('collectionTitle').innerText = "Mes Séries";
    document.getElementById('collectionTitle').style.display = 'block';

    try {
        const res = await authFetch(`${API_URL}/series`);
        if(res) {
            allSeriesData = await res.json();
            filterSeries();
        }
    } catch (e) { console.error("Erreur load series", e); }
}

function renderSeriesGrid(list) {
    const div = document.getElementById('myCollection');
    div.innerHTML = '';
    
    if(list.length === 0) { 
        div.innerHTML = '<p style="padding:20px; color:#666">Aucune série trouvée.</p>'; 
        return; 
    }

    list.forEach(s => {
        let overlayText = "";
        let overlayClass = "";

        if (s.objectType === 'INTEGRALE') {
            overlayText = "INT";
            overlayClass = "overlay-INT";
        } 
        else if (s.objectType === 'COFFRET') {
            overlayText = "BOX";
            overlayClass = "overlay-COFFRET";
        }
        else if (s.objectType === 'SAISON') {
            overlayClass = "overlay-SAISON";
            if (s.seasonNumber !== null && s.seasonNumber !== undefined) { 
                overlayText = "S" + s.seasonNumber; 
            } else {
                overlayText = "S?";
            }
        }

        const overlayBadge = `<div class="poster-overlay ${overlayClass}">${overlayText}</div>`;

        let typeBadge = `<span class="badge" style="background:#e67e22">${s.objectType}</span>`;
        let badges = `<span class="badge ${s.format === '4K' ? 'bg-4k' : s.format === 'BLURAY' ? 'bg-br' : 'bg-dvd'}">${s.format}</span>`;
        
        if(s.includeBluray) badges += `<span class="badge badge-combo" style="background:#007bff;">+ BR</span>`;
        if(s.includeDvd) badges += `<span class="badge badge-combo" style="background:#6c757d;">+ DVD</span>`;
        if(s.isSteelbook) badges += `<span class="badge bg-steel">Steelbook</span>`;
        if(s.isSlipcover) badges += `<span class="badge" style="background:#34495e;">Fourreau</span>`;
        
        div.innerHTML += `
            <div class="card" style="position: relative;">
                ${overlayBadge}
                <img src="https://image.tmdb.org/t/p/w500${s.posterPath}" onclick="openEditSeriesModal(${s.id})">
                <div class="card-body">
                    <div class="card-title">${s.title}</div>
                    <div class="badge-container">${typeBadge} ${badges}</div>
                    <div class="card-actions">
                        <button class="btn-action btn-edit" onclick="openEditSeriesModal(${s.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn-action btn-delete" onclick="deleteSeries(${s.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });
}

function filterSeries() {
    const typeVal = document.getElementById('filterSeriesType').value;
    const formatVal = document.getElementById('filterFormat').value;
    const steelbookVal = document.getElementById('filterSteelbook').checked;
    const sortVal = document.getElementById('sortSelect').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allSeriesData.filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(searchQuery);
        const matchesType = (typeVal === 'all') || (s.objectType === typeVal);
        let matchesFormat = (formatVal === 'all') ? true : (s.format === formatVal);
        if (formatVal === 'BLURAY' && (s.includeBluray || s.format === '4K')) matchesFormat = true;
        if (formatVal === 'DVD' && s.includeDvd) matchesFormat = true;
        const matchesSteel = steelbookVal ? s.isSteelbook : true;
        return matchesSearch && matchesType && matchesFormat && matchesSteel;
    });

    filtered.sort((a, b) => {
        if (sortVal === 'date_desc') return b.id - a.id;
        if (sortVal === 'date_asc') return a.id - b.id;
        if (sortVal === 'alpha_asc') return a.title.localeCompare(b.title);
        if (sortVal === 'alpha_desc') return b.title.localeCompare(a.title);

        const yearA = a.releaseDate ? parseInt(a.releaseDate.toString().substring(0, 4)) : 0;
        const yearB = b.releaseDate ? parseInt(b.releaseDate.toString().substring(0, 4)) : 0;

        if (sortVal === 'year_desc') return yearB - yearA;
        if (sortVal === 'year_asc') return yearA - yearB;
        
        return 0;
    });

    renderSeriesGrid(filtered);
    const count = filtered.length;
    const label = count > 1 ? 'Séries' : 'Série'; 
    const badge = document.getElementById('countBadge');
    if(badge) badge.innerText = `${count} ${label}`;
}

function toggleSeasonNumberField() {
    const type = document.getElementById('seriesObjectType').value;
    const numberContainer = document.getElementById('seasonNumberContainer');
    if (type === 'SAISON') {
        numberContainer.style.display = 'block';
    } else {
        numberContainer.style.display = 'none';
        document.getElementById('seasonNumberInput').value = ''; 
    }
}

function openAddSeriesModal(tmdbData) {
    editingMovieId = null;
    currentSeriesMediaData = tmdbData; 

    document.getElementById('modalTitle').innerText = tmdbData.title;
    document.getElementById('modalActionTitle').innerText = "Ajouter Série";
    document.getElementById('btnSaveMovie').innerText = "Enregistrer la Série";
    
    const imagePath = tmdbData.backdrop_path || tmdbData.poster_path;
    document.getElementById('modalImg').src = `https://image.tmdb.org/t/p/w780${imagePath}`;
    document.getElementById('modalOverview').innerText = tmdbData.overview || '';
    document.getElementById('modalYear').innerText = tmdbData.release_date ? tmdbData.release_date.split('-')[0] : '';
    document.getElementById('seriesTypeSection').style.display = 'block';
    
    document.getElementById('seriesObjectType').value = 'INTEGRALE';
    document.getElementById('seasonNumberInput').value = ''; 
    toggleSeasonNumberField(); 

    document.querySelector(`input[name="format"][value="DVD"]`).checked = true;
    document.getElementById('checkSteelbook').checked = false;
    document.getElementById('editionInput').value = '';
    
    updateComboOptions();
    document.getElementById('btnSaveMovie').onclick = saveSeries;
    document.getElementById('movieModal').style.display = 'flex';
}

function openEditSeriesModal(localId) {
    const s = allSeriesData.find(i => i.id === localId);
    if(!s) return;
    
    editingMovieId = localId;
    currentSeriesMediaData = s;

    document.getElementById('modalTitle').innerText = s.title;
    document.getElementById('modalActionTitle').innerText = "Modifier Série";
    document.getElementById('btnSaveMovie').innerText = "Mettre à jour";
    const imagePath = s.backdropPath || s.posterPath;
    document.getElementById('modalImg').src = `https://image.tmdb.org/t/p/w780${imagePath}`;
    document.getElementById('modalOverview').innerText = s.overview || '';
    document.getElementById('modalYear').innerText = s.releaseDate ? s.releaseDate.split('-')[0] : '';
    document.getElementById('seriesTypeSection').style.display = 'block';
    
    document.getElementById('seriesObjectType').value = s.objectType;
    document.getElementById('seasonNumberInput').value = s.seasonNumber || ''; 
    toggleSeasonNumberField(); 

    document.querySelector(`input[name="format"][value="${s.format}"]`).checked = true;
    document.getElementById('checkIncludeBR').checked = s.includeBluray;
    document.getElementById('checkIncludeDVD').checked = s.includeDvd;
    document.getElementById('checkSteelbook').checked = s.isSteelbook;
    document.getElementById('checkSlipcover').checked = s.isSlipcover;
    document.getElementById('editionInput').value = s.edition || '';
    
    updateComboOptions();
    document.getElementById('btnSaveMovie').onclick = saveSeries;
    document.getElementById('movieModal').style.display = 'flex';
}

async function saveSeries() {
    const objectType = document.getElementById('seriesObjectType').value;
    const seasonNumber = document.getElementById('seasonNumberInput').value; 
    const format = document.querySelector('input[name="format"]:checked').value;
    const includeBluray = document.getElementById('checkIncludeBR').checked;
    const includeDvd = document.getElementById('checkIncludeDVD').checked;
    const isSteelbook = document.getElementById('checkSteelbook').checked;
    const isSlipcover = document.getElementById('checkSlipcover').checked;
    const edition = document.getElementById('editionInput').value;

    let url = `${API_URL}/series`;
    let method = 'POST';
    
    const bodyData = {
        objectType, seasonNumber, 
        format, includeBluray, includeDvd, isSteelbook, isSlipcover, edition
    };

    if (editingMovieId) { 
        url = `${API_URL}/series/${editingMovieId}`; 
        method = 'PUT';
    } else {
        bodyData.tmdbId = currentSeriesMediaData.id;
        bodyData.title = currentSeriesMediaData.title;
        bodyData.overview = currentSeriesMediaData.overview;
        bodyData.releaseDate = currentSeriesMediaData.release_date;
        bodyData.posterPath = currentSeriesMediaData.poster_path;
        bodyData.backdropPath = currentSeriesMediaData.backdrop_path;
    }

    try {
        const res = await authFetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bodyData)
        });

        if(res && res.ok) { 
            closeModal(); 
            if(editingMovieId) loadSeries(); else resetView();
            showToast("Série enregistrée !", "success");
        } else { 
            showToast("Erreur lors de la sauvegarde.", "error"); 
        }
    } catch(e) {
        showToast("Erreur de connexion.", "error");
    }
}

function deleteSeries(id) {
    openConfirmModal(
        "Voulez-vous vraiment supprimer cette série de votre collection ?",
        async () => {
            try {
                const res = await authFetch(`${API_URL}/series/${id}`, { method: 'DELETE' });
                if (res && res.ok) {
                    resetView();
                    showToast("Série supprimée.", "info");
                }
            } catch (e) {
                showToast("Erreur lors de la suppression.", "error");
            }
        }
    );
}

async function searchSeries(query) {
     const div = document.getElementById('myCollection');
    document.getElementById('collectionTitle').innerText = `Résultats Séries "${query}"`;
    div.innerHTML = '<p>Recherche en cours...</p>';

    try {
        const res = await authFetch(`${API_URL}/series/search?q=${query}`);
        if(res) {
            const results = await res.json();
            div.innerHTML = '';
            results.forEach(item => {
                if(!item.poster_path) return;
                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = () => openAddSeriesModal(item);
                card.innerHTML = `
                    <img src="https://image.tmdb.org/t/p/w500${item.poster_path}">
                    <div class="card-body" style="background:#f4f4f4">
                        <div class="card-title">${item.title}</div>
                        <div style="font-size:0.8em; color:#666; margin-top:5px;">Ajouter Série</div>
                    </div>`;
                div.appendChild(card);
            });
        }
    } catch (e) { div.innerHTML = '<p>Erreur.</p>'; }
}