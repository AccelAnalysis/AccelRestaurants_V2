import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function audit(page, selector) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']);
  if (selector) builder = builder.include(selector);
  const report = await builder.analyze();
  expect(report.violations.filter(v => ['serious','critical'].includes(v.impact)).map(v => ({ id:v.id, nodes:v.nodes.map(n => ({ target:n.target, summary:n.failureSummary })) }))).toEqual([]);
}
async function fits(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
});
for (const section of ['Organizations','Designers','Templates','Knowledge Base','System Config','General Settings','Notifications']) {
  test(`super-admin ${section} names, layout and accessibility`, async ({ page }, info) => {
    const errors=[]; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/super-admin');
    await page.getByRole('button', {name:section, exact:true}).click();
    await expect(page.getByRole('button', {name:section, exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByText(/Loading (organizations|designers|templates)/)).toHaveCount(0);
    await audit(page); await fits(page); expect(errors).toEqual([]);
    if (section === 'General Settings' || section === 'Organizations') await page.screenshot({path:info.outputPath('super-admin.png'),fullPage:true});
  });
}
test('organization management dialog, labels and cancelled impersonation', async ({ page }) => {
  await page.goto('/super-admin');
  await page.getByRole('button', { name:/Manage/ }).first().click();
  const dialog=page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await page.getByRole('button',{name:'Limits & Quotas'}).click(); await audit(page); await fits(page);
  await page.getByRole('button',{name:'Tile Access'}).click(); await audit(page);
  await page.getByRole('button',{name:'General & Plan'}).click();
  await page.getByRole('button',{name:'Impersonate',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Confirm action'})).toBeVisible();
  await page.getByRole('button',{name:'Keep unchanged'}).click();
  expect(await page.evaluate(() => window.__hig.callables.length)).toBe(0);
});
test('designer invitation failure keeps labelled draft', async ({page}) => {
  await page.goto('/super-admin'); await page.getByRole('button',{name:'Designers',exact:true}).click();
  await page.getByRole('button',{name:'Invite Designer',exact:true}).click();
  await page.getByLabel('Full Name',{exact:true}).fill('New designer'); await page.getByLabel('Email Address',{exact:true}).fill('new@example.invalid');
  await page.evaluate(() => window.__hig.failSave=true); await page.getByRole('button',{name:'Send Invite',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Failed to invite');
  await expect(page.getByLabel('Full Name',{exact:true})).toHaveValue('New designer'); await audit(page);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('notification load and save failure both recover', async ({page}) => {
  await page.goto('/super-admin?failNotifications=1'); await page.getByRole('button',{name:'Notifications',exact:true}).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('Could not load');
  await page.evaluate(() => window.__hig.failNotifications=false); await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.getByRole('button',{name:/Welcome email/}).click(); await page.getByLabel('Subject Line').fill('Edited welcome');
  await page.evaluate(() => window.__hig.failSave=true); await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('Failed to save'); await expect(page.getByLabel('Subject Line')).toHaveValue('Edited welcome');
  await page.evaluate(() => window.__hig.failSave=false); await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('saved'); await audit(page);
});
test('article editor focus and retained save failure', async ({page}) => {
  await page.goto('/super-admin'); await page.getByRole('button',{name:'Knowledge Base',exact:true}).click();
  await page.getByRole('button',{name:/Edit/i}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible(); await audit(page);
  await page.getByLabel('Title',{exact:true}).fill('Updated guide'); await page.evaluate(() => window.__hig.failSave=true);
  await page.getByRole('dialog').getByRole('button',{name:/Save/}).click(); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Failed');
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Updated guide');
});
for(const route of ['/designer','/designer/my-jobs','/designer/profile','/marketplace','/job/job-1','/pricing','/billing-status']) {
 test(`workspace ${route} is usable on compact screens`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(route);
  await expect(page.getByText(/Loading (profile|designer|jobs|job details|available jobs)/i)).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveText('');await audit(page);await fits(page);expect(errors).toEqual([]);
  if(route==='/designer/profile')await page.screenshot({path:info.outputPath('designer.png'),fullPage:true});
 });
}
test('designer profile saves by keyboard and retains failures',async({page})=>{
 await page.goto('/designer/profile');await page.getByLabel('Display Name').fill('Jamie Updated');
 await page.evaluate(()=>window.__hig.failSave=true);await page.getByLabel('Display Name').press('Enter');
 await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('Failed');await expect(page.getByLabel('Display Name')).toHaveValue('Jamie Updated');
 await page.evaluate(()=>window.__hig.failSave=false);await page.getByRole('button',{name:'Save Changes'}).click();
 await expect.poll(()=>page.evaluate(()=>window.__hig.profileWrites.length)).toBe(1);
});
test('billing errors retain plan choices without confirming a purchase',async({page},info)=>{
 await page.goto('/billing?newSubscription=1');
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(0);
 await page.getByRole('button',{name:'Choose Basic plan',exact:true}).click();
 await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('No payment was confirmed');
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(1);
 await expect(page.getByRole('button',{name:'Choose Basic plan',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Choose Basic plan',exact:true}).click();
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(2);
 await audit(page);await fits(page);await page.screenshot({path:info.outputPath('billing.png'),fullPage:true});
});
test('billing load retry and existing subscription changes use the portal',async({page})=>{
 await page.goto('/billing?failPlans=1');await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('load plan');
 await page.evaluate(()=>window.__hig.failPlans=false);await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose Basic plan',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Manage subscription',exact:true}).click();await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('billing details');
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(0);
 expect(await page.evaluate(()=>window.__hig.portalCalls.length)).toBe(1);
});
test('onboarding account labels, compact progress and validation',async({page})=>{
 await page.goto('/onboarding?new=1');await expect(page.getByText('Step 1 of 4')).toBeVisible();await audit(page);await fits(page);
 await page.getByLabel('Full name',{exact:true}).fill('New owner');await page.getByLabel('Email',{exact:true}).fill('owner@example.invalid');await page.getByLabel('Password',{exact:true}).fill('not-a-real-password');await page.getByLabel(/I agree/).check();
 await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toBeVisible();
 await page.evaluate(()=>window.__hig.allowAuth=true);await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByText('Step 2 of 4')).toBeVisible();await audit(page);
});
test('design setup is optional, cancellation is neutral and save failure keeps progress',async({page},info)=>{
 await page.goto('/onboarding');await expect(page.getByText('Step 3 of 4')).toBeVisible();await audit(page);await fits(page);
 await page.getByRole('button',{name:'Choose a restaurant design',exact:true}).click();await expect(page.getByRole('dialog',{name:'Your restaurant, screen-ready'})).toBeVisible();
 await page.getByRole('button',{name:'Save for later',exact:true}).click();
 expect(await page.evaluate(()=>window.__hig.checkoutCalls.length)).toBe(0);
 expect(await page.evaluate(()=>window.__hig.callables.length)).toBe(0);
 await page.evaluate(()=>window.__hig.failDatabase=true);await page.getByRole('button',{name:'Set up later',exact:true}).click();
 await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('could not finish');await expect(page.getByText('Step 3 of 4')).toBeVisible();
 await audit(page);await page.screenshot({path:info.outputPath('onboarding.png'),fullPage:true});
});


test('invitation network error can retry rather than declare link invalid',async({page})=>{
 await page.goto('/join?token=synthetic&id=invite-1&failCallable=1');await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('may still be valid');
 await page.evaluate(()=>window.__hig.failCallable=false);await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('heading',{name:'Join Test restaurant'})).toBeVisible();await audit(page);await fits(page);
});
test('tenant colors remain legible and malformed or failed saves keep drafts',async({page})=>{
 await page.goto('/brand');await page.getByLabel('Primary brand color hex').fill('not-a-color');await page.getByRole('button',{name:'Save Changes'}).click();
 await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(/color|hex/i);expect(await page.evaluate(()=>window.__hig.configWrites.length)).toBe(0);
 await page.getByLabel('Primary brand color hex').fill('#ffffff');await page.evaluate(()=>window.__hig.failSettings=true);await page.getByRole('button',{name:'Save Changes'}).click();
 await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText(/fail|could not/i);await expect(page.getByLabel('Primary brand color hex')).toHaveValue('#ffffff');
 await page.evaluate(()=>window.__hig.failSettings=false);await page.getByRole('button',{name:'Save Changes'}).click();await expect.poll(()=>page.evaluate(()=>window.__hig.configWrites.length)).toBe(1);
 for(const color of ['#ffffff','#000000','#ff0000','#00ff00','#0000ff','#ffff00']){await page.evaluate(c=>window.__hig.setBrand(c),color);await audit(page);}
});
test('brand contrast derivation handles a 4096-color grid and invalid values',async({page})=>{
 await page.goto('/brand');const failures=await page.evaluate(()=>{
  const {deriveBrandColors,contrastRatio,normalizeHex}=window.__hig.colorMath;let failures=[];
  for(let r=0;r<256;r+=17)for(let g=0;g<256;g+=17)for(let b=0;b<256;b+=17){const hex='#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');const c=deriveBrandColors(hex);if(contrastRatio(c.action,'#ffffff')<4.5||['#111827','#1f2937','#374151','#374155'].some(bg=>contrastRatio(c.text,bg)<4.5))failures.push(hex);}
  if(normalizeHex('#AbC')!=='#aabbcc'||normalizeHex('red')!==null||normalizeHex('url(x)')!==null)failures.push('parsing');return failures;
 });expect(failures).toEqual([]);
});
test('form and poll acknowledge only successful persistence and allow retry',async({page})=>{
 await page.goto('/form-tile');await page.getByLabel('Name (required)').fill('A guest');await page.getByLabel('Email (required)').fill('guest@example.invalid');await page.getByRole('button',{name:'Submit Request'}).click();
 await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('Your entries are still here');await expect(page.getByLabel('Name (required)')).toHaveValue('A guest');await page.evaluate(()=>window.__hig.failForm=false);await page.getByRole('button',{name:'Submit Request'}).click();await expect(page.getByRole('status')).toContainText('sent successfully');await audit(page);
 await page.goto('/poll-tile');await page.getByRole('button',{name:/Tea/}).click();await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toContainText('could not be saved');await page.evaluate(()=>window.__hig.failVote=false);await page.getByRole('button',{name:/Tea/}).click();await expect(page.getByRole('status')).toContainText('vote was saved');
});

test('new template opens a real editor and preserves a failed save',async({page})=>{
 await page.goto('/super-admin/templates/new');await expect(page.getByRole('heading',{name:'New Template',exact:true})).toBeVisible();
 await page.getByLabel('Name',{exact:true}).first().fill('New seasonal template');
 const tools=page.getByRole('button',{name:'Tiles',exact:true});if(await tools.getAttribute('aria-expanded')==='false')await tools.click();
 await page.getByRole('button',{name:'Add Text Block tile',exact:true}).click();
 await page.evaluate(()=>window.__hig.failSave=true);await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.getByRole('alert').filter({ hasText: /\S/ }).filter({hasText:'Could not save the template'})).toBeVisible();
 await expect(page.getByLabel('Name',{exact:true}).first()).toHaveValue('New seasonal template');
 await expect(page.getByRole('heading',{name:'New Template',exact:true})).toBeVisible();
});
