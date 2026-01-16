const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken'); // <--- IMPERATIF
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_etagere_2024';

// --- MIDDLEWARE DE SÉCURITÉ ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Pas de token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token invalide
        req.user = user; // On récupère l'ID sécurisé
        next();
    });
};

// 1. RECHERCHE TMDB (Besoin d'être connecté pour chercher ?) -> Disons oui
router.get('/search', authenticateToken, async (req, res) => {
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

// 2. AJOUTER UN FILM (SÉCURISÉ)
router.post('/', authenticateToken, async (req, res) => {
    // ON NE LIT PLUS 'userId' DEPUIS LE BODY (faille de sécurité)
    const { tmdbId, format, isSteelbook, isSlipcover, edition, includeBluray, includeDvd } = req.body;
    
    // ON PREND L'ID DU TOKEN
    const secureUserId = req.user.userId;

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
                userId: secureUserId // <--- SÉCURISÉ ICI
            }
        });
        res.json(newMovie);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur ajout" });
    }
});

// 3. LISTER MA COLLECTION (SÉCURISÉ)
router.get('/', authenticateToken, async (req, res) => {
    // On ignore le paramètre ?userId=... de l'URL, on utilise le token
    const userId = req.user.userId;

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

// 4. SUPPRIMER (SÉCURISÉ)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    // VÉRIFICATION DE PROPRIÉTÉ
    const existing = await prisma.movie.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.user.userId) {
        return res.status(403).json({ error: "Ce film ne vous appartient pas" });
    }

    try {
        await prisma.movie.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Supprimé" });
    } catch (error) {
        res.status(500).json({ error: "Erreur suppression" });
    }
});

// 5. MODIFIER (SÉCURISÉ)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { format, isSteelbook, isSlipcover, edition, includeBluray, includeDvd } = req.body;

    // VÉRIFICATION DE PROPRIÉTÉ
    const existing = await prisma.movie.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.user.userId) {
        return res.status(403).json({ error: "Interdit" });
    }

    try {
        const updatedMovie = await prisma.movie.update({
            where: { id: parseInt(id) },
            data: { format, isSteelbook, isSlipcover, edition, includeBluray, includeDvd }
        });
        res.json(updatedMovie);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la modification" });
    }
});

module.exports = router;