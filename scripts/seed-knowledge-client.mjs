/**
 * Script de peuplement de la base de connaissances Vestee
 * Usage: node scripts/seed-knowledge-browser.mjs
 * 
 * Ce script utilise le SDK Firebase browser (même config que l'app)
 * pour insérer les articles directement dans Firestore.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Config identique à firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyB3CNMnvWipHsMK193vhFgmYuVgMaAJgiI",
  authDomain: "macbook-1e222.firebaseapp.com",
  projectId: "macbook-1e222",
  storageBucket: "macbook-1e222.firebasestorage.app",
  appId: "1:67498652056:web:4f444b32a1ef792f693bed",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KNOWLEDGE_BASE = [
  {
    id: "apple-silicon-smc-reset",
    title: "Réinitialisation SMC/NVRAM sur Apple Silicon (M1, M2, M3, M4)",
    category: "reset",
    models: ["M1", "M2", "M3", "M4", "MacBook Pro 2021", "MacBook Pro 2022", "MacBook Pro 2023", "MacBook Pro 2024", "MacBook Air 2022", "MacBook Air 2023", "MacBook Air 2024"],
    keywords: ["smc", "nvram", "pram", "reset", "redémarrage", "forcé", "bloqué", "frozen", "freeze", "m1", "m2", "m3", "m4", "apple silicon", "touch", "power", "bouton"],
    content: `Sur les Mac Apple Silicon (M1/M2/M3/M4), il n'y a plus de SMC traditionnel. Le reset se fait autrement :

RÉINITIALISATION FORCÉE (équivalent SMC) :
1. Éteignez le Mac complètement (si possible)
2. Maintenez le bouton Touch ID/Power appuyé pendant 10 secondes
3. Relâchez, attendez 3 secondes, puis rallumez

RÉINITIALISATION NVRAM :
- Sur Apple Silicon, la NVRAM est réinitialisée automatiquement à chaque démarrage si nécessaire
- Pas de combinaison Cmd+Option+P+R nécessaire (c'est pour Intel uniquement)
- Si un problème de résolution d'écran ou de son persiste, un simple redémarrage suffit

SI LE MAC NE RÉPOND PLUS DU TOUT :
1. Débranchez l'adaptateur secteur
2. Attendez 15 secondes
3. Rebranchez et maintenez Touch ID 10 secondes`
  },
  {
    id: "macos-sequoia-issues",
    title: "Problèmes connus macOS Sequoia 15 (2024)",
    category: "os",
    models: ["MacBook Pro 2019+", "MacBook Air 2020+", "Mac Mini 2020+", "iMac 2019+"],
    keywords: ["sequoia", "macos", "bug", "problème", "wifi", "bluetooth", "thunderbolt", "usb", "lent", "lenteur", "plantage", "crash", "2024", "réseau", "connexion"],
    content: `Problèmes connus et solutions macOS Sequoia 15.x :

PROBLÈMES WIFI/RÉSEAU :
- Sequoia 15.0 avait des bugs WiFi fréquents → Mettre à jour en 15.1 minimum
- Solution rapide: Désactiver/réactiver WiFi, ou oublier le réseau et se reconnecter
- Si persistant: Supprimer /Library/Preferences/SystemConfiguration/

THUNDERBOLT/USB :
- Certains hubs USB-C tiers causent des déconnexions sous Sequoia 15.0
- Solution: Mise à jour en 15.1+ ou utiliser un hub certifié Apple
- Bug Thunderbolt 4 sur M4 corrigé dans Sequoia 15.1

LENTEURS GÉNÉRALES :
- Spotlight réindexe au premier démarrage après upgrade (peut durer 2-3h, normal)
- Si lenteur persistante: sudo mdutil -a -i off dans Terminal

APPLICATIONS QUI PLANTENT :
- Applications 32 bits ne sont plus supportées
- Vérifier les mises à jour de l'app
- Réinstaller via l'App Store si nécessaire`
  },
  {
    id: "macbook-black-screen",
    title: "Écran noir MacBook - Diagnostic et solutions",
    category: "display",
    models: ["tous les MacBook"],
    keywords: ["écran", "noir", "black", "screen", "affichage", "display", "allume", "allumage", "démarrage", "boot", "image", "luminosité"],
    content: `Diagnostic écran noir MacBook :

ÉTAPE 1 - Vérifier si le Mac est allumé :
- Écouter le son de démarrage (bip ou son macOS)
- Mettre les écouteurs pour entendre le son de connexion
- Appuyer une touche pour entendre le clavier

ÉTAPE 2 - Problème de luminosité :
- Appuyer sur F2 (augmenter luminosité) plusieurs fois
- La luminosité peut être à 0 sans que ça soit visible

ÉTAPE 3 - Reset formel :
- Apple Silicon: Maintenir Touch ID 10 secondes
- Intel: Cmd+Ctrl+Eject pour redémarrer de force

ÉTAPE 4 - Démarrage en Mode Sans Échec :
- Apple Silicon: Éteindre, maintenir Touch ID jusqu'aux options de démarrage, choisir le disque + Shift
- Intel: Redémarrer + maintenir Shift

ÉTAPE 5 - Problème matériel probable si tout échoue :
- Connecter un écran externe via HDMI/USB-C
- Si l'image apparaît sur l'écran externe → problème écran LCD interne
- Si rien → problème carte mère ou GPU`
  },
  {
    id: "macbook-battery-issues",
    title: "Problèmes de batterie MacBook - Diagnostic",
    category: "battery",
    models: ["tous les MacBook"],
    keywords: ["batterie", "battery", "charge", "chargeur", "autonomie", "pourcentage", "décharge", "rapide", "lente", "état", "cycles", "magsafe", "usb-c"],
    content: `Diagnostic batterie MacBook :

VÉRIFIER L'ÉTAT DE LA BATTERIE :
- Pomme > À propos de ce Mac > Informations système > Alimentation
- 'État de la batterie' : doit être "Normal" ou "Bon état"
- 'Cycles de charge' : max ~1000 cycles pour MacBook récents

PROBLÈME DE CHARGE LENTE/PAS DE CHARGE :
1. Vérifier le câble USB-C (tester avec un autre)
2. Changer de port USB-C (certains portent uniquement la data)
3. Nettoyer le port avec une brosse douce antistatique
4. Reset formel: maintenir Touch ID 10 secondes (Apple Silicon)

DÉCHARGE RAPIDE :
- Menu batterie > 'Applications utilisant beaucoup d'énergie'
- Désactiver la synchronisation iCloud pendant l'utilisation intensive
- Réduire la luminosité de l'écran (principale consommatrice)

BATTERIE NE SE CHARGE PLUS DU TOUT :
- Brancher 30min avant de tenter l'allumage si à 0%
- Essayer un reset SMC (Apple Silicon: maintenir Touch ID 10s)
- Contacter Apple si <1 an (garantie constructeur)`
  },
  {
    id: "macbook-m4-specifics",
    title: "Spécificités MacBook Pro M4 (2024) - Modèle A3290/A3291",
    category: "hardware",
    models: ["MacBook Pro M4", "MacBook Pro M4 Pro", "MacBook Pro M4 Max", "A3290", "A3291"],
    keywords: ["m4", "2024", "macbook pro 2024", "a3290", "a3291", "nouveau", "récent", "dernier", "modèle", "thunderbolt", "hdmi", "magsafe", "nano"],
    content: `MacBook Pro M4 / M4 Pro / M4 Max (Nov 2024) - Infos clés :

CARACTÉRISTIQUES MATÉRIELLES :
- Puce M4: CPU 10 cœurs (4 performance + 6 efficacité), GPU 10 cœurs
- Puce M4 Pro: jusqu'à 14 cœurs CPU, 20 cœurs GPU
- Puce M4 Max: jusqu'à 16 cœurs CPU, 40 cœurs GPU
- RAM unifiée: 16 Go (M4) / 24-48 Go (M4 Pro) / 36-128 Go (M4 Max)
- Port HDMI 2.1 (supporte 8K!) + 3x Thunderbolt 5 (M4 Pro/Max)
- MagSafe 3 pour la charge

NANO-TEXTURE GLASS (option) :
- Écran avec traitement anti-reflets premium
- Nettoyer UNIQUEMENT avec le chiffon fourni par Apple
- Pas d'alcool, pas de spray

PROBLÈMES CONNUS M4 (2024) :
- Thunderbolt 5 incompatible avec certains docks Thunderbolt 3 sans firmware update
- Corrigé via mise à jour macOS Sequoia 15.1+
- Certains moniteurs 4K@144Hz nécessitent un câble certifié Thunderbolt 5

RESET SUR M4 :
- Maintenir Touch ID 10 secondes pour reset forcé (identique aux autres Apple Silicon)
- Pas de reset SMC traditionnel, géré automatiquement`
  },
  {
    id: "macbook-intel-diagnostics",
    title: "Diagnostics MacBook Intel (2015-2020) - SMC, NVRAM, Mode Récupération",
    category: "reset",
    models: ["MacBook Pro Intel", "MacBook Air Intel", "2015", "2016", "2017", "2018", "2019", "2020"],
    keywords: ["intel", "smc", "nvram", "pram", "recovery", "récupération", "cmd", "option", "2015", "2016", "2017", "2018", "2019", "2020", "t2"],
    content: `Diagnostics MacBook Intel :

RESET SMC (Intel) :
MacBook avec puce T2 (2018-2020) :
- Éteindre le Mac
- Maintenir Ctrl (gauche) + Option (gauche) + Maj (droite) pendant 7 sec sans relâcher
- Maintenir en plus le bouton Power pendant encore 7 sec
- Relâcher tout, attendre 5 sec, rallumer

MacBook sans T2 (avant 2018, pile intégrée) :
- Éteindre
- Maintenir Ctrl (gauche) + Option (gauche) + Maj (droite) + Power pendant 10 sec
- Rallumer normalement

RESET NVRAM/PRAM (Intel uniquement) :
- Allumer et immédiatement maintenir Cmd + Option + P + R
- Maintenir jusqu'au 2e son de démarrage (environ 20 sec)
- Relâcher et laisser démarrer normalement

MODE RÉCUPÉRATION (Intel) :
- Cmd + R au démarrage → macOS Recovery
- Cmd + Option + R → réinstaller la version compatible
- Diagnostics Apple: D au démarrage (ou Option + D)`
  },
];

async function seedKnowledge() {
  console.log("🌱 Début du peuplement de la base de connaissances Vestee...");
  
  for (const article of KNOWLEDGE_BASE) {
    const ref = doc(db, "macAssist/v1/knowledge", article.id);
    await setDoc(ref, {
      ...article,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Article inséré: ${article.id}`);
  }
  
  console.log(`\n🎉 ${KNOWLEDGE_BASE.length} articles insérés dans macAssist/v1/knowledge`);
}

seedKnowledge().catch(console.error);
