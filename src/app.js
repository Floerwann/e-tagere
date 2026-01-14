require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// --- IMPORTS DES ROUTES ---
const vinylRoutes = require('./routes/vinylRoutes');
const movieRoutes = require('./routes/movieRoutes');
const tvRoutes = require('./routes/tvRoutes');

// --- BRANCHEMENT DES ROUTES ---
app.use('/api/vinyls', vinylRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/series', tvRoutes);

// ================= AUTHENTIFICATION (Reste ici pour l'instant) =================

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "Email pris" });
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({ data: { username, email, password: hashedPassword } });
        res.json({ message: "Compte créé" });
    } catch (e) { res.status(500).json({ error: "Erreur serveur" }); }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !await bcrypt.compare(password, user.password)) 
            return res.status(400).json({ error: "Erreur identifiants" });
        res.json({ id: user.id, username: user.username, email: user.email });
    } catch (e) { res.status(500).json({ error: "Erreur serveur" }); }
});

app.listen(PORT, () => {
    console.log(`Serveur propre lancé sur http://localhost:${PORT}`);
});