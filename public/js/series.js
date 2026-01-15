let allSeriesData = [];
let currentSeriesMediaData = null;

async function loadSeries() {
    document.getElementById('collectionTitle').innerText = "Mes Séries";
    document.getElementById('collectionTitle').style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/series?userId=${currentUser.id}`);
        allSeriesData = await res.json();
        filterSeries();
    } catch (e) { console.error("Erreur load series", e); }
}

// --- FONCTION D'AFFICHAGE INTELLIGENT (Avec le nouveau champ) ---
function renderSeriesGrid(list) {
    const div = document.getElementById('myCollection');
    div.innerHTML = '';
    
    if(list.length === 0) { 
        div.innerHTML = '<p style="padding:20px; color:#666">Aucune série trouvée.</p>'; 
        return; 
    }

    list.forEach(s => {
        // 1. Calcul du texte de la pastille (Overlay)
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
            // NOUVEAU : On utilise le champ seasonNumber propre !
            if (s.seasonNumber !== null && s.seasonNumber !== undefined) { 
                overlayText = "S" + s.seasonNumber; 
            } else {
                overlayText = "S?"; // Si pas de numéro renseigné
            }
        }

        const overlayBadge = `<div class="poster-overlay ${overlayClass}">${overlayText}</div>`;

        // 2. Badges classiques
        // Badges classiques
        let typeBadge = `<span class="badge" style="background:#e67e22">${s.objectType}</span>`;
        let badges = `<span class="badge ${s.format === '4K' ? 'bg-4k' : s.format === 'BLURAY' ? 'bg-br' : 'bg-dvd'}">${s.format}</span>`;
        
        if(s.includeBluray) badges += `<span class="badge badge-combo" style="background:#007bff;">+ BR</span>`;
        if(s.includeDvd) badges += `<span class="badge badge-combo" style="background:#6c757d;">+ DVD</span>`;
        
        if(s.isSteelbook) badges += `<span class="badge bg-steel">Steelbook</span>`;
        
        // NOUVELLE LIGNE POUR LE FOURREAU
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
    // ... (Rien ne change ici, garde la fonction existante ou copie celle d'avant)
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
        if (sortVal === 'date_desc') return new Date(b.addedAt) - new Date(a.addedAt);
        if (sortVal === 'date_asc') return new Date(a.addedAt) - new Date(b.addedAt);
        if (sortVal === 'alpha_asc') return a.title.localeCompare(b.title);
        return 0;
    });
    renderSeriesGrid(filtered);
    const count = filtered.length;
    const label = count > 1 ? 'Séries' : 'Série'; // Singulier ou Pluriel
    const badge = document.getElementById('countBadge');
    if(badge) badge.innerText = `${count} ${label}`;
}

// --- LOGIQUE D'INTERFACE ---

// Fonction appelée quand on change le menu déroulant
function toggleSeasonNumberField() {
    const type = document.getElementById('seriesObjectType').value;
    const numberContainer = document.getElementById('seasonNumberContainer');
    
    // Si c'est SAISON, on affiche le champ numéro. Sinon on cache.
    if (type === 'SAISON') {
        numberContainer.style.display = 'block';
    } else {
        numberContainer.style.display = 'none';
        document.getElementById('seasonNumberInput').value = ''; // On vide si on cache
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
    
    // Reset valeurs
    document.getElementById('seriesObjectType').value = 'INTEGRALE';
    document.getElementById('seasonNumberInput').value = ''; // Reset numéro
    toggleSeasonNumberField(); // Appelle la logique pour cacher le champ numéro au départ

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
    
    // Remplissage des champs
    document.getElementById('seriesObjectType').value = s.objectType;
    document.getElementById('seasonNumberInput').value = s.seasonNumber || ''; // Remplir le numéro
    toggleSeasonNumberField(); // Affiche/Cache le champ selon la valeur chargée

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
    // On récupère la valeur du nouveau champ
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
        userId: currentUser.id,
        objectType, 
        seasonNumber, // On l'envoie au serveur
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

    const res = await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(bodyData)
    });

    if(res.ok) { 
        closeModal(); 
        if(editingMovieId) loadSeries(); else resetView();
    } else { alert("Erreur sauvegarde série"); }
}

async function deleteSeries(id) {
    if(!confirm('Supprimer cette série ?')) return;
    await fetch(`${API_URL}/series/${id}`, { method: 'DELETE' });
    loadSeries();
}

// Fonction de recherche (tu peux copier celle d'avant, elle ne change pas)
async function searchSeries(query) {
     const div = document.getElementById('myCollection');
    document.getElementById('collectionTitle').innerText = `Résultats Séries "${query}"`;
    div.innerHTML = '<p>Recherche en cours...</p>';

    try {
        const res = await fetch(`${API_URL}/series/search?q=${query}`);
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
    } catch (e) { div.innerHTML = '<p>Erreur.</p>'; }
}