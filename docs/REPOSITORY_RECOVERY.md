# Repository recovery — 2026-09-06

## Independent source of truth

The recovered application belongs to [AccelAnalysis/AccelRestaurants_V2](https://github.com/AccelAnalysis/AccelRestaurants_V2). Continue development from the standalone clone or another independent clone of that repository.

- Original source: `/Users/jonathanholman/Code Projects/AccelRestaurants_V2`
- Original Git top level: `/Users/jonathanholman/Code Projects`
- Original Git remote: `https://github.com/AccelAnalysis/sweetbeanswholesale.git`
- Original Git HEAD at recovery: `ad00cccd099d1eda5457ce9ec05dcd97d8753eb6`
- New local clone and Git top level: `/Users/jonathanholman/Standalone/AccelRestaurants_V2`
- New remote: `https://github.com/AccelAnalysis/AccelRestaurants_V2.git`
- Recovery branch: `recovery/local-v2`, based on the dedicated repository's `main` at `8b4733e`

The old application folder was accidentally nested under the unrelated Sweet Beans repository. The new clone is outside the entire `Code Projects` tree. No Sweet Beans application code or Git history was intentionally migrated. The dedicated repository previously contained only a README; that README remains in its existing history.

The original source remains intact as a recovery backup. Its old parent repository still tracks the same three original files: removing that tracking would alter Sweet Beans and was deliberately outside this recovery. All future AccelRestaurants Git work should use the new clone. No Firebase deployment or PR merge was performed.

## Local work preserved

Only these three application files were tracked by the old parent repository:

- `src/components/atoms/AtmosphereCanvas.tsx` — unchanged relative to the parent HEAD.
- `src/lib/webgl/WebGLEngine.ts` — uncommitted modifications.
- `src/pages/PlayerScreen.tsx` — uncommitted modifications.

The two modified files contained 398 added and 106 removed lines in total. There were no staged changes within the application folder. Another 178 meaningful application files were untracked in that working tree and absent from the dedicated repository's `main`. The raw untracked count was 186, which also included generated Functions output, a Firebase cache, and an empty temporary draft. This recovery preserves the current local versions; it does not replace them with a production build.

## Copy verification

181 meaningful source files were copied and checked with SHA-256 against the original before repository housekeeping changes. The final copy contains:

- 176 files that remain byte-for-byte identical to the original, including all application source, Functions source/tests, assets, Firebase configuration, Hosting configuration, Firestore rules/indexes, Storage rules, scripts, package files, and lockfiles.
- Five intentional updates: `.gitignore`, the root and Functions `.env.example` files, `README.md`, and `PLATFORM_REVIEW.md`.
- This recovery report as an additional file.

The ignore rules now cover generated Functions output, Firebase/build caches, private environment files, credential/key files, and temporary artifacts. Both environment examples contain variable names with empty values only. The README identifies the dedicated repository, corrects the installed React version and Node prerequisite, and documents local setup and verification. A token-shaped Stripe placeholder in the historical platform review was replaced with a descriptive placeholder so it cannot be confused with a credential by secret scanners. No application implementation changes were made.

A local recovery archive, original source hashes, uncommitted patch, Git state, copy comparison, and verification logs are preserved outside both repositories at:

`/Users/jonathanholman/Standalone/recovery-backup-20260906-075640`

The archive excludes private environment files and generated/dependency directories. The private environment files remain only in the untouched original folder; their values were not copied into the standalone repository. Original non-generated file hashes and the Sweet Beans Git HEAD/config/index were checked for changes during recovery.

## Intentionally excluded

- `node_modules/` and `functions/node_modules/` — installed afresh from the unchanged lockfiles.
- `dist/`, `functions/lib/`, and `.firebase/` — generated output/cache; build output was recreated locally and is ignored.
- `.env` and `functions/.env` — private configuration; supply local values separately when running the app.
- `firebase-debug.log` and `.DS_Store` files — logs and macOS metadata.
- `src/components/atoms/TileContent.tsx.new` — verified empty temporary draft with no unique source content.
- The parent Sweet Beans `.git` directory and all files outside the application source folder.

No service-account keys or private credentials were added. The source and final staged export were checked with Gitleaks 8.30.1; the final staged scan reported no leaks. Filename checks and a separate credential-pattern review were also performed. The original root environment file includes a server-secret-style `VITE_` variable name that is unused by the source; it was not carried into the client template. Keep server secrets in backend configuration.

## Validation

Validation used Node.js 20.20.2 and the existing lockfiles, without private environment values or Firebase deployment.

| Check | Result |
| --- | --- |
| Root `npm ci --no-audit --no-fund` | Passed; 704 packages installed |
| Functions `npm ci --no-audit --no-fund` | Passed; 618 packages installed |
| `npm run build` | Passed; includes `tsc -b`, Vite production build, and PWA generation |
| `npm run lint` | Passed; zero errors and zero warnings |
| `npm run build --prefix functions` | Passed; TypeScript compilation |
| `npm test --prefix functions -- --runInBand` | Failed before tests execute: Jest cannot load the ESM `nanoid` dependency from the current test setup |

The Functions test failure concerns the preserved CommonJS/Jest configuration and existing dependency: `functions/src/index.test.ts` imports `index.ts`, whose `nanoid` import reaches an untransformed ES module. The test, implementation, Jest configuration, TypeScript configuration, package file, and lockfile are all byte-for-byte unchanged from the original. No test rewrite or dependency upgrade was included in this repository recovery. No frontend test script exists.

The frontend build retains warnings about older Browserslist data, Recharts circular chunk dependencies, and large bundles. Runtime behavior against live Firebase was not tested: client environment values must be supplied locally for that. Firebase project/rules/Hosting configuration and the existing main-branch Hosting deployment workflow were preserved. Merging this PR would make that workflow eligible to deploy if its repository secret is configured; this recovery only pushes a separate branch and opens a PR.
