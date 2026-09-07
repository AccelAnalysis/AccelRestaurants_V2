import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-cinematic',firestore:{host:'127.0.0.1',port:8092,rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{await env.clearFirestore();await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  await setDoc(doc(db,'organizations/org'),{ownerId:'owner',members:['owner'],plan:'Basic',screenCount:0});
  await setDoc(doc(db,'users/owner'),{platformRole:'user',displayName:'Owner'});
});});
const user=()=>env.authenticatedContext('owner').firestore();
const slide=(effect='none')=>({orgId:'org',name:'Fixture menu',elements:[],particleConfig:{effectType:effect,density:20}});
test('Basic may create static content, not motion via direct SDK writes',async()=>{
  await assertSucceeds(setDoc(doc(user(),'slides/static'),slide()));
  await assertFails(setDoc(doc(user(),'slides/motion'),slide('snow')));
});
test('Growth may create and adjust motion; anonymous clients may not',async()=>{
  await env.withSecurityRulesDisabled(context=>updateDoc(doc(context.firestore(),'organizations/org'),{plan:'Growth'}));
  await assertSucceeds(setDoc(doc(user(),'slides/paid'),slide('snow')));
  await assertSucceeds(updateDoc(doc(user(),'slides/paid'),{'particleConfig.density':32}));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'slides/anonymous'),slide('snow')));
});
test('downgrade retains existing price-edit path, denies added/changed motion, allows removal',async()=>{
  await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'slides/old'),slide('smoke')));
  await assertSucceeds(updateDoc(doc(user(),'slides/old'),{name:'Updated menu price'}));
  await assertFails(updateDoc(doc(user(),'slides/old'),{'particleConfig.density':99}));
  await assertSucceeds(updateDoc(doc(user(),'slides/old'),{particleConfig:{effectType:'none'}}));
  await assertFails(updateDoc(doc(user(),'slides/old'),{particleConfig:{effectType:'stars'}}));
});
test('org admin cannot change, add or remove protected plan/override fields',async()=>{
  await assertFails(updateDoc(doc(user(),'organizations/org'),{plan:'Enterprise'}));
  await assertFails(updateDoc(doc(user(),'organizations/org'),{plan:deleteField()}));
  await assertFails(updateDoc(doc(user(),'organizations/org'),{customLimits:{screens:999}}));
  await assertFails(updateDoc(doc(user(),'organizations/org'),{screenCount:1,tileAccess:{override:true}}));
  await assertSucceeds(updateDoc(doc(user(),'organizations/org'),{name:'New restaurant name'}));
});
test('public access mirror and idempotency receipts cannot be client-written',async()=>{
  await assertFails(setDoc(doc(user(),'public_organizations/org'),{plan:'Growth'}));
  await assertFails(setDoc(doc(user(),'organizations/org/cinematic_starts/fake'),{result:{success:true}}));
});
test('missing platform role cannot be added through a profile update',async()=>{
  await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'users/owner'),{displayName:'Legacy owner'}));
  await assertFails(updateDoc(doc(user(),'users/owner'),{platformRole:'admin'}));
});
test('unknown plan fails closed; foreign organization slide cannot be edited',async()=>{
  await env.withSecurityRulesDisabled(async context=>{
    await updateDoc(doc(context.firestore(),'organizations/org'),{plan:'unrecognized'});
    await setDoc(doc(context.firestore(),'slides/foreign'),{...slide('smoke'),orgId:'other'});
  });
  await assertFails(setDoc(doc(user(),'slides/unknown'),slide('snow')));
  await assertFails(updateDoc(doc(user(),'slides/foreign'),{orgId:'org',name:'Stolen'}));
});
