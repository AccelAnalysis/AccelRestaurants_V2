import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from '../../node_modules/typescript/lib/typescript.js';
const dir = mkdtempSync(join(tmpdir(), 'cinematic-unit-'));
for (const name of ['catalog', 'typography', 'templates']) {
  const source = readFileSync(new URL(`../../functions/src/cinematic/${name}.ts`, import.meta.url), 'utf8');
  writeFileSync(join(dir, name + '.js'), ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
}
const require = createRequire(import.meta.url), c = require(join(dir,'catalog.js')), t = require(join(dir,'templates.js'));
process.on('exit', () => rmSync(dir, {recursive:true,force:true}));
for (const plan of [...c.PLAN_NAMES, null, 'growth', 'unknown', '__proto__']) test(`entitlements: ${plan}`, () => {
  const paid = ['Growth','Enterprise','Franchise'].includes(plan);
  assert.equal(c.entitlements(plan).atmosphere, paid);
  assert.equal(c.entitlements(plan).signatureTemplates, paid);
  assert.doesNotThrow(() => t.assertStarterEntitled(plan,t.defaultStarter()));
  if (paid) assert.doesNotThrow(() => c.assertAtmosphereEntitled(plan,{particleConfig:{effectType:'smoke'}}));
  else assert.throws(() => c.assertAtmosphereEntitled(plan,{particleConfig:{effectType:'smoke'}}));
});
for (const preset of c.ATMOSPHERE_PRESETS) for (const strength of ['subtle','balanced','vivid']) for (const quality of ['eco','standard','high']) test(`preset ${preset.id}/${strength}/${quality}`, () => {
  const config = c.presetConfig(preset.id,strength,quality);
  assert.equal(config.presetVersion,1); assert.equal(config.quality,quality);
  assert.ok(config.density>=0 && config.density<=100); assert.ok(config.color[3]>=0 && config.color[3]<=1);
  assert.deepEqual(config,c.normalizeAtmosphere(config));
  config.color[0]=0;config.emitterPosition.x=0;
  assert.notEqual(c.presetConfig(preset.id,strength,quality).color[0],0);
  assert.equal(c.presetConfig(preset.id,strength,quality).emitterPosition.x,.5);
});
for (const template of t.RESTAURANT_TEMPLATES) for (const orientation of ['landscape','portrait']) for (const count of [1,3,6]) test(`layout ${template.id}/${orientation}/${count}`, () => {
  const input={...t.defaultStarter(template.id),orientation};input.items=input.items.slice(0,count);
  const original=JSON.stringify(input), slide=t.buildRestaurantSlide(input,'org','instance-a'), copy=t.buildRestaurantSlide(input,'org','instance-b');
  assert.equal(original,JSON.stringify(input));assert.equal(slide.restaurantTemplate.version,1);
  assert.equal(slide.elements.filter(el=>el.name.startsWith('Price')).length,count);
  assert.equal(new Set(slide.elements.map(el=>el.id)).size,slide.elements.length);
  for(const el of slide.elements) {
    assert.equal(el.type,'text');assert.ok(el.visible && !el.locked);
    assert.ok(el.position.x>=0 && el.position.y>=0 && el.position.x+el.size.width<=slide.dimensions.width && el.position.y+el.size.height<=slide.dimensions.height,el.name);
    assert.ok(!copy.elements.some(item=>item.id===el.id));
  }
  assert.ok(!JSON.stringify(slide).includes('http'));
});
test('reject malformed setup and out-of-policy presets',()=>{
  for (const input of [null,{}, {...t.defaultStarter(),items:[]},{...t.defaultStarter(),items:Array(7).fill(t.defaultStarter().items[0])},{...t.defaultStarter(),brandName:'<script>'},{...t.defaultStarter(),quality:'extreme'},{...t.defaultStarter(),presetId:'not-real'}]) assert.throws(()=>t.validateStarter(input));
  assert.throws(()=>t.assertStarterEntitled('Basic',t.defaultStarter('chefs-table')));
  assert.throws(()=>t.assertStarterEntitled('Free',{...t.defaultStarter(),presetId:'warm-steam'}));
});
test('malformed and extreme render input is bounded',()=>{
  for (const value of [undefined,null,{}, {effectType:'rain',density:1e99,speed:Infinity,particleSize:NaN,color:[-10,999,Infinity,-1],emitterPosition:{x:99,y:-8}}, {effectType:'__proto__',quality:'__proto__'}, {effectType:'snow',blendMode:{toString:null},quality:{toString:null},strength:{toString:null}}]) {
    const normalized=c.normalizeAtmosphere(value);
    assert.ok(Number.isFinite(normalized.density));assert.ok(normalized.density>=0 && normalized.density<=100);
    assert.ok(normalized.color.every(Number.isFinite));assert.ok(['none','rain','smoke','snow','stars','leaves','hearts'].includes(normalized.effectType));
  }
  for(const quality of ['eco','standard','high']) for(const [width,height,dpr] of [[1920,1080,1],[3840,2160,2],[1080,1920,3],[7680,4320,4],[Infinity,NaN,-1],[0,0,1]]) {
    const size=c.renderSize(width,height,dpr,quality);assert.ok(size.width>=1 && size.height>=1);assert.ok(size.width*size.height<=c.QUALITY_BUDGETS[quality].maxPixels);
  }
});
test('seed replay is deterministic and different seeds differ',()=>{
  const a=c.seededRandom(12),b=c.seededRandom(12),d=c.seededRandom(13);
  const aa=Array.from({length:100},a),bb=Array.from({length:100},b),dd=Array.from({length:100},d);
  assert.deepEqual(aa,bb);assert.notDeepEqual(aa,dd);assert.ok(aa.every(x=>x>=0&&x<1));
});
