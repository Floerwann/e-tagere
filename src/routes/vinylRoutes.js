// src/routes/vinylRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;

// Config axios pour Discogs (Headers obligatoires)
const discogsClient = axios.create({
    baseURL: 'https://api.discogs.com',
    headers: {
        'User-Agent': 'MaFilmothequeProject/1.0', // Nom de ton app obligatoire
        'Authorization': `Discogs token=${DISCOGS_TOKEN}`
    }
});

// 1. RECHERCHER UN VINYLE
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Recherche vide" });

    try {
        // On cherche dans la database Discogs (type release = album)
        const response = await discogsClient.get('/database/search', {
            params: { q: query, type: 'release', format: 'vinyl' }
        });
        
        // On nettoie un peu les résultats pour le frontend
        const results = response.data.results.map(item => ({
            discogsId: item.id,
            title: item.title, // Format souvent "Artiste - Album"
            coverUrl: item.thumb,
            year: item.year
        }));
        
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur Discogs" });
    }
});

// 2. AJOUTER À MA COLLECTION
router.post('/', async (req, res) => {
    const { discogsId, title, coverUrl, year, userId } = req.body;

    try {
        const newVinyl = await prisma.vinyl.create({
            data: {
                discogsId,
                title,   // Discogs donne souvent "Artiste - Titre" dans le champ title
                artist: title.split('-')[0].trim() || "Inconnu", // Tentative d'extraction de l'artiste
                coverUrl,
                year: year ? year.toString() : null,
                userId
            }
        });
        res.json(newVinyl);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'ajout" });
    }
});

// 3. VOIR MA COLLECTION
router.get('/', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if(!userId) return res.json([]);

    const vinyls = await prisma.vinyl.findMany({
        where: { userId },
        orderBy: { addedAt: 'desc' }
    });
    res.json(vinyls);
});

// 4. SUPPRIMER
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.vinyl.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Vinyle supprimé" });
});

module.exports = router;