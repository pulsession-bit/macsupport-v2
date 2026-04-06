/**
 * Script de peuplement de la base de connaissances Vestee
 * Usage: npx ts-node scripts/seed-knowledge.ts
 *
 * Collection: macAssist/v1/knowledge/{articleId}
 * Chaque article contient: title, content, keywords[], category, models[]
 */

const KNOWLEDGE_BASE = [
  {
    id: "apple-silicon-smc-reset",
    title: "Réinitialisation SMC/NVRAM sur Apple Silicon (M1, M2, M3, M4)",
    category: "reset",
    models: ["M1", "M2", "M3", "M4", "MacBook Pro 2021", "MacBook Pro 2022", "MacBook Pro 2023", "MacBook Pro 2024", "MacBook Air 2022", "MacBook Air 2023", "MacBook Air 2024"],
    keywords: ["smc", "nvram", "pram", "reset", "redémarrage", "forcé", "bloqué", "frozen", "freeze", "m1", "m2", "m3", "m4", "apple silicon"],
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
    keywords: ["sequoia", "macos 15", "bug", "problème", "wifi", "bluetooth", "thunderbolt", "usb", "lent", "lenteur", "plantage", "crash", "2024"],
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
- Si lenteur persistante: Désactiver Spotlight temporairement via Terminal: sudo mdutil -a -i off

APPLICATIONS QUI PLANTENT :
- Applications 32 bits ne sont plus supportées depuis Catalina (10.15)
- Vérifier les mises à jour de l'app
- Réinstaller via l'App Store si nécessaire`
  },
  {
    id: "macbook-black-screen",
    title: "Écran noir MacBook - Diagnostic et solutions",
    category: "display",
    models: ["tous les MacBook"],
    keywords: ["écran noir", "black screen", "affichage", "display", "ne s'allume pas", "allumage", "démarrage", "boot"],
    content: `Diagnostic écran noir MacBook :

ÉTAPE 1 - Vérifier si le Mac est allumé :
- Écouter le son de démarrage (bip ou son macOS)
- Mettre les écouteurs: entendre le son de connexion?
- Appuyer une touche: entendre le clavier?

ÉTAPE 2 - Problème de luminosité :
- Appuyer sur F2 (augmenter luminosité) plusieurs fois
- Parfois la luminosité est à 0 sans que ça soit visible

ÉTAPE 3 - Reset formel :
- Apple Silicon: Maintenir Touch ID 10 secondes
- Intel: Cmd+Ctrl+Eject pour redémarrer de force

ÉTAPE 4 - Démarrage en Mode Sans Échec :
- Apple Silicon: Éteindre, maintenir Touch ID jusqu'aux options de démarrage, choisir le disque + Shift
- Intel: Redémarrer + maintenir Shift

ÉTAPE 5 - Problème matériel probable si tout échoue :
- Connecter un écran externe via HDMI/USB-C
- Si l'image apparaît sur l'écran externe → problème écran LCD
- Si rien → problème carte mère ou GPU`
  },
  {
    id: "macbook-battery-issues",
    title: "Problèmes de batterie MacBook - Diagnostic",
    category: "battery",
    models: ["tous les MacBook"],
    keywords: ["batterie", "battery", "charge", "chargeur", "autonomie", "pourcentage", "décharge", "rapide", "lente", "état batterie"],
    content: `Diagnostic batterie MacBook :

VÉRIFIER L'ÉTAT DE LA BATTERIE :
- Pomme > À propos de ce Mac > Informations système > Alimentation
- 'État de la batterie': doit être "Normal" ou "Bon état"
- 'Cycles de charge': max recommandé ~1000 cycles pour MacBook récents

PROBLÈME DE CHARGE LENTE/PAS DE CHARGE :
1. Vérifier le câble USB-C (tester avec un autre)
2. Changer de port USB-C (certains portent uniquement la data)
3. Nettoyer le port avec une brosse douce
4. Sur Apple Silicon: le Mac peut charger même avec une alimentation faible (mode économie)

DÉCHARGE RAPIDE :
- Vérifier quelle app consomme: Menu batterie > 'Applications utilisant beaucoup d'énergie'
- Désactiver la synchronisation iCloud pendant l'utilisation intensive
- Réduire la luminosité de l'écran (principale consommatrice)

BATTERIE NE SE CHARGE PLUS DU TOUT :
- Essayer un reset SMC (Apple Silicon: maintenir Touch ID 10s)
- Si 0% et ne démarre plus: brancher 30min avant de tenter l'allumage
- Contacter Apple si <1 an (garantie)`
  },
  {
    id: "macbook-m4-specifics",
    title: "Spécificités MacBook Pro M4 (2024) - Modèle A3290/A3291",
    category: "hardware",
    models: ["MacBook Pro M4", "MacBook Pro M4 Pro", "MacBook Pro M4 Max", "A3290", "A3291"],
    keywords: ["m4", "2024", "macbook pro 2024", "a3290", "a3291", "nouveau", "recente", "dernier modèle"],
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
- Identique aux autres Apple Silicon
- Maintenir Touch ID 10 secondes pour reset forcé`
  },
];

// Ce script crée les articles dans Firestore
// À exécuter une seule fois pour peupler la base
console.log("📚 Articles à insérer dans Firestore:");
console.log("Collection: macAssist/v1/knowledge");
KNOWLEDGE_BASE.forEach(article => {
  console.log(`  - ${article.id}: ${article.title}`);
  console.log(`    Keywords: ${article.keywords.slice(0, 5).join(", ")}...`);
});
console.log("\nCopier-coller ces articles dans la console Firebase ou utiliser le SDK Admin.");
console.log("Format: macAssist > v1 > knowledge > {id} > {champs}");
export { KNOWLEDGE_BASE };
