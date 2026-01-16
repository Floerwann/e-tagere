require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

const JWT_SECRET = process.env.JWT_SECRET;

// Petite sécurité : si on a oublié de mettre la variable, on prévient !
if (!JWT_SECRET) {
    console.error("ERREUR FATALE : La variable JWT_SECRET manque dans le fichier .env");
    process.exit(1); // On arrête le serveur car il n'est pas sécurisé
}

// --- SÉCURITÉ 1 : HELMET (Version "Soft") ---
// On active Helmet pour protéger les en-têtes HTTP...
// MAIS on désactive le 'contentSecurityPolicy' qui casse ton site.
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
}));

// --- SÉCURITÉ 2 : CORS (Réouverture) ---
// On rouvre l'accès pour être sûr que rien ne bloque entre ton navigateur et le serveur
app.use(cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- SÉCURITÉ 3 : RATE LIMITER (Le Vigile reste actif !) ---
const searchLimiter = rateLimit({
	windowMs: 60 * 1000, 
	max: 10, 
	message: { error: "Trop de recherches ! Attends une minute." },
	standardHeaders: true, 
	legacyHeaders: false,
});

// --- MIDDLEWARE JWT ---
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

// --- ROUTES ---
const vinylRoutes = require('./routes/vinylRoutes');
const movieRoutes = require('./routes/movieRoutes');
const tvRoutes = require('./routes/tvRoutes');

// Branchement des routes
app.use('/api/vinyls/search', searchLimiter);
app.use('/api/movies/search', searchLimiter);
app.use('/api/series/search', searchLimiter);

app.use('/api/vinyls', authenticateToken, vinylRoutes);
app.use('/api/movies', authenticateToken, movieRoutes);
app.use('/api/series', authenticateToken, tvRoutes);

// --- AUTHENTIFICATION ---
// --- INSCRIPTION (Avec nouvelles sécurités) ---
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    // 1. VALIDATION DU PSEUDO (Max 14 caractères)
    if (username.length > 14) {
        return res.status(400).json({ error: "Le pseudo ne doit pas dépasser 14 caractères." });
    }

    // 2. VALIDATION DU MOT DE PASSE (Sécurité renforcée)
    // Explication du Regex : 
    // (?=.*[A-Za-z]) -> Au moins une lettre
    // (?=.*\d)       -> Au moins un chiffre
    // (?=.*[\W_])    -> Au moins un caractère spécial (ou _)
    // .{8,}          -> Au moins 8 caractères au total
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            error: "Le mot de passe doit faire 8 caractères min. et contenir une lettre, un chiffre et un symbole." 
        });
    }

    try {
        // Vérification si l'email existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "Cet email est déjà utilisé." });

        // Cryptage et Création
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({ data: { username, email, password: hashedPassword } });
        
        res.json({ message: "Compte créé avec succès !" });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Erreur serveur lors de l'inscription." }); 
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !await bcrypt.compare(password, user.password)) 
            return res.status(400).json({ error: "Erreur identifiants" });
        
        const token = jwt.sign({ userId: user.id, name: user.username }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ 
            token: token, 
            user: { id: user.id, username: user.username, email: user.email } 
        });

    } catch (e) { res.status(500).json({ error: "Erreur serveur" }); }
});

module.exports = { app, authenticateToken, JWT_SECRET };

app.listen(PORT, () => {
    console.log(`Serveur RELAXÉ lancé sur http://localhost:${PORT}`);
});