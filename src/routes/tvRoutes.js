const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// 1. RECHERCHE TMDB (Séries)
router.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/tv`, {
            params: { api_key: TMDB_API_KEY, query: query, language: 'fr-FR' }
        });
        // TMDB renvoie "name" pour les séries, on le transforme en "title" pour notre front
        const results = response.data.results.map(s => ({
            id: s.id,
            title: s.name, // Important !
            poster_path: s.poster_path,
            backdrop_path: s.backdrop_path,
            release_date: s.first_air_date, // Important !
            overview: s.overview
        }));
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Erreur TMDB" });
    }
});

// 2. RÉCUPÉRER MES SÉRIES
router.get('/', async (req, res) => {
    const { userId } = req.query;
    const series = await prisma.tvShow.findMany({
        where: { userId: parseInt(userId) },
        orderBy: { addedAt: 'desc' }
    });
    res.json(series);
});

// 3. AJOUTER UNE SÉRIE
router.post('/', async (req, res) => {
    const { tmdbId, title, posterPath, backdropPath, overview, releaseDate, format, objectType, seasonNumber, includeBluray, includeDvd, isSteelbook, isSlipcover, edition, userId } = req.body;
    
    try {
        const newShow = await prisma.tvShow.create({
            data: {
                tmdbId, title, posterPath, backdropPath, overview, releaseDate,
                format, objectType, 
                seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
                includeBluray, includeDvd, isSteelbook, isSlipcover, edition,
                userId
            }
        });
        res.json(newShow);
    } catch (e) { res.status(500).json({ error: "Erreur ajout série" }); }
});

// 4. SUPPRIMER
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.tvShow.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Série supprimée" });
});

// 5. MODIFIER
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { format, objectType, seasonNumber, isSteelbook, isSlipcover, edition, includeBluray, includeDvd } = req.body;
    try {
        const updated = await prisma.tvShow.update({
            where: { id: parseInt(id) },
            data: { 
                format, objectType, 
                seasonNumber: seasonNumber ? parseInt(seasonNumber) : null, // Ici aussi
                isSteelbook, isSlipcover, edition, includeBluray, includeDvd 
            }
        });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: "Erreur modif" }); }
});

module.exports = router;