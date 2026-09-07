import fs from 'node:fs';
const branch = process.env.GITHUB_REF;
if (branch !== 'refs/heads/feat/customer-journey-hig') throw new Error('Feature branch only');
const read = path => fs.readFileSync(path, 'utf8');
const write = (path, text) => fs.writeFileSync(path, text);
function change(path, before, after) {
  const text = read(path);
  if (!text.includes(before)) throw new Error(`Expected integration boundary missing in ${path}: ${before.slice(0, 90)}`);
  write(path, text.replace(before, after));
}
function section(path, start, end, replacement) {
  const text = read(path), a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Expected section missing in ${path}: ${start}`);
  write(path, text.slice(0, a) + replacement + '\n\n' + text.slice(b));
}
// Wire public website configuration without copying server credentials into its editor.
change('src/services/configService.ts', "import { PLAN_CONFIGS } from '../lib/plans';", "import { validateCatalogue } from '../../functions/src/journey/catalog';\nimport type { WebsiteContent } from '../lib/websiteContent';");
change('src/services/configService.ts', 'export interface GeneralConfig {', 'export interface GeneralConfig {\n  marketing?: WebsiteContent;');
section('src/services/configService.ts', '  getPlanConfigs: async ()', '  /**\n   * Save plan configurations', `  getPlanConfigs: async (): Promise<Record<PlanType, PlanLimits>> => {
    const snapshot = await getDoc(doc(db, SYSTEM_COLLECTION, PLANS_DOC));
    if (!snapshot.exists()) throw new Error('Current plan details are not available.');
    return validateCatalogue(snapshot.data().configs) as Record<PlanType, PlanLimits>;
  },
`);
change('src/services/configService.ts', '        configs,\n        updatedAt:', '        configs: validateCatalogue(configs),\n        updatedAt:');
change('src/services/billingService.ts', 'export const BillingService = {', `export const BillingService = {
  createPlanCheckout: async (orgId: string, planName: string, screens: number, seats: number, returnTo: 'setup' | 'billing', requestId: string): Promise<string> => {
    const call = httpsCallable(functions, 'createStripeCheckoutSession');
    const response = await call({ orgId, planName, screens, seats, returnTo, requestId, mode: 'subscription' });
    const url = (response.data as { url?: string }).url;
    if (!url || new URL(url).protocol !== 'https:') throw new Error('Payment options could not be opened.');
    return url;
  },`);
// Keep the cinematic wizard, including its durable request and transaction behaviour.
const wizard = 'src/components/cinematic/RestaurantStarterWizard.tsx';
change(wizard, "import { useEffect, useMemo, useRef, useState } from 'react';", "import { useEffect, useMemo, useRef, useState } from 'react';\nimport { customerError } from '../../lib/customerJourney';");
change(wizard, 'firstScreen?: boolean;', 'firstScreen?: boolean; initialTemplateId?: string;');
change(wizard, 'function readDraft(key: string, brandName: string, firstScreen: boolean): Draft {', 'function readDraft(key: string, brandName: string, firstScreen: boolean, initialTemplateId?: string): Draft {');
change(wizard, "defaultStarter('coffee-house', brandName.slice", "defaultStarter(RESTAURANT_TEMPLATES.some(t => t.id === initialTemplateId) ? initialTemplateId! : 'coffee-house', brandName.slice");
change(wizard, 'firstScreen = false, onClose, onComplete, createStarter', 'firstScreen = false, initialTemplateId, onClose, onComplete, createStarter');
change(wizard, 'const key = `accel:restaurant-starter:v1:${orgId}:${userId}`;', 'const key = `accel:restaurant-starter:v1:${orgId}:${userId}${initialTemplateId ? `:${initialTemplateId}` : ""}`;');
change(wizard, 'readDraft(key, brandName, firstScreen)', 'readDraft(key, brandName, firstScreen, initialTemplateId)');
change(wizard, "setError(e instanceof Error ? e.message : 'Content could not be created. Your choices are saved; retry safely.');", "setError(customerError(e, 'We could not complete this step. Your choices are still here. Try again, or open your saved design below.'));");
change(wizard, 'Creates a location and inactive screen draft. Existing screens are never replaced. Leave off to create a slide only.', 'Adds a screen for this design. Your other screens stay unchanged. Connect it when you are ready. Turn this off to save just the design.');
change(wizard, 'Review names and prices before publishing. QR tracking can be added in the editor using the measurement tools; this wizard creates no QR destinations or tracking events.', 'Check your menu names and prices before showing them to guests. After connecting your screen, you can add a QR offer or feedback form from your dashboard.');
change(wizard, "'Create screen draft' : 'Create editable slide'", "'Create my screen' : 'Save my design'");
change(wizard, "'screen setup' : 'slide editor'", "'screen setup' : 'your design'");
// Add guidance around existing tools; do not replace player or screen-editor implementation.
change('src/pages/AdminDashboard.tsx', "import { ScreenEditor } from '../components/organisms/ScreenEditor';", "import { ScreenSetupPage as ScreenEditor } from '../components/journey/ScreenSetupPage';");
change('src/components/organisms/DashboardOverview.tsx', "import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { FirstScreenGuide } from '../journey/FirstScreenGuide';");
change('src/components/organisms/DashboardOverview.tsx', '<div className="p-8">', '<div className="p-4 sm:p-8">\n      <FirstScreenGuide />');
change('src/components/organisms/DashboardOverview.tsx', 'active now', 'enabled for playback');
change('src/components/organisms/DashboardOverview.tsx', 'Welcome back to AccelRestaurants Admin', 'Manage your restaurant screens and content');
change('src/components/organisms/AdminShell.tsx', "{ to: '/admin/settings', label: 'Settings', icon: Settings },", "{ to: '/admin/subscription', label: 'Plan and billing', icon: Settings },\n    { to: '/admin/settings', label: 'Settings', icon: Settings },");
// Keep profile setup distinct from actually connecting a TV.
change('src/pages/OnboardingPage.tsx', '<nav aria-label="Setup progress"><ol', '<nav aria-label="Setup progress"><p className="text-sm mb-2">Step {step} of 4</p><ol');
change('src/pages/OnboardingPage.tsx', 'if (userProfile?.platformRole === \'admin\' && !requested)', "if (userProfile?.platformRole === 'admin' && organization.isSetupComplete && !requested)");
// Never render a non-working hide action on the dedicated connection page.
change('src/components/journey/FirstScreenGuide.tsx', '<button type="button" className="ui-button ui-button-secondary" onClick={() => { setDismissed(true);', '{!screenId && <button type="button" className="ui-button ui-button-secondary" onClick={() => { setDismissed(true);');
change('src/components/journey/FirstScreenGuide.tsx', 'disabled={!!screenId}>Hide setup tips</button>', '>Hide setup tips</button>}');
change('src/components/journey/PlansPanel.tsx', 'Free is a limited preview, not a 14-day trial.', 'Free includes a five-minute screen preview.');
// Render every website link that the settings editor can manage.
change('src/components/journey/SiteLayout.tsx', '<p className="text-text-secondary mt-2">Part of AccelDigitalDisplays</p>', '<p className="text-text-secondary mt-2">{config.footerCopyrightText || "Restaurant screens and guest feedback"}</p>');
change('src/components/journey/SiteLayout.tsx', '</div>\n    </footer>', `<div className="max-w-7xl mx-auto flex flex-wrap gap-4 mt-6">{[...(config.footerLinks || []), ...(config.socialLinks || []).map(row => ({ label: row.platform, url: row.url }))].filter(row => safeWebLink(row.url)).map((row, i) => <a key={i} className="min-h-11 inline-flex items-center underline" href={safeWebLink(row.url)}>{row.label}</a>)}</div></div>\n    </footer>`);
// This module has been introduced specifically for the subscription flow.
const backend = 'functions/src/index.ts';
change(backend, "import { preflightCinematicImport } from './cinematic/importPolicy';", "import { preflightCinematicImport } from './cinematic/importPolicy';\nimport { checkoutSubscription, publicSubscriptionPlans, syncJourneySubscription, journeyBillingReturn, type CheckoutRequest } from './journey/billing';\nimport { assertBillingMember } from './journey/catalog';");
section(backend, 'export const getSubscriptionPlans =', 'export const createStripeCheckoutSession =', `export const getSubscriptionPlans = functions.https.onCall(async () => {
  return publicSubscriptionPlans(db);
});`);
change(backend, 'async (data: { \n  priceId?: string; \n  successUrl: string;', 'async (data: CheckoutRequest & { \n  priceId?: string; \n  successUrl: string;');
change(backend, "  const { priceId, successUrl, cancelUrl, mode = 'subscription', amount, currency, metadata, addOns } = data;", `  if (!data || typeof data !== 'object') throw new functions.https.HttpsError('invalid-argument', 'Choose a plan first.');
  if ((data.mode || 'subscription') === 'subscription') {
    return checkoutSubscription(db, getStripe(), data, context.auth.uid);
  }
  const { priceId, successUrl, cancelUrl, mode = 'subscription', amount, currency, metadata, addOns } = data;`);
change(backend, '    const stripeCustomerId = orgDoc.data()?.stripeCustomerId;', `    const membership = await db.doc(\`organizations/\${orgId}/members/\${userId}\`).get();
    try { assertBillingMember(orgDoc.data() || {}, membership.data(), userId); }
    catch { throw new functions.https.HttpsError('permission-denied', 'Only restaurant owners and administrators can manage billing.'); }
    const stripeCustomerId = orgDoc.data()?.stripeCustomerId;`);
change(backend, '      return_url: data.returnUrl\n', '      return_url: journeyBillingReturn(data.returnUrl)\n');
section(backend, 'async function handleInvoicePaymentSucceeded(', 'async function handleInvoicePaymentFailed(', `async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const orgId = await findOrgByCustomerId(customerId);
  if (!orgId) return;
  const org = await db.doc(\`organizations/\${orgId}\`).get();
  const id = org.data()?.subscriptionId;
  if (typeof id === 'string') await syncJourneySubscription(db, getStripe(), await getStripe().subscriptions.retrieve(id), orgId);
}`);
section(backend, 'async function handleInvoicePaymentFailed(', 'async function handleSubscriptionUpdated(', `async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // A delayed invoice must not revive or downgrade a different subscription.
  await handleInvoicePaymentSucceeded(invoice);
}`);
section(backend, 'async function handleSubscriptionUpdated(', 'async function handleSubscriptionDeleted(', `async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await syncJourneySubscription(db, getStripe(), subscription);
}`);
section(backend, 'async function handleSubscriptionDeleted(', 'async function handleCheckoutSessionCompleted(', `async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await syncJourneySubscription(db, getStripe(), subscription);
}`);
section(backend, 'async function handleCheckoutSessionCompleted(', 'const assertOrgAudioAccess =', `async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;
  const orgId = session.metadata?.orgId;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!orgId || !customerId || !subscriptionId || !/^[\\w-]{1,128}$/.test(orgId)) throw new Error('Subscription checkout cannot be matched.');
  const ref = db.doc(\`organizations/\${orgId}\`);
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Restaurant no longer exists.');
  if (existing.data()?.stripeCustomerId && existing.data()?.stripeCustomerId !== customerId) throw new Error('Billing account mismatch.');
  await ref.update({ stripeCustomerId: customerId, updatedAt: Timestamp.now() });
  await syncJourneySubscription(db, getStripe(), await getStripe().subscriptions.retrieve(subscriptionId), orgId);
}

`);
change('functions/src/journey/billing.ts', 'export async function checkoutSubscription(', `export function journeyBillingReturn(requested: unknown) {
  let setup = false;
  try { setup = typeof requested === 'string' && new URL(requested).pathname === '/onboarding'; } catch { /* Use billing by default. */ }
  return origin() + (setup ? '/onboarding?content=1' : '/admin/subscription');
}
export async function checkoutSubscription(`);
change('functions/src/journey/billing.ts', '  const catalogue = await loadJourneyCatalogue(db);\n  let name:', '  const base = origin();\n  const catalogue = await loadJourneyCatalogue(db);\n  let name:');
change('functions/src/journey/billing.ts', '  const base = origin();\n  const setup', '  const setup');
// Use explicit event types in the new customer surfaces.
for (const path of ['src/pages/OnboardingPage.tsx', 'src/pages/LoginPage.tsx', 'src/components/organisms/settings/OrganizationView.tsx', 'src/components/journey/WebsiteContentEditor.tsx', 'src/components/organisms/GeneralSettingsEditor.tsx']) {
  const text = read(path);
  if (text.includes('React.FormEvent')) write(path, "import type { FormEvent } from 'react';\n" + text.replaceAll('React.FormEvent', 'FormEvent'));
}
// Extend existing isolated HIG fixtures, never the production entry point.
const fixture = 'tests/hig/fixture.jsx';
change(fixture, "import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { LandingPage } from '../../src/pages/LandingPage';\nimport { FirstScreenGuide } from '../../src/components/journey/FirstScreenGuide';\nimport { OrganizationView } from '../../src/components/organisms/settings/OrganizationView';\nimport { OrganizationService } from '../../src/services/organizationService';\nimport * as journeyHelpers from '../../src/lib/customerJourney';");
change(fixture, "const organization = { ...useAuthStore.getState().organization, industry:", "const organization = { ...useAuthStore.getState().organization, stripeCustomerId: 'cus-test', industry:");
change(fixture, 'fixture.authenticate = () => useAuthStore.setState({ user:', "if (location.pathname === '/onboarding') useAuthStore.setState({ userProfile: { ...useAuthStore.getState().userProfile, platformRole: 'user' } });\nif (params.has('newSubscription')) useAuthStore.setState({ organization: { ...organization, subscriptionId: undefined } });\nfixture.authenticate = () => useAuthStore.setState({ user:");
change(fixture, 'fixture.colorMath =', `fixture.journeyHelpers = journeyHelpers;
fixture.setConfig = value => useConfigStore.setState({ generalConfig: { ...useConfigStore.getState().generalConfig, ...value } });
fixture.screen = screen;
fixture.setOwnerProfile = value => useAuthStore.setState({ organization: { ...useAuthStore.getState().organization, ...value } });
ConfigService.getPlanConfigs = async () => { if (fixture.failPlans) throw new Error('fixture plan failure'); return fixture.planCatalogue || PLAN_CONFIGS; };
BillingService.createPlanCheckout = async (...args) => { fixture.checkoutCalls.push(args); throw new Error('fixture checkout failure'); };
OrganizationService.updateOrganization = async (...args) => { if (fixture.failSave) throw new Error('fixture save failure'); fixture.dbWrites.push(args); };
fixture.colorMath =`);
change(fixture, '    <Routes>\n      <Route path="/super-admin/templates', '    <Routes>\n      <Route path="/" element={<LandingPage />} />\n      <Route path="/marketing" element={<LandingPage />} />\n      <Route path="/setup-guide" element={<FirstScreenGuide />} />\n      <Route path="/restaurant-settings" element={<OrganizationView />} />\n      <Route path="/super-admin/templates');
// The old tests assume compulsory payment before design. Replace those four cases,
// retaining keyboard, cancellation, retry, accessibility and untouched-billing assertions.
const tests = 'tests/hig/full.spec.mjs';
section(tests, "test('billing plan review cancel", "test('invitation network error", `test('billing errors retain plan choices without confirming a purchase',async({page},info)=>{
 await page.goto('/billing?newSubscription=1');
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(0);
 await page.getByRole('button',{name:'Choose Basic plan',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('No payment was confirmed');
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(1);
 await expect(page.getByRole('button',{name:'Choose Basic plan',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Choose Basic plan',exact:true}).click();
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(2);
 await audit(page);await fits(page);await page.screenshot({path:info.outputPath('billing.png'),fullPage:true});
});
test('billing load retry and existing subscription changes use the portal',async({page})=>{
 await page.goto('/billing?failPlans=1');await expect(page.getByRole('alert')).toContainText('load current plan');
 await page.evaluate(()=>window.__hig.failPlans=false);await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose Basic plan',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Manage subscription',exact:true}).click();await expect(page.getByRole('alert')).toContainText('billing details');
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(0);
 expect(await page.evaluate(()=>window.__hig.portalCalls.length)).toBe(1);
});
test('onboarding account labels, compact progress and validation',async({page})=>{
 await page.goto('/onboarding?new=1');await expect(page.getByText('Step 1 of 4')).toBeVisible();await audit(page);await fits(page);
 await page.getByLabel('Full name',{exact:true}).fill('New owner');await page.getByLabel('Email',{exact:true}).fill('owner@example.invalid');await page.getByLabel('Password',{exact:true}).fill('not-a-real-password');await page.getByLabel(/I agree/).check();
 await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
 await page.evaluate(()=>window.__hig.allowAuth=true);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByText('Step 2 of 4')).toBeVisible();await audit(page);
});
test('design setup is optional, cancellation is neutral and save failure keeps progress',async({page},info)=>{
 await page.goto('/onboarding');await expect(page.getByText('Step 3 of 4')).toBeVisible();await audit(page);await fits(page);
 await page.getByRole('button',{name:'Choose a restaurant design',exact:true}).click();await expect(page.getByRole('dialog',{name:'Your restaurant, screen-ready'})).toBeVisible();
 await page.getByRole('button',{name:'Save for later',exact:true}).click();
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(0);
 expect(await page.evaluate(()=>window.__hig.callables.length)).toBe(0);
 await page.evaluate(()=>window.__hig.failDatabase=true);await page.getByRole('button',{name:'Set up later',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('could not finish');await expect(page.getByText('Step 3 of 4')).toBeVisible();
 await audit(page);await page.screenshot({path:info.outputPath('onboarding.png'),fullPage:true});
});
`);
// Update only changed customer wording in the cinematic tests; preserve all assertions.
function walk(path) { return fs.existsSync(path) ? fs.readdirSync(path,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(path+'/'+entry.name) : [path+'/'+entry.name]) : []; }
for (const path of [...walk('tests/cinematic'), ...walk('scripts')].filter(p => /\.(mjs|js|ts|tsx)$/.test(p))) {
  const text = read(path);
  const updated = text.replaceAll('Create screen draft', 'Create my screen').replaceAll('Create editable slide', 'Save my design');
  if (updated !== text) write(path, updated);
}
console.log('Customer journey integration complete. No player, screen editor or production configuration was changed.');
