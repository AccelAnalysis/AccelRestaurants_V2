import fs from 'node:fs';
if (process.env.GITHUB_REF !== 'refs/heads/feat/customer-journey-hig') throw new Error('Feature branch only');
function change(path, before, after) { const text = fs.readFileSync(path, 'utf8'); if (!text.includes(before)) throw new Error(`Missing boundary in ${path}: ${before.slice(0,100)}`); fs.writeFileSync(path, text.replace(before, after)); }
change('functions/src/journey/catalog.test.ts', "test.each([[{ price: { id: 'price_external' }, quantity: 1 }], [{ price: { id: 'price_growth' }, quantity: 2 }], [{ price: { id: 'price_growth' }, quantity: 1 }, { price: { id: 'price_basicScreen' }, quantity: 1 }]])('rejects unknown and mismatched subscription items', items => expect(() => subscriptionAllowance(catalogue, items)).toThrow());", "test('rejects unknown and mismatched subscription items', () => { for (const items of [[{ price: { id: 'price_external' }, quantity: 1 }], [{ price: { id: 'price_growth' }, quantity: 2 }], [{ price: { id: 'price_growth' }, quantity: 1 }, { price: { id: 'price_basicScreen' }, quantity: 1 }]]) expect(() => subscriptionAllowance(catalogue, items)).toThrow(); });");
const settings = 'src/components/organisms/settings/OrganizationView.tsx';
change(settings, 'const { user, organization } = useAuthStore();', 'const { user, organization } = useAuthStore();\n  const orgId = organization?.id, ownerId = organization?.ownerId;');
change(settings, "if (!user || !organization) return;\n    if (organization.ownerId === user.uid)", 'if (!user || !orgId) return;\n    if (ownerId === user.uid)');
change(settings, "getDoc(doc(db, 'organizations', organization.id, 'members', user.uid))", "getDoc(doc(db, 'organizations', orgId, 'members', user.uid))");
change(settings, '[user, organization?.id, organization?.ownerId]', '[user, orgId, ownerId]');
const panel = 'src/components/cinematic/AtmospherePresetPanel.tsx';
change(panel, 'Reduced-motion preferences always win. Unsupported graphics fall back to a readable static board. Eco uses a smaller rendering budget.', 'When Reduce Motion is on, the background stays still. If your device cannot show an effect, your menu remains readable without it. Eco reduces the load on your screen device.');
change(panel, '{p.description}', "{p.id === 'clear' ? 'A clean, still background that keeps your menu easy to read.' : p.description}");
change(panel, 'Static presentation is included.', 'A still background is included.');
// A disclosure should look expandable as well as expose its native accessible state.
for (const path of ['src/pages/LandingPage.tsx','src/components/journey/WebsiteContentEditor.tsx']) {
  const text = fs.readFileSync(path, 'utf8');
  fs.writeFileSync(path, text.replaceAll('min-h-11 flex items-center cursor-pointer font-semibold', 'min-h-11 py-3 cursor-pointer font-semibold'));
}
console.log('Final customer copy and backend test boundaries integrated.');
