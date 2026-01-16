const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

// 1. RÉCUPÉRER MA COLLECTION VINYLES
router.get('/', async (req, res) => {
    const { userId } = req.query;
    try {
        const vinyls = await prisma.vinyl.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { addedAt: 'desc' }
        });
        res.json(vinyls);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur chargement vinyles" });
    }
});

// 2. RECHERCHE DISCOGS (Version TOKEN PERSONNEL)
router.get('/search', async (req, res) => {
    const query = req.query.q;
    const token = process.env.DISCOGS_TOKEN; // On récupère le jeton ici

    if (!query) return res.json([]);

    try {
        // On cherche 'Master' et 'Release' (Albums et Versions spécifiques)
        // L'API Discogs gère automatiquement les codes-barres via le paramètre 'q'
        const url = `https://api.discogs.com/database/search?q=${query}&type=all&per_page=20`;
        
        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'ETagereApp/1.0', // Obligatoire
                'Authorization': `Discogs token=${token}` // Authentification simple
            }
        });

        // Nettoyage des résultats pour le Frontend
        const results = response.data.results
            .filter(item => item.type === 'master' || item.type === 'release')
            .map(item => ({
                id: item.id,
                tmdbId: item.id,
                title: item.title,
                year: item.year,
                cover_image: item.cover_image,
                type: item.type,
                label: item.label ? item.label[0] : '',
                catno: item.catno,
                barcode: item.barcode ? item.barcode[0] : '',
                
                // --- NOUVELLE LIGNE : On récupère la liste brute des formats ---
                formatList: item.format || [] 
            }));

        res.json(results);
    } catch (e) {
        console.error("Erreur Discogs:", e.message);
        res.status(500).json({ error: "Erreur recherche Discogs" });
    }
});

// --- NOUVELLE ROUTE : RÉCUPÉRER LES DÉTAILS COMPLETS D'UN DISQUE ---
router.get('/details/:id', async (req, res) => {
    const { id } = req.params; // ID Discogs
    const token = process.env.DISCOGS_TOKEN;

    try {
        // On interroge l'API "Releases" qui est beaucoup plus bavarde que "Search"
        const url = `https://api.discogs.com/releases/${id}`;
        
        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'ETagereApp/1.0',
                'Authorization': `Discogs token=${token}`
            }
        });

        res.json(response.data);
    } catch (e) {
        // Si ça échoue (ex: c'est un Master et pas une Release), on renvoie une erreur silencieuse
        console.error("Erreur détails Discogs:", e.message);
        res.status(404).json({ error: "Détails non trouvés" });
    }
});

// 3. AJOUTER UN VINYLE
router.post('/', async (req, res) => {
    const { 
        artist, title, coverUrl, originalYear, pressingYear, 
        format, rpm, color, label, catalogNumber, condition, edition, 
        userId, tmdbId // On stocke aussi l'ID Discogs au cas où
    } = req.body;

    try {
        const newVinyl = await prisma.vinyl.create({
            data: {
                tmdbId: parseInt(tmdbId) || 0,
                artist, title, coverUrl, originalYear, pressingYear,
                format, rpm, color, label, catalogNumber, condition, edition,
                userId: parseInt(userId)
            }
        });
        res.json(newVinyl);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur ajout vinyle" });
    }
});

// 4. MODIFIER UN VINYLE
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma.vinyl.update({
            where: { id: parseInt(id) },
            data: {
                coverUrl: data.coverUrl, // L'URL modifiable !
                pressingYear: data.pressingYear,
                format: data.format,
                rpm: data.rpm,
                color: data.color,
                label: data.label,
                catalogNumber: data.catalogNumber,
                condition: data.condition,
                edition: data.edition
            }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: "Erreur modif" }); }
});

// 5. SUPPRIMER
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.vinyl.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Supprimé" });
    } catch (e) { res.status(500).json({ error: "Erreur suppression" }); }
});

module.exports = router;