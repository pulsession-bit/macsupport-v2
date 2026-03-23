
/**
 * DigitGPT Macbook Assistance - Backend API + Static File Server
 * Google Cloud Run + Vertex AI (Gemini)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const { VertexAI } = require('@google-cloud/vertexai');

const app = express();

// --- Configuration & Environment ---
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.DIGITGPT_BACKEND_API_KEY;
const JWT_SECRET = process.env.DIGITGPT_JWT_SECRET;
const GCP_PROJECT = process.env.GCP_PROJECT;
const GCP_LOCATION = process.env.GCP_LOCATION;

app.use(express.json());
app.use(cors());

// --- Middlewares & Routes API ---

app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Authentification JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET || 'fallback_secret_for_dev', (err, decoded) => {
    if (err) return res.status(401).json({ error: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

// --- SERVEUR DE FICHIERS STATIQUES (FRONTEND) ---
// On sert les fichiers situés à la racine du projet (index.html, App.tsx, etc.)
// Note: Dans un environnement de production réel, index.tsx/App.tsx devraient être compilés, 
// mais ici on suit votre structure actuelle ES6 importmap.
app.use(express.static(path.join(__dirname, '..')));

// Redirection de toutes les routes non-API vers index.html (pour le SPA)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/v1/') || req.path === '/health') return next();
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DigitGPT Backend & Frontend serving on port ${PORT}`);
});
