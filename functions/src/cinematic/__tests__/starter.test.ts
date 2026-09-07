import { createRestaurantStarter } from '../starter';
import { preflightCinematicImport } from '../importPolicy';
import { defaultStarter } from '../templates';
import type { firestore } from 'firebase-admin';

type Document = Record<string, unknown>;
const mockDocuments = new Map<string, Document>();
let mockCounter = 0, mockRejectCommit = false;
const mockRef = (path: string): { path: string; id: string; collection: (name: string) => ReturnType<typeof mockCollection>; get: () => Promise<ReturnType<typeof mockSnapshot>> } => ({ path, id: path.split('/').pop()!, collection: name => mockCollection(`${path}/${name}`), get: async () => mockSnapshot(path) });
const mockCollection = (path: string) => ({ doc: (id = `auto-${++mockCounter}`) => mockRef(`${path}/${id}`), where: (_key: string, _op: string, org: string) => ({limit: () => ({query: path, org})}) });
const mockSnapshot = (path: string) => ({exists: mockDocuments.has(path), data: () => mockDocuments.get(path)});
const mockDb = {doc: mockRef, collection: mockCollection, runTransaction: async (fn: (transaction: unknown) => Promise<unknown>) => {
  const writes: {ref: ReturnType<typeof mockRef>; data: Document; update?: boolean}[] = [];
  const result = await fn({get: async (ref: {path?: string;query?: string;org?: string}) => ref.query ? {empty: ![...mockDocuments].some(([path,data])=>path.startsWith(ref.query+'/')&&data.orgId===ref.org)} : mockSnapshot(ref.path!),
    create: (ref: ReturnType<typeof mockRef>,data: Document)=>writes.push({ref,data}), update:(ref: ReturnType<typeof mockRef>,data: Document)=>writes.push({ref,data,update:true})});
  if(mockRejectCommit) throw new Error('transaction unavailable');
  for(const w of writes) mockDocuments.set(w.ref.path,w.update?{...mockDocuments.get(w.ref.path),...w.data}:w.data);
  return result;
}};
jest.mock('firebase-admin',()=>({firestore:Object.assign(()=>mockDb,{Timestamp:{now:()=>123456}})}));
jest.mock('firebase-functions/v1/https',()=>({onCall:(handler:unknown)=>handler,HttpsError:class extends Error {constructor(public code:string,message:string){super(message);}}}));
const call = createRestaurantStarter as unknown as (data: unknown, context: unknown) => Promise<{slideId:string;screenId?:string}>;
const context = {auth:{uid:'owner',token:{firebase:{sign_in_provider:'password'}}}};
const request = () => ({orgId:'org',requestId:'request-12345678',createScreen:false,input:defaultStarter()});
beforeEach(()=>{mockDocuments.clear();mockCounter=0;mockRejectCommit=false;mockDocuments.set('organizations/org',{name:'Fixture',ownerId:'owner',plan:'Growth',screenCount:0});});
test('signed-in owner creates an editable slide; response-loss retry returns the same result',async()=>{
  const body=request(),one=await call(body,context),count=mockDocuments.size,two=await call(body,context);
  expect(one).toEqual(two);expect(mockDocuments.size).toBe(count);
  expect(mockDocuments.get(`slides/${one.slideId}`)?.restaurantTemplate).toEqual({id:'coffee-house',version:1});
});
test('changed input cannot reuse a successful request ID',async()=>{const body=request();await call(body,context);body.input.headline='Changed';await expect(call(body,context)).rejects.toMatchObject({code:'already-exists'});});
test('anonymous and foreign users cannot create content',async()=>{
  await expect(call(request(),{})).rejects.toMatchObject({code:'unauthenticated'});
  await expect(call(request(),{auth:{uid:'owner',token:{firebase:{sign_in_provider:'anonymous'}}}})).rejects.toMatchObject({code:'unauthenticated'});
  await expect(call(request(),{auth:{uid:'foreign',token:{}}})).rejects.toMatchObject({code:'permission-denied'});expect(mockDocuments.size).toBe(1);
});
test('deactivated membership is rejected even on a paid organization',async()=>{mockDocuments.set('organizations/org/members/member',{status:'deactivated',role:'orgAdmin'});await expect(call(request(),{auth:{uid:'member',token:{}}})).rejects.toMatchObject({code:'permission-denied'});});
test('server plan wins over forged request plan and rejects paid motion without writes',async()=>{
  mockDocuments.get('organizations/org')!.plan='Basic';const body={...request(),plan:'Enterprise'};body.input.presetId='warm-steam';
  await expect(call(body,context)).rejects.toMatchObject({code:'failed-precondition'});expect(mockDocuments.size).toBe(1);
});
test('signature template also requires entitlement when static',async()=>{mockDocuments.get('organizations/org')!.plan='Free';const body=request();body.input=defaultStarter('chefs-table');await expect(call(body,context)).rejects.toMatchObject({code:'failed-precondition'});});
test('first screen creates one inactive screen, location, slide and receipt atomically',async()=>{
  const result=await call({...request(),createScreen:true},context);expect(result.screenId).toBeTruthy();
  expect(mockDocuments.get(`screens/${result.screenId}`)?.isActive).toBe(false);expect(mockDocuments.get('organizations/org')?.screenCount).toBe(1);
  expect([...mockDocuments.keys()].filter(path=>path.startsWith('screens/'))).toHaveLength(1);
});
test('existing screens are never overwritten',async()=>{mockDocuments.set('screens/existing',{orgId:'org'});await expect(call({...request(),createScreen:true},context)).rejects.toMatchObject({code:'failed-precondition'});expect(mockDocuments.size).toBe(2);});
test('non-admin content role can make a slide, not bootstrap a screen',async()=>{mockDocuments.set('organizations/org/members/member',{status:'active',role:'user'});await expect(call({...request(),createScreen:true},{auth:{uid:'member',token:{}}})).rejects.toMatchObject({code:'permission-denied'});await expect(call(request(),{auth:{uid:'member',token:{}}})).resolves.toHaveProperty('slideId');});
test('a failed transaction leaves no content or success receipt',async()=>{mockRejectCommit=true;await expect(call({...request(),createScreen:true},context)).rejects.toThrow('transaction unavailable');expect(mockDocuments.size).toBe(1);});
test('invalid content is rejected before database writes',async()=>{await expect(call({...request(),input:{}},context)).rejects.toMatchObject({code:'invalid-argument'});expect(mockDocuments.size).toBe(1);});
test('template import rejects nested motion before any asset/content writes',async()=>{
  mockDocuments.set('templates/child',{type:'slide',isPublic:true,content:{particleConfig:{effectType:'snow'}}});
  await expect(preflightCinematicImport(mockDb as unknown as firestore.Firestore,{type:'screen',isPublic:true,content:{livePlaylist:['child']}},'owner','org','Basic')).rejects.toMatchObject({code:'failed-precondition'});
});
test('template import does not leak a private nested slide',async()=>{
  mockDocuments.set('templates/child',{type:'slide',isPublic:false,createdBy:'foreign',content:{}});
  await expect(preflightCinematicImport(mockDb as unknown as firestore.Firestore,{type:'screen',isPublic:true,content:{livePlaylist:['child']}},'owner','org','Growth')).rejects.toMatchObject({code:'permission-denied'});
});
test('allowed importer uses validated snapshots and accepts static starter slides',async()=>{
  mockDocuments.set('templates/child',{type:'slide',isPublic:true,content:{particleConfig:{effectType:'none'}}});
  const snapshots=await preflightCinematicImport(mockDb as unknown as firestore.Firestore,{type:'screen',isPublic:true,content:{livePlaylist:[{slideId:'child'}]}},'owner','org','Basic');expect(snapshots.get('child')?.type).toBe('slide');
});
