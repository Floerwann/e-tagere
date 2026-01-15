let allVinylsData = [];
let currentVinylDiscogsData = null; 
let editingVinylId = null;

// --- 1. CHARGEMENT ---
async function loadVinyls() {
    // UI Setup
    document.getElementById('collectionTitle').innerText = "Ma Discothèque";
    document.getElementById('moviesToolbar').style.display = 'none'; // On cache les filtres Films/Séries pour l'instant

    try {
        const res = await fetch(`${API_URL}/vinyls?userId=${currentUser.id}`);
        allVinylsData = await res.json();
        renderVinylsGrid(allVinylsData);
    } catch (e) { console.error("Erreur chargement vinyles", e); }
}

// --- 2. AFFICHAGE (Version Carrée Propre) ---
function renderVinylsGrid(list) {
    const div = document.getElementById('myCollection');
    div.innerHTML = '';
    
    if(list.length === 0) { div.innerHTML = '<p style="padding:20px; color:#666">Aucun vinyle.</p>'; return; }

    list.forEach(v => {
        // Badges Vinyle
        let badges = `<span class="badge" style="background:#333">${v.format}</span>`;
        badges += `<span class="badge" style="background:#666">${v.rpm}</span>`;
        
        if(v.condition === 'M' || v.condition === 'NM') badges += `<span class="badge" style="background:#27ae60">${v.condition}</span>`;
        else badges += `<span class="badge" style="background:#f39c12">${v.condition || '?'}</span>`;
        
        if(v.color && v.color.toLowerCase() !== 'noir' && v.color !== '') {
            badges += `<span class="badge" style="background:#9b59b6">${v.color}</span>`;
        }

        // Image
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

// --- 3. RECHERCHE DISCOGS ---
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
            
            // ICI : On a ajouté la classe 'vinyl-cover-img' pour forcer le carré !
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

// --- 4. MODALES ---

async function openAddVinylModal(discogsItem) {
    editingVinylId = null;
    currentVinylDiscogsData = discogsItem;

    // A. PRÉ-AFFICHAGE
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

    // B. SÉCURITÉ : ON BLOQUE LE BOUTON PENDANT LE CHARGEMENT 🔒
    const btnSave = document.getElementById('btnSaveVinyl');
    btnSave.innerText = "Recherche des détails...";
    btnSave.disabled = true;         // Impossible de cliquer
    btnSave.style.opacity = "0.5";   // Visuellement grisé
    btnSave.style.cursor = "not-allowed";

    // Indicateur visuel dans le champ
    document.getElementById('vinylColor').value = "Chargement..."; 
    document.getElementById('vinylFormat').value = "LP";
    
    document.getElementById('vinylModal').style.display = 'flex';

    // C. APPEL API
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

    // D. PLAN B
    fillBasicForm(discogsItem);
}

// --- FONCTION 1 : Remplissage Détaillé ---
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
        
        // TA LISTE NOIRE EST ICI (Ajoutes-y tes mots)
        const ignored = [
            'Vinyl', 'LP', 'Album', 'Reissue', 'Repress', 'Stereo', '33 RPM', '45 RPM',
            'Gatefold', 'Club Edition', 'Remastered', 'Limited Edition', 'Deluxe'
        ];
        
        let colorParts = [];
        if(rawText && !ignored.includes(rawText)) colorParts.push(rawText);
        desc.forEach(d => { if (!ignored.includes(d) && !d.match(/^\d/)) colorParts.push(d); });

        const finalInfo = [...new Set(colorParts)].join(', ') || "Noir";
        document.getElementById('vinylColor').value = finalInfo;
    }

    // 2. ÉTAT PAR DÉFAUT (ICI)
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

// --- FONCTION 2 : Remplissage Basique ---
function fillBasicForm(item) {
    document.getElementById('vinylColor').value = "Noir";
    
    // ÉTAT PAR DÉFAUT (ICI AUSSI)
    document.getElementById('vinylCondition').value = 'NM'; 
    
    document.getElementById('vinylPressingYear').value = item.year || '';
    document.getElementById('vinylLabel').value = item.label || '';
    document.getElementById('vinylCatNo').value = item.catno || '';
    
    // ON DÉBLOQUE LE BOUTON
    let artist = item.title.split(' - ')[0];
    enableSaveButton(artist, item.title.split(' - ')[1]);
}

// --- UTILITAIRE POUR DÉBLOQUER ---
function enableSaveButton(artist, title) {
    const btnSave = document.getElementById('btnSaveVinyl');
    btnSave.innerText = "Ajouter à ma Discothèque";
    btnSave.disabled = false;        // Clic autorisé !
    btnSave.style.opacity = "1";     // Couleur normale
    btnSave.style.cursor = "pointer";
    
    // On attache l'action de sauvegarde
    btnSave.onclick = () => saveVinyl(artist, title);
}

// B. MODIFICATION
function openEditVinylModal(localId) {
    const v = allVinylsData.find(i => i.id === localId);
    if(!v) return;

    editingVinylId = localId;

    document.getElementById('vinylModalTitle').innerText = `${v.artist} - ${v.title}`;
    document.getElementById('vinylActionTitle').innerText = "Modifier le Vinyle";
    document.getElementById('btnSaveVinyl').innerText = "Mettre à jour";

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

    // On passe artist/title en paramètre pour la sauvegarde
    document.getElementById('btnSaveVinyl').onclick = () => saveVinyl(v.artist, v.title);
    document.getElementById('vinylModal').style.display = 'flex';
}

// C. SAUVEGARDE
async function saveVinyl(artistName, albumTitle) {
    const bodyData = {
        userId: currentUser.id,
        artist: artistName,
        title: albumTitle,
        coverUrl: document.getElementById('vinylCoverInput').value, // L'URL modifiée par l'user
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

    // Si AJOUT, on ajoute l'ID Discogs
    if (!editingVinylId && currentVinylDiscogsData) {
        bodyData.tmdbId = currentVinylDiscogsData.id; 
    }

    let url = `${API_URL}/vinyls`;
    let method = 'POST';

    if (editingVinylId) {
        url = `${API_URL}/vinyls/${editingVinylId}`;
        method = 'PUT';
    }

    const res = await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(bodyData)
    });

    if(res.ok) {
        closeVinylModal();
        loadVinyls(); // Rechargement de la grille
    } else {
        alert("Erreur sauvegarde vinyle");
    }
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

async function deleteVinyl(id) {
    if(!confirm('Supprimer ce vinyle ?')) return;
    await fetch(`${API_URL}/vinyls/${id}`, { method: 'DELETE' });
    loadVinyls();
}