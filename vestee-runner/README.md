# Vestee Runner

Runner TypeScript pour exécuter la suite `tests/vestee-v4-regression.json` contre un modèle cible puis la faire juger par un second modèle.

## Setup

```bash
cd vestee-runner
cp .env.example .env
npm install
```

Renseigne les clés API dans `.env`, puis adapte `prompts/vestee-system.txt` avec le prompt système final.

## Run

```bash
npm run test:vestee
```

Rapports générés dans `vestee-runner/out/`.
