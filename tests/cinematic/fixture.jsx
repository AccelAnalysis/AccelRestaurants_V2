import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RestaurantStarterWizard } from '../../src/components/cinematic/RestaurantStarterWizard';
import { RestaurantSlidePreview } from '../../src/components/cinematic/RestaurantSlidePreview';
import { AtmosphereCanvas } from '../../src/components/atoms/AtmosphereCanvas';
import { ApplicationSurface } from '../../src/components/molecules/ApplicationSurface';
import { WebGLEngine } from '../../src/lib/webgl/WebGLEngine';
import { usePlayerCinematicAccess } from '../../src/hooks/usePlayerCinematicAccess';
import { defaultStarter, buildRestaurantSlide, RESTAURANT_TEMPLATES } from '../../functions/src/cinematic/templates';
import { presetConfig, ATMOSPHERE_PRESETS } from '../../functions/src/cinematic/catalog';
import '../../src/index.css';
const query = new URLSearchParams(window.__cinematicQuery || location.search);
window.__hig = { dbWrites: [], callables: [], pending: [] };
window.__cinematic = { calls: [], saved: [], fail: false, responses: new Map(), renderErrors: [] };
const f = window.__cinematic;
async function createStarter(request) {
  f.calls.push(request);
  const result = f.responses.get(request.requestId) || { success: true, slideId: `created-${f.responses.size + 1}`, ...(request.createScreen ? { screenId: 'first-screen' } : {}) };
  f.responses.set(request.requestId, result);
  // Simulate a response lost AFTER the server committed, not just an early failure.
  if (f.fail) { f.fail = false; throw new Error('Connection lost. Retry safely.'); }
  return result;
}
function EngineFixture() {
  const canvas = useRef(null);
  useEffect(() => {
    try {
      const engine = new WebGLEngine(canvas.current, presetConfig(query.get('preset') || 'window-rain', 'balanced', query.get('quality') || 'eco'));
      f.engine = engine; f.canvas = canvas.current; f.presets = ATMOSPHERE_PRESETS; f.presetConfig = presetConfig; engine.start();
      return () => engine.dispose();
    } catch (error) { f.renderErrors.push(error.message); }
  }, []);
  return <canvas aria-label="Engine verification" ref={canvas} style={{ width: '100vw', height: '90vh' }} />;
}
function Scene() {
  const input = { ...defaultStarter(query.get('template') || 'coffee-house', 'Juniper & Co.'), orientation: query.get('orientation') || 'landscape' };
  if (query.has('long')) {
    input.brandName = 'W'.repeat(32); input.headline = 'W'.repeat(28); input.footer = 'W'.repeat(72);
    input.items = input.items.map(() => ({ name: 'W'.repeat(26), price: '$999999.99', description: 'W'.repeat(44) }));
  }
  input.presetId = query.get('preset') || 'clear';
  return <div style={{ width: query.get('orientation') === 'portrait' ? 'min(90vw,540px)' : '100vw' }}><RestaurantSlidePreview slide={buildRestaurantSlide(input, 'fixture', 'scene')} motion={query.has('motion')} /></div>;
}
function MotionFixture() {
  const [show, setShow] = useState(true), [allowed, setAllowed] = useState(true);
  const access = usePlayerCinematicAccess('fixture-org');
  f.setShow = setShow; f.setAllowed = setAllowed; f.access = access;
  return <div><button onClick={() => { f.clicked = (f.clicked || 0) + 1; }}>Underlying action</button><div style={{ height: 480, width: 800, maxWidth: '100%', position: 'relative' }}>
    {show && <AtmosphereCanvas config={presetConfig(query.get('preset') || 'winter-snow', 'balanced', 'eco')} allowMotion={query.has('mirror') ? access : allowed} />}
  </div></div>;
}
function App() {
  const [show, setShow] = useState(false);
  const mode = query.get('view');
  if (mode === 'engine') return <EngineFixture />;
  if (mode === 'scene') return <Scene />;
  if (mode === 'motion') return <MotionFixture />;
  return <ApplicationSurface><main className="p-6"><h1 className="text-2xl font-semibold mb-4">Restaurant starter studio</h1><button type="button" className="ui-button ui-button-primary" onClick={() => setShow(true)}>Open restaurant setup</button>
    {show && <RestaurantStarterWizard orgId="fixture-org" userId="fixture-user" plan={query.get('plan') || 'Growth'} brandName="Juniper & Co." onClose={() => setShow(false)} createStarter={createStarter} onComplete={result => { f.saved.push(result); setShow(false); }} />}
    <p role="status">{f.saved.length ? 'Created successfully.' : 'No content created.'}</p>
    <p>{RESTAURANT_TEMPLATES.length} restaurant designs</p></main></ApplicationSurface>;
}
createRoot(document.getElementById('root')).render(<MemoryRouter><App /></MemoryRouter>);
