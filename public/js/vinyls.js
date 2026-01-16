let allVinylsData = [];
let currentVinylDiscogsData = null; 
let editingVinylId = null;

// ==========================================
// 1. CHARGEMENT & FILTRES
// ==========================================

async function loadVinyls() {
    // UI Setup
    document.getElementById('collectionTitle').innerText = "Ma Discothèque";
    // Note : L'affichage de la toolbar 'vinylsToolbar' est géré par main.js (switchTab)

    try {
        const res = await fetch(`${API_URL}/vinyls?userId=${currentUser.id}`);
        allVinylsData = await res.json();
        
        // On applique les filtres tout de suite
        filterVinyls();
        
    } catch (e) { console.error("Erreur chargement vinyles", e); }
}

// --- FONCTION DE FILTRAGE BLINDÉE ---
function filterVinyls() {
    // 1. Récupération des valeurs
    const formatVal = document.getElementById('filterVinylFormat').value;
    const rpmVal = document.getElementById('filterVinylRpm').value;
    const sortVal = document.getElementById('sortVinylSelect').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    // 2. Filtrage
    let filtered = allVinylsData.filter(v => {
        const matchesSearch = (v.artist || "").toLowerCase().includes(searchQuery) || (v.title || "").toLowerCase().includes(searchQuery);
        const matchesFormat = (formatVal === 'all') ? true : (v.format === formatVal);
        const matchesRpm = (rpmVal === 'all') ? true : (v.rpm === rpmVal);
        return matchesSearch && matchesFormat && matchesRpm;
    });

    // --- FONCTION "SHERLOCK" POUR TROUVER L'ANNÉE ---
    function getVinylYear(item) {
        // Liste de tous les endroits possibles où l'année peut se cacher
        const candidates = [
            item.originalYear,   // Nom qu'on utilise à la sauvegarde
            item.year,           // Nom souvent utilisé par Discogs
            item.pressingYear,   // Année de pressage
            item.released,       // Autre nom Discogs
            item.date            // Au cas où
        ];

        for (let val of candidates) {
            if (!val) continue; 
            // On cherche un nombre de 4 chiffres commençant par 19 ou 20
            const match = String(val).match(/(19|20)\d{2}/);
            if (match) {
                return parseInt(match[0]); 
            }
        }
        return 0; 
    }
    // -------------------------------------------------------

    // 3. Tri
    filtered.sort((a, b) => {
        // Date d'ajout (ID)
        if (sortVal === 'date_desc') return b.id - a.id;
        if (sortVal === 'date_asc') return a.id - b.id;
        
        // Alphabétique Artiste
        if (sortVal === 'artist_asc') return (a.artist || "").localeCompare(b.artist || "");
        if (sortVal === 'artist_desc') return (b.artist || "").localeCompare(a.artist || "");
        
        // --- TRI PAR ANNÉE ---
        const yearA = getVinylYear(a);
        const yearB = getVinylYear(b);

        if (sortVal === 'year_desc') return yearB - yearA; // Récent -> Vieux
        if (sortVal === 'year_asc') return yearA - yearB; // Vieux -> Récent
        
        return 0;
    });

    // 4. Affichage
    renderVinylsGrid(filtered);
    
    const count = filtered.length;
    const label = count > 1 ? 'Vinyles' : 'Vinyle';
    const badge = document.getElementById('vinylCountBadge');
    if(badge) badge.innerText = `${count} ${label}`;
}

// ==========================================
// 2. AFFICHAGE (GRILLE)
// ==========================================

function renderVinylsGrid(list) {
    const div = document.getElementById('myCollection');
    div.innerHTML = '';
    
    if(list.length === 0) { div.innerHTML = '<p style="padding:20px; color:#666">Aucun vinyle trouvé.</p>'; return; }

    list.forEach(v => {
        // Création des badges
        let badges = `<span class="badge" style="background:#333">${v.format}</span>`;
        badges += `<span class="badge" style="background:#666">${v.rpm}</span>`;
        
        // Badge État (Condition)
        if(v.condition === 'M' || v.condition === 'NM') badges += `<span class="badge" style="background:#27ae60">${v.condition}</span>`;
        else badges += `<span class="badge" style="background:#f39c12">${v.condition || '?'}</span>`;
        
        // Badge Couleur (Sauf si Noir)
        if(v.color && v.color.toLowerCase() !== 'noir' && v.color !== '') {
            badges += `<span class="badge" style="background:#9b59b6">${v.color}</span>`;
        }

        const imgSrc = v.coverUrl || 'https://via.placeholder.com/500?text=No+Cover';

        div.innerHTML += `
            <div class="card">
                <img src="${imgSrc}" class="vinyl-cover-img" onclick="openEditVinylModal(${v.id})">
                
                <div class="card-body">
                    <div class="card-title">${v.artist} - ${v.title}</div>
                    <div class="badge-container">${badges}</div>
                    <div class="card-actions">
                        <button class="btn-action btn-edit" onclick="openEditVinylModal(${v.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn-action btn-delete" onclick="deleteVinyl(${v.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });
}

// ==========================================
// 3. RECHERCHE DISCOGS
// ==========================================

async function searchVinyls(query) {
    const div = document.getElementById('myCollection');
    document.getElementById('collectionTitle').innerText = `Recherche Discogs "${query}"`;
    div.innerHTML = '<p>Recherche chez les disquaires...</p>';

    try {
        const res = await fetch(`${API_URL}/vinyls/search?q=${query}`);
        const results = await res.json();
        div.innerHTML = '';

        if (results.length === 0) {
            div.innerHTML = '<p>Aucun résultat trouvé.</p>';
            return;
        }

        results.forEach(item => {
            // Gestion image par défaut
            const img = item.cover_image && !item.cover_image.includes('spacer') ? item.cover_image : 'https://via.placeholder.com/150?text=No+Cover';
            
            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => openAddVinylModal(item);
            
            // On force le carré aussi pour la recherche
            card.innerHTML = `
                <img src="${img}" class="vinyl-cover-img"> 
                <div class="card-body" style="background:#f4f4f4">
                    <div class="card-title">${item.title}</div>
                    <div style="font-size:0.8em; color:#666;">${item.year || ''} • ${item.label || ''}</div>
                    <div style="font-size:0.7em; color:#888;">${item.catno || ''}</div>
                </div>`;
            div.appendChild(card);
        });
    } catch (e) { 
        console.error(e);
        div.innerHTML = '<p>Erreur lors de la recherche.</p>'; 
    }
}

// ==========================================
// 4. MODALES (AJOUT / ÉDITION)
// ==========================================

async function openAddVinylModal(discogsItem) {
    editingVinylId = null;
    currentVinylDiscogsData = discogsItem;

    // A. PRÉ-AFFICHAGE BASIQUE
    let artist = "Artiste Inconnu";
    let title = discogsItem.title;
    if (discogsItem.title.includes(' - ')) {
        const parts = discogsItem.title.split(' - ');
        artist = parts[0];
        title = parts.slice(1).join(' - ');
    }

    // Titres
    document.getElementById('vinylModalTitle').innerText = `${artist} - ${title}`;
    document.getElementById('vinylActionTitle').innerText = "Ajouter ce Vinyle";
    
    // Image
    const imgUrl = discogsItem.cover_image || '';
    document.getElementById('vinylModalImg').src = imgUrl;
    document.getElementById('vinylCoverInput').value = imgUrl;

    // --- MISE A JOUR DU LIEN DISCOGS (COMPLIANCE) ---
    const discogsLink = document.getElementById('discogsLink');
    if (discogsLink) {
        const type = discogsItem.type || 'release';
        discogsLink.href = `https://www.discogs.com/${type}/${discogsItem.id}`;
        discogsLink.style.display = 'inline-flex';
    }
    // -----------------------------------------------

    // B. SÉCURITÉ : ON BLOQUE LE BOUTON PENDANT LE CHARGEMENT 🔒
    const btnSave = document.getElementById('btnSaveVinyl');
    btnSave.innerText = "Recherche des détails...";
    btnSave.disabled = true;         
    btnSave.style.opacity = "0.5";   
    btnSave.style.cursor = "not-allowed";

    // Indicateur visuel
    document.getElementById('vinylColor').value = "Chargement..."; 
    document.getElementById('vinylFormat').value = "LP";
    
    document.getElementById('vinylModal').style.display = 'flex';

    // C. APPEL API DÉTAILLÉ
    try {
        if (discogsItem.type === 'release') {
            const res = await fetch(`${API_URL}/vinyls/details/${discogsItem.id}`);
            if (res.ok) {
                const details = await res.json();
                fillDetailedForm(details, discogsItem); 
                return; 
            }
        }
    } catch (e) {
        console.log("Erreur détails, passage en mode basique.");
    }

    // D. PLAN B (Si échec)
    fillBasicForm(discogsItem);
}

// --- UTILITAIRE 1 : Remplissage Détaillé ---
function fillDetailedForm(details, basicItem) {
    
    // 1. FORMAT & COULEUR
    if (details.formats && details.formats.length > 0) {
        const fmt = details.formats[0];
        const desc = fmt.descriptions || [];
        
        let detectedFormat = 'LP';
        if (fmt.name === '7"' || desc.includes('7"') || desc.includes('Single')) detectedFormat = 'Single';
        else if (desc.includes('10"') || (desc.includes('12"') && desc.includes('EP'))) detectedFormat = 'EP';
        else if (desc.includes('Box Set')) detectedFormat = 'Coffret';
        document.getElementById('vinylFormat').value = detectedFormat;

        if (desc.includes('45 RPM')) document.getElementById('vinylRpm').value = '45T';
        else document.getElementById('vinylRpm').value = '33T';

        const rawText = fmt.text || ""; 
        
        const ignored = [
            'Vinyl', 'LP', 'Album', 'Reissue', 'Repress', 'Stereo', '33 RPM', '45 RPM',
            'Gatefold', 'Club Edition', 'Remastered', 'Limited Edition', 'Deluxe', 'Enhanced', 'All Media'
        ];
        
        let colorParts = [];
        if(rawText && !ignored.includes(rawText)) colorParts.push(rawText);
        desc.forEach(d => { if (!ignored.includes(d) && !d.match(/^\d/)) colorParts.push(d); });

        const finalInfo = [...new Set(colorParts)].join(', ') || "Noir";
        document.getElementById('vinylColor').value = finalInfo;
    }

    // 2. ÉTAT PAR DÉFAUT
    document.getElementById('vinylCondition').value = 'NM'; 

    // 3. DATES & LABELS
    document.getElementById('vinylPressingYear').value = details.released || basicItem.year || '';
    if (details.labels && details.labels.length > 0) {
        document.getElementById('vinylLabel').value = details.labels[0].name;
        document.getElementById('vinylCatNo').value = details.labels[0].catno;
    }

    // ON DÉBLOQUE LE BOUTON
    enableSaveButton(details.artists_sort || basicItem.title.split(' - ')[0], details.title);
}

// --- UTILITAIRE 2 : Remplissage Basique ---
function fillBasicForm(item) {
    document.getElementById('vinylColor').value = "Noir";
    document.getElementById('vinylCondition').value = 'NM'; 
    
    document.getElementById('vinylPressingYear').value = item.year || '';
    document.getElementById('vinylLabel').value = item.label || '';
    document.getElementById('vinylCatNo').value = item.catno || '';
    
    let artist = item.title.split(' - ')[0];
    enableSaveButton(artist, item.title.split(' - ')[1]);
}

// --- UTILITAIRE 3 : Débloquer le bouton ---
function enableSaveButton(artist, title) {
    const btnSave = document.getElementById('btnSaveVinyl');
    btnSave.innerText = "Ajouter à ma Discothèque";
    btnSave.disabled = false;
    btnSave.style.opacity = "1";
    btnSave.style.cursor = "pointer";
    btnSave.onclick = () => saveVinyl(artist, title);
}

// --- MODIFICATION D'UN VINYLE EXISTANT ---
function openEditVinylModal(localId) {
    const v = allVinylsData.find(i => i.id === localId);
    if(!v) return;

    editingVinylId = localId;

    document.getElementById('vinylModalTitle').innerText = `${v.artist} - ${v.title}`;
    document.getElementById('vinylActionTitle').innerText = "Modifier le Vinyle";
    document.getElementById('btnSaveVinyl').innerText = "Mettre à jour";
    
    // Pas de blocage ici car on a déjà les données
    const btnSave = document.getElementById('btnSaveVinyl');
    btnSave.disabled = false;
    btnSave.style.opacity = "1";
    btnSave.style.cursor = "pointer";

    document.getElementById('vinylModalImg').src = v.coverUrl;
    document.getElementById('vinylCoverInput').value = v.coverUrl;
    document.getElementById('vinylOriginalYear').innerText = v.originalYear || '?';

    // Remplissage Champs
    document.getElementById('vinylPressingYear').value = v.pressingYear || '';
    document.getElementById('vinylLabel').value = v.label || '';
    document.getElementById('vinylFormat').value = v.format;
    document.getElementById('vinylRpm').value = v.rpm;
    document.getElementById('vinylColor').value = v.color || '';
    document.getElementById('vinylCondition').value = v.condition;
    document.getElementById('vinylCatNo').value = v.catalogNumber || '';
    document.getElementById('vinylEdition').value = v.edition || '';

    // --- MISE A JOUR DU LIEN DISCOGS (COMPLIANCE) ---
    const discogsLink = document.getElementById('discogsLink');
    if (discogsLink) {
        // 'tmdbId' dans ta BDD vinyles contient l'ID Discogs
        if (v.tmdbId && v.tmdbId !== 0) {
            // On pointe vers 'release' par défaut
            discogsLink.href = `https://www.discogs.com/release/${v.tmdbId}`;
            discogsLink.style.display = 'inline-flex';
        } else {
            discogsLink.style.display = 'none'; // Pas de lien si pas d'ID
        }
    }
    // -----------------------------------------------

    // On passe artist/title en paramètre pour la sauvegarde
    document.getElementById('btnSaveVinyl').onclick = () => saveVinyl(v.artist, v.title);
    document.getElementById('vinylModal').style.display = 'flex';
}

// ==========================================
// 5. SAUVEGARDE & SUPPRESSION
// ==========================================

async function saveVinyl(artistName, albumTitle) {
    const bodyData = {
        userId: currentUser.id,
        artist: artistName,
        title: albumTitle,
        coverUrl: document.getElementById('vinylCoverInput').value,
        originalYear: document.getElementById('vinylOriginalYear').innerText,
        
        pressingYear: document.getElementById('vinylPressingYear').value,
        label: document.getElementById('vinylLabel').value,
        format: document.getElementById('vinylFormat').value,
        rpm: document.getElementById('vinylRpm').value,
        color: document.getElementById('vinylColor').value,
        condition: document.getElementById('vinylCondition').value,
        catalogNumber: document.getElementById('vinylCatNo').value,
        edition: document.getElementById('vinylEdition').value
    };

    // Si AJOUT, on ajoute l'ID Discogs (stocké dans currentVinylDiscogsData)
    if (!editingVinylId && currentVinylDiscogsData) {
        bodyData.tmdbId = currentVinylDiscogsData.id; 
    }

    let url = `${API_URL}/vinyls`;
    let method = 'POST';

    if (editingVinylId) {
        url = `${API_URL}/vinyls/${editingVinylId}`;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(bodyData)
        });

        if(res.ok) {
            closeVinylModal();
            
            if (editingVinylId) {
                // Si on modifie, on garde le contexte
                loadVinyls(); 
            } else {
                // Si on vient d'ajouter, on reset pour voir la collection
                resetView(); 
            }

            showToast("Vinyle enregistré avec succès !", "success");
        } else {
            showToast("Erreur lors de la sauvegarde.", "error");
        }
    } catch(e) {
        showToast("Erreur de connexion.", "error");
    }
}

// SUPPRESSION
function deleteVinyl(id) {
    openConfirmModal(
        "Voulez-vous vraiment supprimer ce vinyle de votre collection ?", 
        async () => {
            try {
                await fetch(`${API_URL}/vinyls/${id}`, { method: 'DELETE' });
                resetView();
                showToast("Vinyle supprimé.", "info");
            } catch (e) {
                showToast("Erreur lors de la suppression.", "error");
            }
        }
    );
}

// UTILITAIRES
function closeVinylModal() {
    document.getElementById('vinylModal').style.display = 'none';
    editingVinylId = null;
}

function previewVinylImage() {
    const url = document.getElementById('vinylCoverInput').value;
    if(url) document.getElementById('vinylModalImg').src = url;
}