const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // <--- AJOUT

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_etagere_2024';

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 1. RECHERCHE TMDB
router.get('/search', authenticateToken, async (req, res) => {
    const query = req.query.q;
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/tv`, {
            params: { api_key: TMDB_API_KEY, query: query, language: 'fr-FR' }
        });
        const results = response.data.results.map(s => ({
            id: s.id,
            title: s.name,
            poster_path: s.poster_path,
            backdrop_path: s.backdrop_path,
            release_date: s.first_air_date,
            overview: s.overview
        }));
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Erreur TMDB" });
    }
});

// 2. RÉCUPÉRER MES SÉRIES
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // ID du token
    try {
        const series = await prisma.tvShow.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { addedAt: 'desc' }
        });
        res.json(series);
    } catch (e) { res.status(500).json({ error: "Erreur lecture" }); }
});

// 3. AJOUTER UNE SÉRIE
router.post('/', authenticateToken, async (req, res) => {
    // On retire 'userId' de la liste des variables lues
    const { tmdbId, title, posterPath, backdropPath, overview, releaseDate, format, objectType, seasonNumber, includeBluray, includeDvd, isSteelbook, isSlipcover, edition } = req.body;
    
    try {
        const newShow = await prisma.tvShow.create({
            data: {
                tmdbId, title, posterPath, backdropPath, overview, releaseDate,
                format, objectType, 
                seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
                includeBluray, includeDvd, isSteelbook, isSlipcover, edition,
                userId: req.user.userId // <--- SÉCURITÉ
            }
        });
        res.json(newShow);
    } catch (e) { res.status(500).json({ error: "Erreur ajout série" }); }
});

// 4. SUPPRIMER
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    // Vérif proprio
    const existing = await prisma.tvShow.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: "Interdit" });

    await prisma.tvShow.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Série supprimée" });
});

// 5. MODIFIER
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { format, objectType, seasonNumber, isSteelbook, isSlipcover, edition, includeBluray, includeDvd } = req.body;
    
    // Vérif proprio
    const existing = await prisma.tvShow.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.user.userId) return res.status(403).json({ error: "Interdit" });

    try {
        const updated = await prisma.tvShow.update({
            where: { id: parseInt(id) },
            data: { 
                format, objectType, 
                seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
                isSteelbook, isSlipcover, edition, includeBluray, includeDvd 
            }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: "Erreur modif" }); }
});

module.exports = router;