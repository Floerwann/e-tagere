// src/routes/movieRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

// 1. RECHERCHE TMDB
// Route finale : GET /api/movies/search
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Recherche vide" });

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: { api_key: TMDB_KEY, query: query, language: 'fr-FR' }
        });
        res.json(response.data.results);
    } catch (error) {
        res.status(500).json({ error: "Erreur TMDB" });
    }
});

// 2. AJOUTER UN FILM
// Route finale : POST /api/movies
router.post('/', async (req, res) => {
    const { tmdbId, format, isSteelbook, isSlipcover, edition, userId, includeBluray, includeDvd } = req.body;
    if (!userId) return res.status(400).json({ error: "Utilisateur requis" });

    try {
        

        // Info TMDB
        const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
            params: { api_key: TMDB_KEY, language: 'fr-FR' }
        });
        const movieData = tmdbRes.data;

        // Save
        const newMovie = await prisma.movie.create({
            data: {
                tmdbId: movieData.id,
                title: movieData.title,
                posterPath: movieData.poster_path,
                overview: movieData.overview,
                releaseDate: movieData.release_date,
                format: format,
                includeBluray: includeBluray || false,
                includeDvd: includeDvd || false,
                isSteelbook: isSteelbook,
                isSlipcover: isSlipcover,
                edition: edition,
                userId: userId
            }
        });
        res.json(newMovie);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur ajout" });
    }
});

// 3. LISTER MA COLLECTION
// Route finale : GET /api/movies?userId=...
router.get('/', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId) return res.json([]);

    try {
        const movies = await prisma.movie.findMany({
            where: { userId },
            orderBy: { addedAt: 'desc' }
        });
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: "Erreur lecture" });
    }
});

// 4. SUPPRIMER
// Route finale : DELETE /api/movies/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.movie.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Supprimé" });
    } catch (error) {
        res.status(500).json({ error: "Erreur suppression" });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { format, isSteelbook, isSlipcover, edition, includeBluray, includeDvd } = req.body;

    try {
        const updatedMovie = await prisma.movie.update({
            where: { id: parseInt(id) },
            data: {
                format,
                isSteelbook,
                isSlipcover,
                edition,
                includeBluray,
                includeDvd
            }
        });
        res.json(updatedMovie);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la modification" });
    }
});

module.exports = router;