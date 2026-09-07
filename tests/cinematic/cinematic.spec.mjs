import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const templates=['coffee-house','grill-house','fresh-counter','dessert-studio','chefs-table','after-hours'];
async function noClipping(page) {
  const clipped=await page.evaluate(()=>[...document.querySelectorAll('[data-testid="restaurant-tile"]')].flatMap(el=>{
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),b=el.getBoundingClientRect(),bad=[];let node;
    while((node=walker.nextNode())){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();
      if(r.width>b.width+1||r.height>b.height+1||r.bottom>b.bottom+1||r.right>b.right+1||r.top<b.top-1)bad.push(node.textContent);}
    return bad;
  }));
  expect(clipped).toEqual([]);
}
for(const template of templates) for(const orientation of ['landscape','portrait']) test(`readability: ${template}/${orientation}`,async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const long of ['', '&long=1']){
    await page.goto(`/?view=scene&template=${template}&orientation=${orientation}${long}`);
    await expect(page.getByTestId('restaurant-tile').first()).toBeVisible();await noClipping(page);
    if(!long)await page.getByTestId('restaurant-preview').screenshot({path:info.outputPath(`${template}-${orientation}.png`)});
  }
  expect(errors).toEqual([]);
});
test('setup is accessible, cancellable, responsive and draft-resumable',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const open=page.getByRole('button',{name:'Open restaurant setup'});await open.click();
  await expect(page.getByRole('dialog',{name:'Your restaurant, screen-ready'})).toBeVisible();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByLabel('Restaurant name',{exact:true}).fill('Saved brand');
  await page.getByRole('button',{name:'Save for later',exact:true}).click();await expect(open).toBeFocused();
  expect(await page.evaluate(()=>window.__cinematic.calls.length)).toBe(0);
  await open.click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByLabel('Restaurant name',{exact:true})).toHaveValue('Saved brand');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath('guided-setup.png'),fullPage:true});
});
test('Back on the first setup step exits without creating content',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const open=page.getByRole('button',{name:'Open restaurant setup'});await open.click();
  const back=page.getByRole('button',{name:'Back',exact:true});
  await expect(back).toBeEnabled();await back.click();
  await expect(page.getByRole('dialog',{name:'Your restaurant, screen-ready'})).toHaveCount(0);
  expect(await page.evaluate(()=>window.__cinematic.calls.length)).toBe(0);
});
test('Free previews premium choices, then explicitly creates included static content',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?plan=Free');await page.getByRole('button',{name:'Open restaurant setup'}).click();
  await page.getByRole('button',{name:/Chef’s table/}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Create editable slide',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Use an included static design',exact:true}).click();await page.getByRole('button',{name:'Create editable slide',exact:true}).click();
  const call=await page.evaluate(()=>window.__cinematic.calls[0]);expect(call.input.templateId).toBe('coffee-house');expect(call.input.presetId).toBe('clear');expect(call.createScreen).toBe(false);
});
test('lost response retries the same request, not a second creation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'Open restaurant setup'}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.evaluate(()=>window.__cinematic.fail=true);await page.getByRole('button',{name:'Create editable slide',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Connection lost');await page.getByRole('button',{name:'Create editable slide',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const calls=await page.evaluate(()=>window.__cinematic.calls);expect(calls).toHaveLength(2);expect(calls[0].requestId).toBe(calls[1].requestId);
  expect(await page.evaluate(()=>window.__cinematic.responses.size)).toBe(1);
});
test('reduced motion and plan revocation allocate no atmosphere canvas',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?view=motion');await expect(page.locator('canvas')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?view=motion&mirror=1');await expect(page.locator('canvas')).toHaveCount(0);
  await page.evaluate(()=>window.__cinematic.publishPlan('Growth'));await expect(page.locator('canvas')).toHaveCount(1);
  await page.evaluate(()=>window.__cinematic.publishPlan('Basic'));await expect(page.locator('canvas')).toHaveCount(0);
  await page.evaluate(()=>window.__cinematic.publishPlan('Enterprise'));await expect(page.locator('canvas')).toHaveCount(1);
  await page.evaluate(()=>window.__cinematic.mirrorError());await expect(page.locator('canvas')).toHaveCount(0);
});
test('graphics failure leaves ordinary content usable and motion never captures input',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
  await page.goto('/?view=motion');await expect(page.locator('canvas')).toHaveAttribute('data-atmosphere-state','unavailable');
  expect(await page.locator('canvas').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await page.getByRole('button',{name:'Underlying action'}).click();expect(await page.evaluate(()=>window.__cinematic.clicked)).toBe(1);
});
test('all seven presets draw real pixels; context loss recovers; stop/dispose release the loop',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Graphics verification uses the explicit desktop software-WebGL test device.');
  await page.goto('/?view=engine');await expect.poll(()=>page.evaluate(()=>window.__cinematic.engine?.getDiagnostics().frames||0)).toBeGreaterThan(0);
  const results=await page.evaluate(()=>{
    const f=window.__cinematic,gl=f.canvas.getContext('webgl2'),results=[];
    f.engine.stop();
    for(const p of f.presets.filter(p=>p.id!=='clear')){
      f.engine.updateConfig(f.presetConfig(p.id,'balanced','eco'));f.engine.draw(0.04);
      const pixels=new Uint8Array(f.canvas.width*f.canvas.height*4);gl.readPixels(0,0,f.canvas.width,f.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let alpha=0;for(let i=3;i<pixels.length;i+=4)alpha+=pixels[i];results.push({id:p.id,alpha,error:gl.getError(),...f.engine.getDiagnostics()});
    }
    f.engine.start();return results;
  });
  for(const result of results){expect(result.error,result.id).toBe(0);expect(result.alpha,result.id).toBeGreaterThan(0);expect(result.width*result.height).toBeLessThanOrEqual(result.maxPixels);expect(result.particleCount).toBeLessThanOrEqual(result.maxParticles);}
  await page.evaluate(()=>{const f=window.__cinematic;f.extension=f.canvas.getContext('webgl2').getExtension('WEBGL_lose_context');f.extension.loseContext();});
  await expect.poll(()=>page.evaluate(()=>window.__cinematic.engine.getDiagnostics().contextLost)).toBe(true);
  await page.evaluate(()=>window.__cinematic.extension.restoreContext());await expect.poll(()=>page.evaluate(()=>window.__cinematic.engine.getDiagnostics().contextLost)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>window.__cinematic.engine.getDiagnostics().running)).toBe(true);
  await page.evaluate(()=>{window.__cinematic.engine.dispose();window.__cinematic.engine.dispose();});
  expect(await page.evaluate(()=>window.__cinematic.engine.getDiagnostics().running)).toBe(false);
});
