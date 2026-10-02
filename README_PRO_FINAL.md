# Survey Platform — Solar PAYG Mauritanie

Plateforme d’enquête académique bilingue (FR/AR) pour l’étude de faisabilité d’une entreprise de financement PAYG de l’énergie solaire en Mauritanie.

Nom arabe de l’institut : **المعهد العالي للمحاسبة وإدارة المؤسسات**

Slug du sondage : `solar-payg-mauritanie-2027` (constante `SURVEY_SLUG` dans `src/SondageSolarPAYG.jsx`)

Questions de départ : `DEFAULT_SURVEY_QUESTIONS.sql` (crée aussi le sondage s’il n’existe pas).
Accès public du prototype aux résultats : `PROTOTYPE_PUBLIC_ACCESS.sql`.

Exécuter `npm install` puis `npm run build` avant le déploiement.

## Intégration étude de marché
La migration `MARKET_VALIDATION_QUESTIONS.sql` ajoute les tranches de revenu et les seuils de prix acceptables. Le prototype lit les vues agrégées Supabase du même sondage, affiche les résultats de l’échantillon et distingue les hypothèses du modèle. Le paiement mobile et le scoring restent des simulations de faisabilité.
