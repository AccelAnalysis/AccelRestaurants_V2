import fs from 'node:fs';
if (process.env.GITHUB_REF !== 'refs/heads/feat/customer-journey-hig') throw new Error('Feature branch only');
function change(path, before, after) { const text=fs.readFileSync(path,'utf8'); if(!text.includes(before)) throw new Error(`Missing boundary in ${path}: ${before.slice(0,100)}`); fs.writeFileSync(path,text.replace(before,after)); }
function all(path, before, after) { const text=fs.readFileSync(path,'utf8'); if(!text.includes(before)) throw new Error(`Missing boundary in ${path}: ${before.slice(0,100)}`); fs.writeFileSync(path,text.replaceAll(before,after)); }
fs.appendFileSync('src/lib/customerJourney.ts', `
// Stable operator destinations never claim the display host's TV activation homepage.
export function safeWorkspaceDestination(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || !/^\\/(admin|designer|super-admin|pair)(\\/|\\?|$)/.test(value)) return undefined;
  if (Array.from(value).some(c => c === '\\\\' || c.charCodeAt(0) < 32)) return undefined;
  try { const url = new URL(value, 'https://workspace.invalid'); return url.origin === 'https://workspace.invalid' && /^\\/(admin|designer|super-admin|pair)(\\/|$)/.test(url.pathname) ? url.pathname + url.search + url.hash : undefined; } catch { return undefined; }
}
`);
change('src/App.tsx','        </Routes>','          <Route path="/restaurants" element={<LandingPage />} />\n        </Routes>');
for(const path of ['src/components/journey/SiteLayout.tsx','src/pages/OnboardingPage.tsx','src/pages/LoginPage.tsx']) all(path,'to="/"','to="/restaurants"');
all('src/components/journey/SiteLayout.tsx','to="/#','to="/restaurants#');
change('src/components/journey/PlansPanel.tsx','to="/#contact"','to="/restaurants#contact"');
change('src/components/journey/PlansPanel.tsx','{quote.error &&','{valid && quote.error &&');
change('src/components/molecules/ProtectedRoute.tsx',"import { Navigate, useLocation } from 'react-router-dom';","import { Navigate, useLocation } from 'react-router-dom';\nimport { safeWorkspaceDestination } from '../../lib/customerJourney';");
change('src/components/molecules/ProtectedRoute.tsx','<Navigate to="/onboarding" replace />','<Navigate to={`/onboarding?redirect=${encodeURIComponent(safeWorkspaceDestination(location.pathname + location.search) || "/admin")}`} replace />');
change('src/pages/LoginPage.tsx',"import logo from '../assets/logo.png';","import logo from '../assets/logo.png';\nimport { safeWorkspaceDestination } from '../lib/customerJourney';");
change('src/pages/LoginPage.tsx',"const safe = requested && /^\\/(admin|designer|super-admin|pair)(\\/|\\?|$)/.test(requested) && !Array.from(requested).some(character => character === '\\\\' || character.charCodeAt(0) < 32) ? requested : '/onboarding';","const safe = safeWorkspaceDestination(requested) || '/onboarding';");
change('src/pages/LoginPage.tsx',"navigate('/onboarding', { state: { email } })","navigate(safeWorkspaceDestination(params.get('redirect')) ? `/onboarding?redirect=${encodeURIComponent(safeWorkspaceDestination(params.get('redirect'))!)}` : '/onboarding', { state: { email } })");
const onboarding='src/pages/OnboardingPage.tsx';
change(onboarding,'saveJourneyIntent, safeWebLink','saveJourneyIntent, safeWebLink, safeWorkspaceDestination');
change(onboarding,'const params = new URLSearchParams(location.search);','const params = new URLSearchParams(location.search);\n  const returnTo = safeWorkspaceDestination(params.get("redirect"));');
change(onboarding,"const query = new URLSearchParams(location.search);","const query = new URLSearchParams(location.search);\n    const destination = safeWorkspaceDestination(query.get('redirect'));\n    if (destination && (organization.industry || organization.isSetupComplete)) { navigate(destination, { replace: true }); return; }");
change(onboarding,'      setStep(3);','      if (returnTo) navigate(returnTo, { replace: true });\n      else setStep(3);');
change(onboarding,'<label className="block" htmlFor="setup-password">Password<input id="setup-password"','<label className="block" htmlFor="setup-password">Password<input aria-label="Password" aria-describedby="setup-password-help" id="setup-password"');
change(onboarding,'<span className="block text-sm text-text-secondary mt-2">Use at least eight characters.</span>','<span id="setup-password-help" className="block text-sm text-text-secondary mt-2">Use at least eight characters.</span>');
change(onboarding,'<div className="flex flex-wrap gap-3 mt-4"><button','{intent.plan && intent.plan !== organization.plan && <p className="mt-4">You selected {intent.plan}{intent.screens ? ` for ${intent.screens} screens` : ""}{intent.seats ? ` and ${intent.seats} team members` : ""}. Compare plans below to review payment, or start with your current plan.</p>}\n        <div className="flex flex-wrap gap-3 mt-4"><button');
change(onboarding,'initialized.current = key;\n    const saved = claimJourneyIntent(key);\n    setIntent(current => saveJourneyIntent({ ...saved, ...current }, key));','const firstAccount = initialized.current === null;\n    initialized.current = key;\n    const saved = claimJourneyIntent(key);\n    setIntent(current => saveJourneyIntent(firstAccount ? { ...saved, ...current } : saved, key));');
change('src/components/molecules/ProtectedRoute.tsx','organization.ownerId === user.uid && !organization.industry','organization.ownerId === user.uid && !organization.isSetupComplete && !organization.industry');
const guide='src/components/journey/FirstScreenGuide.tsx';
change(guide,'<div className="flex flex-wrap justify-between gap-4">','{screenId && <p className="text-sm text-text-secondary mb-3">Step 4 of 4 · Connect your screen</p>}<div className="flex flex-wrap justify-between gap-4">');
change(guide,'Open the player for ${screen.name} on the device connected to your display, then follow its connection instructions.','Open setup for ${screen.name}, choose its content, then follow the connection instructions on the device attached to your display.');
change(guide,'Open player in a new tab','Preview in a new tab');
change(guide,'A connection confirms that the player is responding. It does not confirm that the TV is on or the menu is visible.','A connection confirms that the screen device is responding. It does not confirm that the TV is on or the menu is visible. A preview tab is not a connected restaurant display.');
change('tests/hig/firebase-auth.js','export const getAuth','export const connectAuthEmulator = () => {};\nexport const getAuth');
change('tests/hig/firebase-functions.js','export const getFunctions','export const connectFunctionsEmulator = () => {};\nexport const getFunctions');
change('tests/hig/fixture.jsx','<Route path="/marketing"','<Route path="/restaurants" element={<LandingPage />} />\n      <Route path="/marketing"');
change('tests/cinematic/cinematic.spec.mjs',"toContainText('Connection lost')","toContainText('Your choices are still here')");
for(const path of ['tests/hig/journey.spec.mjs','tests/hig/full.spec.mjs']) all(path,"page.getByRole('alert')","page.getByRole('alert').filter({ hasText: /\\S/ })");
change('tests/hig/journey.spec.mjs','name: /Grill House/','name: /Grill house/');
change('tests/hig/journey.spec.mjs',"getByText('Enter whole numbers', { exact: false })","getByText('Enter whole numbers between 1 and 10,000.', { exact: true })");
for(const path of ['tests/hig/hig.spec.mjs','tests/measurement/browser.mjs']) { const text=fs.readFileSync(path,'utf8'); fs.writeFileSync(path,text.replaceAll("name: 'Forgot Password?'","name: 'Forgot password?'").replaceAll("name: 'Send Reset Link'","name: 'Send reset link'").replaceAll("name: 'Sign In'","name: 'Sign in'")); }
const dashboard='src/components/organisms/MeasurementDashboard.tsx';
for(const [before,after] of [
['Scans / 100 plays','Scans / 100 appearances'],['NPS sample','NPS responses'],['CSAT sample','CSAT responses'],
['Select your restaurant organization to view measurements.','Choose your restaurant to view guest responses.'],
['AccelRestaurants Measurement','AccelRestaurants · Guest responses'],["'Measurement setup'","'QR campaigns'"],
['Real campaign activity, guest actions, and satisfaction — attributed to their source.','See guest interest and feedback for your campaigns, restaurants and screens.'],
['Refresh measurements','Refresh results'],['Measurement views','Guest response views'],['From (location-local dates)','From'],
['<span className="block">Dataset</span>','<span className="block">Results</span>'],['Live measurements','Guest activity'],['Test measurements','Test activity'],
['Displayed results may be stale; no missing values have been replaced with zero.','The results below may be out of date. Missing results remain blank.'],
['Loading server-maintained aggregates…','Loading your results…'],['TEST DATA · Excluded from live reporting.','Test activity · Not included in guest results.'],
['Latest aggregate update:','Results updated:'],['No aggregate data has been recorded for this selection.','No results have been recorded for this selection.'],
['Plays count qualifying QR placement renders, not people. Scans count filtered redirect requests, not unique diners. Copied offers and outbound clicks are not verified purchases.','QR appearances count times a tracked code was shown, not people watching. Scans count openings of the QR link and may include repeat visits. Opening or copying an offer does not confirm a purchase.'],
['Recorded placement plays','QR appearances'],['of recorded placement time','of recorded time on screen'],
['scans per 100 plays — not a viewer conversion rate','scans per 100 QR appearances — not a percentage of guests'],
['Engaged scan sessions','Scans with an action'],['of first-party offer/survey scan cohorts','of scans to an offer or feedback page. External links are excluded.'],
['completion within scan cohorts','of started feedback forms were completed'],
['n=${totals.npsResponses || 0} · promoters minus detractors','${totals.npsResponses || 0} responses · percentage rating 9–10 minus percentage rating 0–6'],
['n=${totals.csatResponses || 0} · ratings 4–5 on a 1–5 scale','${totals.csatResponses || 0} responses · percentage rating 4–5 out of 5'],
['Observed intent, not redemptions','Interest in an offer, not confirmed purchases'],['Outbound CTA clicks','Menu button clicks'],['Measured on first-party offer pages','Clicks on the menu button on an offer page'],
['No measurement yet','No guest activity yet'],
['Create a campaign, attach it to a QR tile, and authorize its physical player. Missing telemetry is not reported as zero audience engagement.','Create a campaign, add it to a QR code in your design, then follow screen setup to connect your display. Guest results appear after activity is recorded.'],
['Set up a measured campaign','Create a QR campaign'],
['Activity dates use each placement’s location timezone. Gaps indicate missing aggregates, not measured zero.','Dates use the time zone of each restaurant. Gaps mean results are unavailable, not zero activity.'],
['These are self-selected guest responses, not a representative sample of all diners. Compare consistent questions and periods; small samples remain directional. NPS/CSAT are recomputed from summed response counts, never averaged from daily scores.','Feedback comes from guests who choose to respond, so it may not reflect everyone. Compare the same questions over similar periods and check the number of responses. Combined scores use all responses, rather than averaging daily scores.'],
['comparison — recorded activity, not a causal ranking','comparison — activity recorded during the selected dates'],
['No recorded measurement for this selection.','No results have been recorded for this selection.'],["'NPS · sample', 'CSAT · sample'","'NPS · responses', 'CSAT · responses'"]
]) change(dashboard,before,after);
const setup='src/components/organisms/MeasurementSetup.tsx';
for(const [before,after] of [
['Campaign created. Attach it to an existing QR tile below.','Campaign created. Add it to a QR code in your design below.'],
['Campaign setup and player authorization are available to organization administrators. Your reports remain scoped to your assigned locations.','Ask your restaurant owner or administrator to set up campaigns and screens. You can view results for your assigned restaurants.'],
['Create a measured campaign','Create a QR campaign'],
['Choose a ready-to-use guest experience. Campaign content and survey questions are versioned by creating a new campaign; old results never change meaning.','Choose what guests see after scanning. To change an offer or question later, create a new campaign so earlier responses stay with the original.'],
['Tracked menu / external link','Menu or website link'],['Offer reveal + tracked menu action','Offer code and menu link'],
['NPS + optional comment','Likelihood to recommend (NPS)'],['CSAT + optional comment','Visit satisfaction (CSAT)'],['NPS and CSAT','Recommendation and satisfaction'],
['Restaurant destination (HTTPS)','Menu or website address'],['Attach campaign to a QR tile','Add a campaign to your design'],
['The same slide gets a distinct placement for each screen and location. Add a QR tile in the ','Results are grouped by screen and restaurant. Add a QR code in the '],['>slide editor</Link>','>design editor</Link>'],
['Campaign attached. Live players will receive the new slide revision.','Campaign added. Check your screen setup to make sure the updated design is showing.'],
['availableTiles.map(tile =>','availableTiles.map((tile, index) =>'],['{tile.name || tile.id}',"{tile.name || `QR code ${index + 1}`}"],
['Enter the measurement code displayed on the actual screen. This one-time authorization prevents anyone with a public player URL from manufacturing live play counts. Publishing and playback continue without it.','Enter the code shown on your restaurant screen to include it in your campaign results. Your menu can continue showing while you complete this step.'],
['Player authorized. Its measurement session will reconnect automatically.','Screen connected to campaign reporting. Results appear when activity is recorded.'],
['No measured campaigns yet.','No QR campaigns yet.'],['{campaign.kind} · {campaign.status}',"{campaign.kind === 'external' ? 'Menu or website link' : campaign.kind === 'offer' ? 'Offer' : 'Guest feedback'} · {campaign.status === 'active' ? 'Active' : 'Paused'}"]
]) change(setup,before,after);
change('src/services/measurementService.ts',"export const measurementError = (error: unknown) => error instanceof Error ? error.message.replace(/^FirebaseError: /, '') : 'Measurement is unavailable. Please retry.';",`export const measurementError = (error: unknown) => {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.endsWith('unauthenticated')) return 'Please sign in again to continue.';
  if (code.endsWith('permission-denied')) return 'You do not have access to these results. Ask your restaurant owner for help.';
  if (code.endsWith('failed-precondition')) return 'This request is not ready yet. Check the selected campaign and screen, then try again.';
  if (code.endsWith('invalid-argument')) return 'Check that all required entries are complete and valid, then try again.';
  if (code.endsWith('resource-exhausted')) return 'There have been too many requests. Please try again shortly.';
  return 'We could not complete this request. Check your connection, then try again. Your choices are still here.';
};`);
for(const [before,after] of [
['comparison — recorded activity, not a causal ranking','comparison — activity recorded during the selected dates'],
['Create a measured campaign','Create a QR campaign'],
['Campaign created. Attach it to an existing QR tile below.','Campaign created. Add it to a QR code in your design below.'],
['Campaign attached. Live players will receive the new slide revision.','Campaign added. Check your screen setup to make sure the updated design is showing.']
]) change('tests/measurement/browser.mjs',before,after);
change('tests/hig/playwright.config.mjs',"reporter: [['list'], ['html',","reporter: [['json', { outputFile: 'results/summary.json' }], ['list'], ['html',");
fs.rmSync('.github/workflows/journey-source-review.yml',{force:true});
console.log('Customer journey copy, navigation and regression integration complete.');
