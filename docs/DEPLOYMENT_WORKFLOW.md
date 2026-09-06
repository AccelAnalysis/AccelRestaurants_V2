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

## 2. Pull requests: Firebase preview against staging only

Same-repository pull requests deploy to a Firebase Hosting preview channel only after frontend and Functions CI pass.

The preview job uses the GitHub environment named `staging` and expires preview channels after 14 days. Firebase Hosting preview URLs use the real backend resources of the Firebase project they belong to, so the workflow explicitly refuses to run if staging is configured as the production project `accelrestaurant-d2c1f`.

Fork pull requests run CI but do not receive staging credentials and do not deploy previews.

### Required `staging` GitHub environment configuration

Environment variables:

- `FIREBASE_PROJECT_ID` — must be a Firebase project separate from `accelrestaurant-d2c1f`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FINNHUB_API_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

Environment secret:

- `FIREBASE_SERVICE_ACCOUNT` — service-account JSON authorized to deploy Firebase Hosting for the staging project

`VITE_FIREBASE_PROJECT_ID` is derived from `FIREBASE_PROJECT_ID` in the workflow so the build and deployment cannot silently target different Firebase projects.

The staging Firebase project must contain only test/staging data and integrations. Do not configure production Stripe/email/customer data for PR previews.

Until those staging settings exist, the preview job deliberately fails before build/deploy. This is a fail-closed safety control: CI can prove the code builds, but no preview is allowed to fall back to production backend resources.

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
10. deploys the exact checked-out frontend build to the Firebase Hosting `live` channel

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

If the GitHub plan/repository settings support environment protection rules, add a required approval rule to the `production` environment as an additional safeguard. The workflow already remains manually gated even without that optional protection rule.

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

The validator fails immediately when required Vite variables are missing or when staging/production Firebase targeting is unsafe.
