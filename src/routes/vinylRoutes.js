const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Récupération de la clé secrète (la même que dans app.js)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_etagere_2024';

// --- MIDDLEWARE LOCAL (Pour sécuriser ce fichier) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // req.user.userId est maintenant DISPONIBLE et SÛR
        next();
    });
};

// 1. RÉCUPÉRER MA COLLECTION (Lecture publique ou privée ?)
// On va dire que lire est autorisé si on est connecté
router.get('/', authenticateToken, async (req, res) => {
    // On utilise l'ID du token, pas celui de l'URL ! Sécurité max.
    const userId = req.user.userId; 
    try {
        const vinyls = await prisma.vinyl.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { addedAt: 'desc' }
        });
        res.json(vinyls);
    } catch (e) {
        res.status(500).json({ error: "Erreur chargement" });
    }
});

// 2. RECHERCHE DISCOGS (Besoin d'être connecté)
router.get('/search', authenticateToken, async (req, res) => {
    // ... (Le code de recherche Discogs reste identique) ...
    // Je remets ton code existant ici pour l'exemple
    const query = req.query.q;
    const token = process.env.DISCOGS_TOKEN;
    if (!query) return res.json([]);
    try {
        const url = `https://api.discogs.com/database/search?q=${query}&type=all&per_page=20`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'ETagereApp/1.0', 'Authorization': `Discogs token=${token}` }
        });
        const results = response.data.results.filter(item => item.type === 'master' || item.type === 'release').map(item => ({
             id: item.id, tmdbId: item.id, title: item.title, year: item.year, cover_image: item.cover_image, type: item.type, label: item.label ? item.label[0] : '', catno: item.catno, barcode: item.barcode ? item.barcode[0] : '', formatList: item.format || []
        }));
        res.json(results);
    } catch (e) { res.status(500).json({ error: "Erreur Discogs" }); }
});

// 3. DÉTAILS
router.get('/details/:id', authenticateToken, async (req, res) => {
    // ... (Ton code détails Discogs identique) ...
    // Juste ajouter 'authenticateToken' dans la ligne router.get
    const { id } = req.params;
    const token = process.env.DISCOGS_TOKEN;
    try {
        const url = `https://api.discogs.com/releases/${id}`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'ETagereApp/1.0', 'Authorization': `Discogs token=${token}` } });
        res.json(response.data);
    } catch (e) { res.status(404).json({ error: "Non trouvé" }); }
});

// 4. AJOUTER (SÉCURISÉ) 🔒
router.post('/', authenticateToken, async (req, res) => {
    // On ignore le userId envoyé par le formulaire (qui peut être faux)
    // On prend celui du token (req.user.userId)
    const { artist, title, coverUrl, originalYear, pressingYear, format, rpm, color, label, catalogNumber, condition, edition, tmdbId } = req.body;

    try {
        const newVinyl = await prisma.vinyl.create({
            data: {
                tmdbId: parseInt(tmdbId) || 0,
                artist, title, coverUrl, originalYear, pressingYear,
                format, rpm, color, label, catalogNumber, condition, edition,
                userId: req.user.userId // <--- C'EST ICI QUE LA SÉCURITÉ AGIT
            }
        });
        res.json(newVinyl);
    } catch (e) { res.status(500).json({ error: "Erreur ajout" }); }
});

// 5. MODIFIER (SÉCURISÉ) 🔒
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    
    // VERIFICATION : Est-ce que ce vinyle appartient bien à l'utilisateur ?
    const existing = await prisma.vinyl.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.user.userId) {
        return res.status(403).json({ error: "Ce n'est pas votre vinyle !" });
    }

    try {
        const updated = await prisma.vinyl.update({
            where: { id: parseInt(id) },
            data: { /* ... tes champs à modifier ... */ coverUrl: data.coverUrl, pressingYear: data.pressingYear, format: data.format, rpm: data.rpm, color: data.color, label: data.label, catalogNumber: data.catalogNumber, condition: data.condition, edition: data.edition }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: "Erreur modif" }); }
});

// 6. SUPPRIMER (SÉCURISÉ) 🔒
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    // VERIFICATION PROPRIÉTAIRE
    const existing = await prisma.vinyl.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.user.userId) {
        return res.status(403).json({ error: "Touche pas à ça !" });
    }

    try {
        await prisma.vinyl.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Supprimé" });
    } catch (e) { res.status(500).json({ error: "Erreur suppression" }); }
});

module.exports = router;