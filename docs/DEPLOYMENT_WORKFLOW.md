# Deployment workflow

AccelRestaurants uses GitHub Actions to separate validation, PR previews, and production releases.

## 1. Pull requests: CI first

Every pull request runs:

- frontend dependency install
- explicit Vite/Firebase environment validation with safe CI placeholder values
- frontend lint
- frontend production build
- Functions dependency install
- Functions TypeScript build
- Functions Jest tests

A failing CI job blocks the preview job.

## 2. Pull requests: Firebase Hosting preview channels in an isolated TEST project

Same-repository pull requests deploy to a temporary Firebase Hosting preview channel only after frontend and Functions CI pass and the `staging` environment targets a separate TEST Firebase project. All PR checks check out the PR head SHA explicitly.

The previous `staging` configuration pointed at production (`accelrestaurant-d2c1f`); its name did not provide backend isolation. The workflow now skips preview deployment and live pricing smoke when that configuration is still present, records the missing prerequisite, and retains a read-only compatibility report. A green report job is not release approval.

An operator must configure the intended dedicated AccelRestaurants TEST project; do not repurpose another application's project. The validator rejects the production project and Stripe live publishable keys for staging. Hosting preview channels expire after 14 days and do not replace the `live` channel.

Fork pull requests run CI but do not receive preview credentials and do not deploy previews.

### Required `staging` GitHub environment configuration

Environment variables:

- `FIREBASE_PROJECT_ID` = the intended dedicated AccelRestaurants TEST project ID
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FINNHUB_API_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` = the matching Stripe TEST account's publishable key

Environment secret:

- `FIREBASE_SERVICE_ACCOUNT` — service-account JSON authorized for the dedicated TEST project, including read access to its deployed Rules metadata for preflight

`VITE_FIREBASE_PROJECT_ID` is derived from `FIREBASE_PROJECT_ID` in the workflow so the build and deployment cannot silently target different Firebase projects.

Auth, Firestore, Functions, Storage, the authoritative catalogue and Stripe TEST configuration must all belong to this matched test environment. A Hosting-only preview does not deploy or validate its backend. Configure Functions `APP_URL` for the reviewed test frontend and store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the test project's Secret Manager.

Missing or production project targeting skips deployment with an explicit warning. An isolated project with incomplete client/secret configuration fails validation before deployment. No workflow provisions test products, prices, customers or catalogues automatically.

## 3. Production: manual gated release

Merging to `main` does not deploy Firebase Hosting automatically.

Production is released from **Actions → Deploy Production → Run workflow**. Select `main` and type `DEPLOY` exactly when prompted.

The production workflow:

1. refuses to run from a ref other than `main`
2. requires the explicit `DEPLOY` confirmation
3. validates every required Vite/Firebase variable
4. refuses any Firebase project other than `accelrestaurant-d2c1f`
5. requires a production Firebase service-account secret
6. installs and lints the frontend
7. builds the frontend
8. installs and builds Functions
9. runs the Functions Jest suite
10. requires the release preflight to pass before deploying the exact checked-out frontend build to the Firebase Hosting `live` channel

### Required `production` GitHub environment configuration

Environment variables:

- `FIREBASE_PROJECT_ID` = `accelrestaurant-d2c1f`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FINNHUB_API_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Environment secret:

- `FIREBASE_SERVICE_ACCOUNT` — service-account JSON authorized to deploy Firebase Hosting for `accelrestaurant-d2c1f`

Keep the `production` GitHub environment. The production workflow explicitly references `environment: production`, and environment-scoped variables/secrets provide a separate permission boundary from PR previews. If supported by repository settings, add a required approval rule to the `production` environment as an additional safeguard. The workflow already remains manually gated even without that optional protection rule.

## Backend deployments

These workflows intentionally deploy Firebase Hosting only. Functions, Firestore rules/indexes, and Storage rules are not automatically changed by a frontend release. Backend changes should be reviewed and deployed through a separate controlled workflow once their compatibility and migration requirements are understood.

## Local environment

Copy `.env.example` to a local ignored environment file and provide the appropriate development Firebase/client values. Run:

```bash
npm run validate:env
npm run lint
npm run build
npm run build --prefix functions
npm test --prefix functions -- --runInBand
```

The validator fails when required Vite variables are missing, deploy and client project IDs differ, staging points at production or a Stripe live key, or production targets any other Firebase project. Firebase Functions deployments run the Functions build first, regenerating the reviewed source fingerprint before compiling the deployment bundle.
