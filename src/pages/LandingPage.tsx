import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../store/useConfigStore';
import { 
  Monitor, 
  LayoutTemplate, 
  Zap, 
  Users, 
  BarChart3, 
  CheckCircle2, 
  Play, 
  ArrowRight,
  Clock,
  Utensils,
  Loader2
} from 'lucide-react';
import type { Template } from '../types/schema';
import logo from '../assets/logo.png';
import { TemplateService } from '../services/templateService';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { generalConfig, fetchConfigs } = useConfigStore();
  const [email, setEmail] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [videoErrored, setVideoErrored] = useState(false);
  // const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    setVideoErrored(false);
  }, [generalConfig?.landingPageVideoUrl]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const fetchedTemplates = await TemplateService.getTemplates({ isPublic: true });
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error('Error fetching templates:', error);
        // Keep fallback templates in case of error
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleStartFree = () => {
    // In the future, we can pass the email to the registration flow
    navigate('/onboarding', { state: { email } });
  };

  const handleSeePricing = () => {
    navigate('/pricing');
  };

  const handleTemplateClick = (template?: Template) => {
    navigate('/onboarding', { 
      state: { 
        email,
        selectedTemplate: template 
      } 
    });
  };

  return (
    <div
      className="min-h-screen bg-transparent text-text font-sans selection:bg-primary selection:text-white overflow-x-hidden bg-speed-pattern"
      style={
        {
          ['--primary-color' as string]: generalConfig?.primaryBrandColor || '#EA580C',
          ['--primary-color-hover' as string]: generalConfig?.primaryBrandColor || '#DC2626', // Fallback/Match for now
        } as React.CSSProperties
      }
    >
      {/* Navigation */}
      <nav className="fixed w-full z-50 glass border-b-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src={generalConfig?.logoUrl || logo} alt="AccelRestaurants" className="h-8 w-auto object-contain" />
              <span className="text-2xl font-bold tracking-tight text-[var(--primary-color)]">AccelRestaurants</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium hover:text-primary transition-colors">Features</button>
              <button onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium hover:text-primary transition-colors">Templates</button>
              {generalConfig?.featureFlags?.showPricingPage !== false && (
                <button onClick={handleSeePricing} className="text-sm font-medium hover:text-primary transition-colors">Pricing</button>
              )}
              <button onClick={() => navigate('/login')} className="text-sm font-medium hover:text-primary transition-colors">Log In</button>
              {generalConfig?.featureFlags?.publicSignupEnabled !== false && (
                <button 
                  onClick={handleStartFree}
                  className="bg-[var(--primary-color)] hover:opacity-90 text-white text-sm font-bold py-2 px-4 rounded-full transition-all transform hover:scale-105"
                >
                  Start Free
                </button>
              )}
            </div>
            <div className="md:hidden">
              <button onClick={() => navigate('/login')} className="text-sm font-bold text-[var(--primary-color)]">Log In</button>
            </div>
          </div>
        </div>
      </nav>

      {generalConfig?.maintenanceMode && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-warning/20 border-b border-warning/30 text-warning text-sm text-center py-2 px-4">
          Site under maintenance
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                {generalConfig?.landingPageTitle || 'Design and deploy restaurant screens in minutes.'}
              </h1>
              <p className="text-xl text-text-muted max-w-2xl mx-auto lg:mx-0">
                {generalConfig?.landingPageDescription || 'Menus, promos, and multi-location boards—managed from one dashboard. No dedicated hardware required.'}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <div className="relative w-full sm:w-auto">
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full sm:w-64 glass rounded-full py-3 px-5 text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                {generalConfig?.featureFlags?.publicSignupEnabled !== false && (
                  <button 
                    onClick={handleStartFree}
                    className="w-full sm:w-auto bg-[var(--primary-color)] hover:opacity-90 text-white text-lg font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    Start Free <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-text-muted pt-4">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> Free 14-day trial</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> 5-minute setup</span>
              </div>
            </div>

            {/* Hero Visual/Demo Placeholder */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative glass-panel overflow-hidden aspect-video flex items-center justify-center group-hover:scale-[1.01] transition-transform duration-500">
                {generalConfig?.landingPageVideoUrl && !videoErrored ? (
                  <video 
                    src={generalConfig.landingPageVideoUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    onError={() => setVideoErrored(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full p-4 hover:bg-white/20 transition-all">
                        <Play className="w-8 h-8 fill-white" />
                      </button>
                    </div>
                    {/* Mock UI */}
                    <div className="w-full h-full bg-surface/50 relative p-4 flex flex-col gap-2">
                      <div className="h-8 bg-surface-highlight rounded w-1/3 mb-4"></div>
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div className="col-span-2 bg-background rounded-lg border border-surface-highlight p-4 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 to-transparent"></div>
                          <div className="h-4 bg-surface-highlight rounded w-1/2 mb-2"></div>
                          <div className="h-4 bg-surface-highlight rounded w-3/4 mb-4"></div>
                          <div className="space-y-2">
                            <div className="h-2 bg-surface-highlight rounded w-full"></div>
                            <div className="h-2 bg-surface-highlight rounded w-full"></div>
                            <div className="h-2 bg-surface-highlight rounded w-2/3"></div>
                          </div>
                        </div>
                        <div className="col-span-1 space-y-2">
                          <div className="bg-surface-highlight/50 h-20 rounded-lg"></div>
                          <div className="bg-surface-highlight/50 h-20 rounded-lg"></div>
                          <div className="bg-surface-highlight/50 h-20 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute -bottom-6 -right-6 bg-surface border border-surface-highlight p-4 rounded-lg shadow-xl hidden md:block animate-bounce-slow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text">Deployed</div>
                    <div className="text-xs text-text-muted">Just now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section id="features" className="py-20 glass bg-surface/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for modern restaurants</h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">Everything you need to manage digital signage across one or one hundred locations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Monitor className="w-8 h-8 text-primary" />}
              title="Publish instantly"
              description="No USB drives or manual updates. Push changes to all your screens in seconds from the cloud."
            />
            <FeatureCard 
              icon={<LayoutTemplate className="w-8 h-8 text-purple-500" />}
              title="Restaurant Templates"
              description="Professionally designed templates for menu boards, happy hours, and promos ready to customize."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Team & Roles"
              description="Invite your team, assign roles, and manage access levels for different locations or franchises."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8 text-success" />}
              title="Advanced Tiles"
              description="Go beyond images. Add videos, live social feeds, charts, and weather widgets to engage customers."
            />
            <FeatureCard 
              icon={<Clock className="w-8 h-8 text-warning" />}
              title="Dayparting"
              description="Schedule menus to change automatically. Breakfast, Lunch, and Dinner switch without you lifting a finger."
            />
            <FeatureCard 
              icon={<Utensils className="w-8 h-8 text-pink-500" />}
              title="Multi-Location"
              description="Manage multiple brands or locations from a single master dashboard with powerful grouping tools."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-text-muted text-lg">Three simple steps to your first digital menu board.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-surface-highlight via-primary to-surface-highlight opacity-30"></div>

            <StepCard 
              number="1"
              title="Pick a template"
              description="Choose from our library of optimized restaurant templates or start from scratch."
            />
            <StepCard 
              number="2"
              title="Customize"
              description="Add your items, prices, photos, and branding using our drag-and-drop editor."
            />
            <StepCard 
              number="3"
              title="Deploy"
              description="Pair your screen with a simple code and watch it go live instantly."
            />
          </div>
        </div>
      </section>

      {/* Template Gallery Section */}
      <section id="templates" className="py-20 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Start with a template</h2>
              <p className="text-text-muted text-lg">Don't start from a blank screen. Our designers have done the heavy lifting.</p>
            </div>
            <button className="text-primary hover:text-primary-hover font-bold flex items-center gap-2 group">
              View all templates <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.length > 0 ? (
                templates.map(template => (
                  <TemplateCard 
                    key={template.id}
                    category={template.category}
                    title={template.name}
                    color={template.thumbnailUrl || 'bg-gray-500'}
                    onClick={() => handleTemplateClick(template)} 
                  />
                ))
              ) : (
                // Fallback static templates if fetch fails or returns empty (for demo/dev)
                <>
                  <TemplateCard category="Menu Board" title="Classic Burger Joint" color="bg-orange-900/40" onClick={() => handleTemplateClick()} />
                  <TemplateCard category="Happy Hour" title="Cocktail Lounge" color="bg-purple-900/40" onClick={() => handleTemplateClick()} />
                  <TemplateCard category="Breakfast" title="Morning Cafe" color="bg-blue-900/40" onClick={() => handleTemplateClick()} />
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Strip */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to upgrade your screens?</h2>
          <p className="text-xl text-text-muted mb-10">
            Join the restaurants engaging customers with AccelRestaurants.
          </p>
          {generalConfig?.featureFlags?.publicSignupEnabled !== false && (
            <button 
              onClick={handleStartFree}
              className="bg-primary hover:bg-primary-hover text-white text-xl font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-xl shadow-primary/20"
            >
              Start Free in 2 Minutes
            </button>
          )}
          <p className="mt-6 text-sm text-text-muted">Start your 14-day free trial today.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface py-12 border-t border-surface-highlight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={generalConfig?.logoUrl || logo} alt="AccelRestaurants" className="h-6 w-auto object-contain" />
              <span className="text-xl font-bold tracking-tight text-[var(--primary-color)]">AccelRestaurants</span>
            </div>
            <p className="text-text-muted text-sm">
              The modern digital signage platform for restaurants, cafes, and bars.
            </p>
            {(generalConfig?.contactEmail || generalConfig?.contactPhone) && (
              <div className="mt-4 space-y-1 text-sm text-text-muted">
                {generalConfig?.contactEmail && <p>Contact: {generalConfig.contactEmail}</p>}
                {generalConfig?.contactPhone && <p>Phone: {generalConfig.contactPhone}</p>}
              </div>
            )}
            {generalConfig?.socialLinks && generalConfig.socialLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {generalConfig.socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-muted hover:text-[var(--primary-color)] transition-colors"
                  >
                    {link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Templates</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Showcase</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">System Status</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href={generalConfig?.privacyPolicyUrl || "#"} className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href={generalConfig?.termsOfServiceUrl || "#"} className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-surface-highlight/50 text-center text-sm text-text-muted">
          <div className="flex flex-col items-center gap-4">
            {generalConfig?.footerLinks && generalConfig.footerLinks.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {generalConfig.footerLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--primary-color)] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
            <div>
              {generalConfig?.footerCopyrightText || '© 2026 Accel Analysis, LLC. All rights reserved.'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="glass p-6 rounded-xl hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group">
    <div className="mb-4 p-3 bg-surface/50 rounded-lg inline-block group-hover:bg-surface-highlight transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{title}</h3>
    <p className="text-text-muted leading-relaxed">
      {description}
    </p>
  </div>
);

const StepCard = ({ number, title, description }: { number: string, title: string, description: string }) => (
  <div className="glass p-8 rounded-2xl relative z-10 text-center hover:-translate-y-2 transition-transform duration-300">
    <div className="w-12 h-12 bg-primary text-white text-xl font-bold rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
      {number}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-text-muted">
      {description}
    </p>
  </div>
);

const TemplateCard = ({ category, title, color, onClick }: { category: string, title: string, color: string, onClick?: () => void }) => (
  <div className="group cursor-pointer" onClick={onClick}>
    <div className={`aspect-[16/9] ${color} rounded-lg mb-4 border border-surface-highlight overflow-hidden relative`}>
      <div className="absolute inset-0 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
        <LayoutTemplate className="w-12 h-12 text-white/50 group-hover:text-white transition-colors" />
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold transform scale-90 group-hover:scale-100 transition-transform">Preview</span>
      </div>
    </div>
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-bold group-hover:text-primary transition-colors">{title}</h4>
        <span className="text-xs text-text-muted uppercase tracking-wider">{category}</span>
      </div>
    </div>
  </div>
);
