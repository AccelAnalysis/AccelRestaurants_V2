import { DashboardOverview } from '../../src/components/organisms/DashboardOverview';
import { PlayerRegistrationService } from '../../src/services/playerRegistrationService';
import { MenuService } from '../../src/services/menuService';
/* Isolated fixtures exercise the real components; never imported by the production entry. */
import React, { useState } from 'react';
import { LandingPage } from '../../src/pages/LandingPage';
import { FirstScreenGuide } from '../../src/components/journey/FirstScreenGuide';
import { OrganizationView } from '../../src/components/organisms/settings/OrganizationView';
import { OrganizationService } from '../../src/services/organizationService';
import * as journeyHelpers from '../../src/lib/customerJourney';
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
import { SuperAdminDashboard } from '../../src/pages/SuperAdminDashboard';
import { DesignerDashboard } from '../../src/pages/DesignerDashboard';
import { SubscriptionManager } from '../../src/components/organisms/SubscriptionManager';
import { BillingStatusWidget } from '../../src/components/organisms/BillingStatusWidget';
import { DesignerMarketplace } from '../../src/components/organisms/DesignerMarketplace';
import { TemplateEditor } from '../../src/components/organisms/TemplateEditor';
import { GeneralSettingsEditor } from '../../src/components/organisms/GeneralSettingsEditor';
import { JobDetailView } from '../../src/components/organisms/JobDetailView';
import { OnboardingPage } from '../../src/pages/OnboardingPage';
import { PricingPage } from '../../src/pages/PricingPage';
import { JoinPage } from '../../src/pages/JoinPage';
import { TileContent } from '../../src/components/atoms/TileContent';
import { ApplicationSurface } from '../../src/components/molecules/ApplicationSurface';
import { AdminService } from '../../src/services/adminService';
import { DesignerService } from '../../src/services/designerService';
import { JobService } from '../../src/services/jobService';
import { BillingService } from '../../src/services/billingService';
import { ArticleService } from '../../src/services/articleService';
import { ConfigService } from '../../src/services/configService';
import { PollService } from '../../src/services/pollService';
import { FormService } from '../../src/services/formService';
import { WeatherService } from '../../src/services/weatherService';
import { CalendarService } from '../../src/services/calendarService';
import { RssService } from '../../src/services/rssService';
import { StockService } from '../../src/services/stockService';
import { SocialService } from '../../src/services/socialService';
import { StorageService } from '../../src/services/storageService';
import { deriveBrandColors, contrastRatio, normalizeHex } from '../../src/utils/brandColors';
import '../../src/index.css';

const stamp = Timestamp.now();
const textTile = { id: 'tile-1', type: 'text', name: 'Lunch heading', position: { x: 80, y: 60 }, size: { width: 260, height: 80 }, visible: true, locked: false, rotation: 0, opacity: 1, zIndex: 1, properties: { content: 'Lunch specials', fontColor: '#ffffff' } };
const slide = { id: 'slide-1', orgId: 'hig-org', name: 'Lunch menu', dimensions: { width: 1280, height: 720 }, orientation: 'landscape', backgroundColor: '#111827', elements: [textTile], createdAt: stamp, updatedAt: stamp };
const secondSlide = { ...slide, id: 'slide-2', name: 'Dinner menu', elements: [] };
const screen = { id: 'screen-1', orgId: 'hig-org', locationId: 'location-1', name: 'Dining room', isActive: true, orientation: 'landscape', rotation: 0, rotationSettings: { algorithm: 'loop', rotationMs: 10000, transition: 'fade' }, livePlaylist: [{ slideId: 'slide-1', duration: 5000 }, { slideId: 'slide-1', duration: 12000 }, { slideId: 'slide-2' }], createdAt: stamp, lastHeartbeatAt: stamp };
window.__hig = { failScreens: false, failTemplates: false, failSave: false, delaySave: false, saves: [], screenSaves: [], deleted: [], imports: 0, pending: [] };
const fixture = window.__hig;
Object.assign(fixture, { dbWrites: [], callables: [], checkoutCalls: [], portalCalls: [], profileWrites: [], configWrites: [], reviews: [], failDatabase: false, failCallable: false, failPlans: false, failCheckout: true, failProfile: false, failSettings: false, failNotifications: false, failJob: false, votes: 0, failVote: true, formCalls: 0, failForm: true });

useAuthStore.setState({ loading: false, user: { uid: 'hig-user', email: 'review@example.invalid' }, userProfile: { uid: 'hig-user', email: 'review@example.invalid', orgId: 'hig-org', platformRole: 'user' }, organization: { id: 'hig-org', name: 'Test restaurant', plan: 'Free', ownerId: 'hig-user', members: ['hig-user'], isSetupComplete: true } });
useConfigStore.setState({ loading: false, fetchConfigs: async () => {}, generalConfig: {}, planConfigs: { ...PLAN_CONFIGS, Free: { ...PLAN_CONFIGS.Free, screens: -1, allowedTiles: ALL_TILES } } });
fixture.readCounts = { screens: 0, slides: 0, registrations: 0 };
ScreenService.getScreens = async () => { fixture.readCounts.screens++; if (fixture.failScreens) throw new Error('fixture network unavailable'); return [screen]; };
ScreenService.getScreen = async () => screen;
ScreenService.deleteScreen = async id => { fixture.deleted.push(id); };
ScreenService.updateScreen = async (id, data) => { fixture.screenSaves.push({ id, data }); };
ScreenService.createScreen = async data => { fixture.screenSaves.push({ data }); return 'new-screen'; };
SlideService.getSlides = async () => { fixture.readCounts.slides++; if (fixture.failSlides) throw new Error('fixture slide unavailable'); return fixture.noDesigns ? [] : [slide, secondSlide]; };
MenuService.getMenus = async () => { if (fixture.failMenus) throw new Error('fixture menu unavailable'); return [{ id: 'menu-1' }]; };
StorageService.listFiles = async () => { if (fixture.failMedia) throw new Error('fixture media unavailable'); return []; };
PlayerRegistrationService.list = async () => { fixture.readCounts.registrations++; if (fixture.failRegistrations) throw new Error('fixture registration unavailable'); return { registrations: fixture.registered ? [{ screenId: 'screen-1', playerUid: 'fixture-display', assignedAt: Date.now() }] : [] }; };
SlideService.getSlide = async () => ({ ...slide, elements: structuredClone(slide.elements) });
SlideService.updateSlide = async (id, data) => {
  fixture.saves.push(structuredClone(data));
  if (fixture.delaySave) await new Promise(resolve => fixture.pending.push(resolve));
  if (fixture.failSave) throw new Error('fixture save unavailable');
};
LocationService.getLocations = async () => [{ id: 'location-1', name: 'Main restaurant', orgId: 'hig-org', timezone: 'America/New_York' }];
TemplateService.getTemplates = async () => { if (fixture.failTemplates) throw new Error('fixture template failure'); return []; };
TemplateService.importTemplate = async () => { fixture.imports++; return { success: true, resourceId: 'imported' }; };

const params = new URLSearchParams(location.search);
fixture.failMedia = params.has('failMedia'); fixture.registered = params.has('registered');
fixture.failPlans = params.has('failPlans'); fixture.failCallable = params.has('failCallable'); fixture.failNotifications = params.has('failNotifications'); fixture.failProfile = params.has('failProfile');
const organization = { ...useAuthStore.getState().organization, stripeCustomerId: 'cus-test', industry: 'Restaurant', seats: 1, screenCount: 1, createdAt: stamp, subscriptionId: 'sub-test', subscriptionStatus: 'active' };
useAuthStore.setState({ organization, userProfile: { ...useAuthStore.getState().userProfile, platformRole: 'admin' } });
if (location.pathname === '/onboarding') useAuthStore.setState({ user: params.has('new') ? null : useAuthStore.getState().user, organization: { ...organization, industry: params.has('org') ? undefined : 'Restaurant', isSetupComplete: false } });
if (location.pathname === '/onboarding') useAuthStore.setState({ userProfile: { ...useAuthStore.getState().userProfile, platformRole: 'user' } });
if (params.has('newSubscription')) useAuthStore.setState({ organization: { ...organization, subscriptionId: undefined } });
fixture.authenticate = () => useAuthStore.setState({ user: { uid: 'hig-user', email: 'review@example.invalid' }, organization: { ...organization, industry: undefined, isSetupComplete: false } });
fixture.journeyHelpers = journeyHelpers;
fixture.setConfig = value => useConfigStore.setState({ generalConfig: { ...useConfigStore.getState().generalConfig, ...value } });
fixture.screen = screen;
fixture.setOwnerProfile = value => useAuthStore.setState({ organization: { ...useAuthStore.getState().organization, ...value } });
ConfigService.getPlanCatalogue = async () => { if (fixture.failPlans) throw new Error('fixture plan failure'); return { configs: fixture.planCatalogue || PLAN_CONFIGS, source: fixture.planSource || 'live', savedAt: Date.now() }; };
ConfigService.getPlanConfigs = async () => (await ConfigService.getPlanCatalogue()).configs;
BillingService.createPlanCheckout = async (...args) => { fixture.checkoutCalls.push(args); throw new Error('fixture checkout failure'); };
OrganizationService.updateOrganization = async (...args) => { if (fixture.failSave) throw new Error('fixture save failure'); fixture.dbWrites.push(args); };
fixture.colorMath = { deriveBrandColors, contrastRatio, normalizeHex };
fixture.setBrand = value => useConfigStore.setState({ generalConfig: { ...useConfigStore.getState().generalConfig, primaryBrandColor: value } });
const designer = { uid: 'hig-user', displayName: 'Jamie Designer', email: 'review@example.invalid', bio: 'Restaurant menu design', hourlyRate: 55, specialties: ['Menu Design'], status: 'active', rating: 4.8, jobsCompleted: 4, createdAt: stamp, portfolioUrl: 'https://example.invalid/portfolio' };
const job = { id: 'job-1', title: 'Seasonal menu', description: 'A simple menu update.', orgId: 'hig-org', orgName: 'Test restaurant', designerId: 'hig-user', budget: 150, status: 'review', paymentStatus: 'paid', createdAt: stamp, updatedAt: stamp, requiredSkills: ['Menu Design'] };
AdminService.getAllOrganizations = async () => { if (fixture.failDatabase) throw new Error('fixture directory failure'); return [organization]; };
AdminService.getUserProfile = async () => useAuthStore.getState().userProfile;
for (const key of ['updateOrgPlan','updateOrgLimits','updateOrgTileAccess']) AdminService[key] = async (...args) => { if (fixture.failDatabase) throw new Error('fixture unavailable'); fixture.dbWrites.push(args); };
AdminService.getSystemTemplates = async () => { if (fixture.failNotifications) throw new Error('fixture template failure'); return [{ id: 'welcome', name: 'Welcome email', type: 'email', subject: 'Welcome', content: '<p>Hello {{name}}</p>', variables: ['name'] }]; };
AdminService.updateSystemTemplate = async (...args) => { if (fixture.failSave) throw new Error('fixture save failure'); fixture.saves.push(args); };
DesignerService.getAllDesigners = async () => [designer];
DesignerService.getActiveDesigners = async () => [designer];
DesignerService.getDesigner = async () => { if (fixture.failProfile) throw new Error('fixture profile failure'); return designer; };
DesignerService.updateProfile = async (...args) => { if (fixture.failSave) throw new Error('fixture profile save failure'); fixture.profileWrites.push(args); };
DesignerService.getDesignerInvites = async () => [{ id: 'invite-1', name: 'Invited designer', email: 'invited@example.invalid', status: 'pending', createdAt: stamp }];
DesignerService.inviteDesigner = async () => { if (fixture.failSave) throw new Error('fixture invitation failure'); return { id: 'new-invite' }; };
DesignerService.revokeInvite = async () => { fixture.deleted.push('invite-1'); };
JobService.getAvailableJobs = async () => [{ ...job, status: 'open', designerId: null }];
JobService.getDesignerJobs = async () => [job]; JobService.getOrgJobs = async () => [job];
JobService.getJob = async () => { if (fixture.failJob) throw new Error('fixture job failure'); return job; };
JobService.getSubmissions = async () => [{ id: 'submission-1', jobId: job.id, message: 'First draft', fileUrls: [], version: 1, status: 'pending', createdAt: stamp }];
JobService.assignDesigner = async () => { if (fixture.failSave) throw new Error('fixture assignment failure'); };
JobService.reviewSubmission = async (...args) => { if (fixture.failSave) throw new Error('fixture review failure'); fixture.reviews.push(args); };
JobService.submitDesign = async () => { if (fixture.failSave) throw new Error('fixture submit failure'); return 'submission-2'; };
JobService.createJob = async () => { if (fixture.failSave) throw new Error('fixture job failure'); return 'job-2'; };
BillingService.getSubscriptionPlans = async () => { if (fixture.failPlans) throw new Error('fixture plan failure'); return [{ id: 'price-basic', name: 'Basic', price: 19, currency: 'USD', interval: 'month', features: ['Menu boards', 'Reusable slides'] }, { id: 'price-growth', name: 'Growth', price: 49, currency: 'USD', interval: 'month', features: ['More screens'] }]; };
BillingService.createCheckoutSession = async (...args) => { fixture.checkoutCalls.push(args); throw new Error('fixture checkout failure'); };
BillingService.createPortalSession = async (...args) => { fixture.portalCalls.push(args); throw new Error('fixture portal failure'); };
ArticleService.getArticles = async () => [{ id: 'article-1', title: 'Getting started', description: 'First steps', content: 'Welcome to the workspace.', category: 'Getting Started', updatedAt: stamp }];
ArticleService.updateArticle = async () => { if (fixture.failSave) throw new Error('fixture article failure'); }; ArticleService.createArticle = ArticleService.updateArticle;
ArticleService.deleteArticle = async id => { fixture.deleted.push(id); };
ConfigService.saveGeneralConfig = async data => { if (fixture.failSettings) throw new Error('fixture settings failure'); fixture.configWrites.push(data); };
ConfigService.savePlanConfigs = async data => { if (fixture.failSettings) throw new Error('fixture config failure'); fixture.configWrites.push(data); };
TemplateService.getTemplate = async id => ({ id, name: 'Seasonal template', description: '', category: 'Menu', tags: [], type: 'slide', isPublic: true, content: slide });
TemplateService.createTemplate = async data => { if (fixture.failSave) throw new Error('fixture template save failure'); fixture.saves.push(data); return 'new-template'; };
TemplateService.updateTemplate = async () => { if (fixture.failSave) throw new Error('fixture template save failure'); };
StorageService.uploadFile = async () => { if (fixture.failSave) throw new Error('fixture upload failure'); return 'https://example.invalid/file.png'; };
PollService.initializePoll = async () => {};
PollService.subscribeToPoll = (_id, cb) => { cb({ question: 'Choose', options: ['Tea','Coffee'], votes: {}, totalVotes: 0 }); return () => {}; };
PollService.vote = async () => { if (fixture.failVote) throw new Error('fixture vote failure'); fixture.votes++; };
FormService.submitForm = async () => { fixture.formCalls++; if (fixture.failForm) throw new Error('fixture form failure'); return { success: true }; };
WeatherService.getWeather = async () => ({ temp: 72, condition: 'Sunny', high: 78, low: 60, locationName: 'Fixture' });
RssService.getFeed = async () => null;
StockService.getQuote = async () => null;
SocialService.getPosts = async () => [];
CalendarService.getEvents = async () => [];
const specialType = params.get('tile');
if (specialType) SlideService.getSlide = async () => ({ ...slide, elements: [{ ...textTile, type: specialType, name: `${specialType} example`, size: { width: 400, height: 300 }, properties: specialType === 'form' ? { fields: [{ id: 'name', label: 'Name', type: 'text', required: true }] } : {} }] });
function TileFixture({ type }) { return <main className="p-4 max-w-lg"><h1 className="text-2xl mb-4">Interactive {type}</h1><div style={{ height: 500 }}><TileContent tile={{ ...textTile, type, properties: type === 'poll' ? { question: 'Choose a drink', options: ['Tea','Coffee'] } : {} }} /></div></main>; }

function ScheduleFixture() {
  const [open, setOpen] = useState(false);
  return <div className="p-6"><h1>Audio schedules</h1><button className="ui-button ui-button-primary" onClick={() => setOpen(true)}>Add schedule</button>{open && <AudioScheduleModal isOpen onClose={() => setOpen(false)} onSave={async () => { throw new Error('fixture save unavailable'); }} />}</div>;
}
function Fixture() {
  return <BrowserRouter><DndProvider backend={HTML5Backend}><ApplicationSurface>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/restaurants" element={<LandingPage />} />
      <Route path="/marketing" element={<LandingPage />} />
      <Route path="/overview" element={<DashboardOverview />} />
      <Route path="/setup-guide" element={<FirstScreenGuide />} />
      <Route path="/restaurant-settings" element={<OrganizationView />} />
      <Route path="/super-admin/templates/:templateId" element={<TemplateEditor />} />
      <Route path="/super-admin/*" element={<SuperAdminDashboard />} />
      <Route path="/designer/*" element={<DesignerDashboard />} />
      <Route path="/billing" element={<SubscriptionManager />} />
      <Route path="/billing-status" element={<BillingStatusWidget />} />
      <Route path="/marketplace" element={<DesignerMarketplace />} />
      <Route path="/job/:jobId" element={<JobDetailView />} />
      <Route path="/brand" element={<GeneralSettingsEditor />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/form-tile" element={<TileFixture type="form" />} />
      <Route path="/poll-tile" element={<TileFixture type="poll" />} />
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
  </ApplicationSurface></DndProvider></BrowserRouter>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
