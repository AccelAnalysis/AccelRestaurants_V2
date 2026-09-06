/* Isolated fixtures exercise the real components; never imported by the production entry. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Timestamp } from 'firebase/firestore';
import { AdminShell } from '../../src/components/organisms/AdminShell';
import { ScreenListView } from '../../src/components/organisms/ScreenListView';
import { ScreenEditor } from '../../src/components/organisms/ScreenEditor';
import { SlideEditor } from '../../src/components/organisms/SlideEditor';
import { LoginPage } from '../../src/pages/LoginPage';
import { AudioScheduleModal } from '../../src/components/organisms/AudioScheduleModal';
import { AtmosphereCanvas } from '../../src/components/atoms/AtmosphereCanvas';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useConfigStore } from '../../src/store/useConfigStore';
import { ScreenService } from '../../src/services/screenService';
import { SlideService } from '../../src/services/slideService';
import { LocationService } from '../../src/services/locationService';
import { TemplateService } from '../../src/services/templateService';
import { PLAN_CONFIGS, ALL_TILES } from '../../src/lib/plans';
import '../../src/index.css';

const stamp = Timestamp.now();
const textTile = { id: 'tile-1', type: 'text', name: 'Lunch heading', position: { x: 80, y: 60 }, size: { width: 260, height: 80 }, visible: true, locked: false, rotation: 0, opacity: 1, zIndex: 1, properties: { content: 'Lunch specials', fontColor: '#ffffff' } };
const slide = { id: 'slide-1', orgId: 'hig-org', name: 'Lunch menu', dimensions: { width: 1280, height: 720 }, orientation: 'landscape', backgroundColor: '#111827', elements: [textTile], createdAt: stamp, updatedAt: stamp };
const secondSlide = { ...slide, id: 'slide-2', name: 'Dinner menu', elements: [] };
const screen = { id: 'screen-1', orgId: 'hig-org', locationId: 'location-1', name: 'Dining room', isActive: true, orientation: 'landscape', rotation: 0, rotationSettings: { algorithm: 'loop', rotationMs: 10000, transition: 'fade' }, livePlaylist: [{ slideId: 'slide-1', duration: 5000 }, { slideId: 'slide-1', duration: 12000 }, { slideId: 'slide-2' }], createdAt: stamp, lastHeartbeatAt: stamp };
window.__hig = { failScreens: false, failTemplates: false, failSave: false, delaySave: false, saves: [], screenSaves: [], deleted: [], imports: 0, pending: [] };
const fixture = window.__hig;
useAuthStore.setState({ loading: false, user: { uid: 'hig-user', email: 'review@example.invalid' }, userProfile: { uid: 'hig-user', email: 'review@example.invalid', orgId: 'hig-org', platformRole: 'user' }, organization: { id: 'hig-org', name: 'Test restaurant', plan: 'Free', ownerId: 'hig-user', members: ['hig-user'], isSetupComplete: true } });
useConfigStore.setState({ loading: false, fetchConfigs: async () => {}, generalConfig: {}, planConfigs: { ...PLAN_CONFIGS, Free: { ...PLAN_CONFIGS.Free, screens: -1, allowedTiles: ALL_TILES } } });
ScreenService.getScreens = async () => { if (fixture.failScreens) throw new Error('fixture network unavailable'); return [screen]; };
ScreenService.getScreen = async () => screen;
ScreenService.deleteScreen = async id => { fixture.deleted.push(id); };
ScreenService.updateScreen = async (id, data) => { fixture.screenSaves.push({ id, data }); };
ScreenService.createScreen = async data => { fixture.screenSaves.push({ data }); return 'new-screen'; };
SlideService.getSlides = async () => [slide, secondSlide];
SlideService.getSlide = async () => ({ ...slide, elements: structuredClone(slide.elements) });
SlideService.updateSlide = async (id, data) => {
  fixture.saves.push(structuredClone(data));
  if (fixture.delaySave) await new Promise(resolve => fixture.pending.push(resolve));
  if (fixture.failSave) throw new Error('fixture save unavailable');
};
LocationService.getLocations = async () => [{ id: 'location-1', name: 'Main restaurant', orgId: 'hig-org', timezone: 'America/New_York' }];
TemplateService.getTemplates = async () => { if (fixture.failTemplates) throw new Error('fixture template failure'); return []; };
TemplateService.importTemplate = async () => { fixture.imports++; return { success: true, resourceId: 'imported' }; };

function ScheduleFixture() {
  const [open, setOpen] = useState(false);
  return <div className="p-6"><h1>Audio schedules</h1><button className="ui-button ui-button-primary" onClick={() => setOpen(true)}>Add schedule</button>{open && <AudioScheduleModal isOpen onClose={() => setOpen(false)} onSave={async () => { throw new Error('fixture save unavailable'); }} />}</div>;
}
function Fixture() {
  return <BrowserRouter><DndProvider backend={HTML5Backend}><div className="app-ui">
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<AdminShell account={<Link to="/login" className="ui-button ui-button-secondary">Sign out</Link>}><Routes>
        <Route path="/admin/screens" element={<ScreenListView />} />
        <Route path="/admin/screens/:screenId" element={<ScreenEditor />} />
        <Route path="/admin/slides/:slideId" element={<SlideEditor />} />
        <Route path="/admin/schedules" element={<ScheduleFixture />} />
        <Route path="/admin/motion" element={<div className="h-48"><h1>Motion preference</h1><AtmosphereCanvas config={{ effectType: 'smoke', density: 50, speed: 1, color: [255,255,255,1], blendMode: 'screen', emitterPosition: {x: .5,y: .5}, vorticity: 5, particleSize: 10 }} /></div>} />
        <Route path="*" element={<div className="p-6"><h1>Workspace</h1><Link to="/admin/screens">Screens</Link></div>} />
      </Routes></AdminShell>} />
    </Routes>
  </div></DndProvider></BrowserRouter>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
