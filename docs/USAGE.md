# Utiliser ce template

Monorepo pnpm + Turborepo prêt pour la production : Next.js, Fastify, Postgres, CI GitHub Actions,
déploiement Fly.io (staging automatique, production sur tag avec reviewer, rollback).
Détail de l'infra : [DEPLOY.md](DEPLOY.md).

## 1. Démarrer un projet

GitHub : **Use this template → Create a new repository** (« Include all branches » décoché).

```bash
git clone https://github.com/<owner>/<projet>.git && cd <projet>
cp .env.example .env
pnpm install
```

Un dépôt créé depuis un template **ne reçoit pas** les environnements, secrets, apps Fly ni rulesets.
Le premier push sur `main` fera échouer `deploy-staging` avec un message clair tant que ce n'est pas fait.

### Checklist de mise en place

- [ ] Renommer le scope `@monrepo/*` et le titre du README (optionnel)
- [ ] Fly : 4 apps, 4 tokens de déploiement, `DATABASE_URL` par app api (→ [DEPLOY.md](DEPLOY.md) §1-2)
- [ ] Neon (ou autre) : une base par environnement ; hôte **complet**, sans `-pooler`, `sslmode=verify-full`
- [ ] GitHub, environnements `staging` et `production` (→ [DEPLOY.md](DEPLOY.md) §4) :
      2 secrets `FLY_API_TOKEN_API` / `FLY_API_TOKEN_WEB`, 4 variables `FLY_APP_API`, `FLY_APP_WEB`,
      `API_URL`, `WEB_URL` (sans slash final)
- [ ] `production` : reviewer requis, administrateurs sans contournement, déploiement limité à `main` et au tag `v*`
- [ ] Rulesets (Settings → Rules) :
  - `main`, **Active**, cible la branche par défaut : *Restrict deletions*, *Block force pushes*,
    *Require a pull request* (0 approbation si vous êtes seul), *Require status checks*
    (`Lint, typecheck, test, build`, `Smoke test (docker compose)`, `Image api`, `Image web`)
  - `release-tags`, **Active**, cible le motif `v*` : *Restrict deletions*, *Block force pushes*
- [ ] Après le 1er run sur `main` : paquets GHCR `<repo>-api` et `<repo>-web` en **Public**, puis *Re-run failed jobs*
- [ ] Vérifier `/health` et `/ready` sur staging, puis tag `v0.1.0` pour la production

## 2. Développer

```bash
git checkout main && git pull
git checkout -b feat/ma-fonctionnalite
```

- Tests d'abord (Vitest), commits conventionnels (`feat(api): …`, `fix(web): …`, `docs: …`).
- Avant de pousser : `pnpm turbo run lint typecheck test build` (le 2ᵉ run est servi par le cache Turbo).
- Stack complète avec Postgres : `docker compose up --build`. Les `pnpm dev` des apps ne chargent pas
  `.env` : exportez `DATABASE_URL` dans le terminal ou passez par compose.
- `main` est protégé : tout passe par une PR dont la CI est verte.

## 3. Staging puis production

| Étape | Action | À vérifier |
|---|---|---|
| Staging | Merger la PR sur `main` : déploiement automatique | job `Deploy to staging` vert ; `/health` (web, api) et `/ready` (api) ; la fonctionnalité elle-même |
| Production | `git checkout main && git pull && git tag v0.2.0 && git push origin v0.2.0` | approuver le déploiement (Actions → *Review deployments*) ; `/health` et `/ready` en prod |

Une image est construite **une fois** sur `main` (`sha-xxxxxxx`) ; la release la retague en `vX.Y.Z`
sans la reconstruire. Le tag doit pointer un commit de `main` dont la CI est terminée.
Ne jamais réutiliser un tag (le ruleset l'interdit).

## 4. Rollback

Actions → **Rollback** → *Run workflow* : environnement + tag **`vX.Y.Z`** ou **`sha-` suivi de 7
caractères** (ex. `sha-2632072`). Un SHA complet de 40 caractères est refusé. Les tags disponibles sont
dans GitHub → Packages → `<repo>-api` → Tags. Même approbation de reviewer en production.
Limite : après une migration de schéma, une image plus ancienne peut ne plus être compatible.

## 5. Pièges déjà rencontrés

- Secrets d'environnement vides : ils ne sont pas visibles d'un workflow réutilisable (d'où l'action composite).
- `getaddrinfo ENOTFOUND` sur `/ready` : hôte de `DATABASE_URL` tronqué.
- Pull d'image refusé par Fly : paquet GHCR encore privé (renommer le dépôt crée de nouveaux paquets).
- `WEB_URL` / `API_URL` avec faute de frappe : le smoke test échoue alors que le déploiement a réussi.
- Un token ou un mot de passe collé dans un chat, une issue ou un commit est compromis : le renouveler.
