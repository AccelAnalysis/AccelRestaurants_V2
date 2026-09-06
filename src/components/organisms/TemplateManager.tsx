import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateService } from '../../services/templateService';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Search,
  Plus,
  Loader2,
  Layout,
  FileText,
  Monitor,
  Globe,
  Lock,
  Edit,
  Copy,
  Trash2
} from 'lucide-react';
import type { Template } from '../../types/schema';
import { THEMES } from '../../data/themeTemplates';

export const TemplateManager = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'slide' | 'menu' | 'screen'>('all');
  const [generatingAll, setGeneratingAll] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  
  const isSuperAdmin = userProfile?.platformRole === 'admin';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all templates (admin view)
      const data = await TemplateService.getTemplates();
      setTemplates(data);
    } catch (err: unknown) {
      console.error('Failed to load templates:', err);
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await TemplateService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...rest } = template;
      await TemplateService.createTemplate({
        ...rest,
        name: `${template.name} (Copy)`,
        isPublic: false, // Default to private on copy
        createdBy: user?.uid || 'unknown'
      });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      alert('Failed to duplicate template');
    }
  };

  const handleGenerateAllThemes = async () => {
    if (!window.confirm('This will create templates for ALL 7 themes. Continue?')) return;
    setGeneratingAll(true);
    try {
      let totalCreated = 0;
      for (const theme of THEMES) {
        try {
          const result = await TemplateService.createThemeTemplates(theme.name);
          totalCreated += result.created;
        } catch (e) {
          console.error(`Failed to create theme ${theme.name}`, e);
        }
      }
      alert(`Process complete! Created ${totalCreated} new templates across all themes.`);
      fetchTemplates();
    } catch (error) {
      console.error('Error generating all themes:', error);
      alert('Error generating all themes');
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleGenerateThemeTemplates = async () => {
    if (!selectedTheme) return;
    setGeneratingTheme(true);
    try {
      const result = await TemplateService.createThemeTemplates(selectedTheme);
      alert(`Created ${result.created} new templates for theme "${selectedTheme}".`);
      fetchTemplates();
      setSelectedTheme(null); // Reset selection after generation
    } catch (error) {
      console.error('Error generating theme templates:', error);
      alert('Error generating theme templates');
    } finally {
      setGeneratingTheme(false);
    }
  };

  const handleTogglePublic = async (template: Template) => {
    try {
      await TemplateService.updateTemplatePublic(template.id, !template.isPublic);
      setTemplates(templates.map(t => 
        t.id === template.id ? { ...t, isPublic: !template.isPublic } : t
      ));
    } catch (error) {
      console.error('Failed to update template visibility:', error);
      alert('Failed to update template visibility');
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesPublic = showPublicOnly ? t.isPublic : true;
    return matchesSearch && matchesType && matchesPublic;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'slide': return <Layout size={18} />;
      case 'menu': return <FileText size={18} />;
      case 'screen': return <Monitor size={18} />;
      default: return <Layout size={18} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2 text-text focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'slide' | 'menu' | 'screen')}
            className="bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-text focus:border-primary focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="slide">Slides</option>
            <option value="menu">Menus</option>
            <option value="screen">Screens</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text">
            <input
              type="checkbox"
              checked={showPublicOnly}
              onChange={(e) => setShowPublicOnly(e.target.checked)}
              className="w-4 h-4 rounded border-surface-highlight bg-background text-primary focus:ring-primary"
            />
            Public Only
          </label>
        </div>
        <div className="flex items-center gap-2">
          {/* Debug Info */}
          <div className="text-xs text-text-muted text-right mr-2 hidden xl:block">
            <div>UID: {user?.uid.slice(0, 8)}...</div>
            <div>Role: {userProfile?.platformRole || 'none'}</div>
          </div>

          <select
            value={selectedTheme || ''}
            onChange={(e) => setSelectedTheme(e.target.value || null)}
            className="bg-surface border border-surface-highlight rounded-lg px-3 py-2 text-text focus:border-primary focus:outline-none"
          >
            <option value="">Select Theme</option>
            {THEMES.map(theme => (
              <option key={theme.name} value={theme.name}>{theme.name}</option>
            ))}
          </select>
          {isSuperAdmin && (
            <>
              <button
                onClick={handleGenerateThemeTemplates}
                disabled={generatingTheme || !selectedTheme}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {generatingTheme ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Generate Theme
              </button>
              <button
                onClick={handleGenerateAllThemes}
                disabled={generatingAll}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {generatingAll ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Generate All 7 Themes
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/super-admin/templates/new')}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Create Template
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center justify-between">
          <span>Error: {error}</span>
          <button onClick={fetchTemplates} className="text-sm underline hover:text-red-400">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-surface border border-surface-highlight rounded-lg">
          <Layout size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text">No templates found</h3>
          <p className="text-text-muted">Get started by creating your first template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-surface border border-surface-highlight rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-surface-highlight/10 relative overflow-hidden group-hover:bg-surface-highlight/20 transition-colors">
                {template.thumbnailUrl ? (
                  <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    {getIconForType(template.type)}
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {template.isPublic ? (
                    <span className="bg-success/20 text-success text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <Globe size={10} /> Public
                    </span>
                  ) : (
                    <span className="bg-surface-highlight/80 text-text-muted text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <Lock size={10} /> Private
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {isSuperAdmin && (
                    <>
                      <button 
                        onClick={() => handleTogglePublic(template)}
                        className={`p-2 rounded-full transition-colors ${
                          template.isPublic 
                            ? 'bg-white text-black hover:bg-yellow-500 hover:text-white' 
                            : 'bg-white text-black hover:bg-green-500 hover:text-white'
                        }`}
                        title={template.isPublic ? "Make Private" : "Make Public"}
                      >
                        {template.isPublic ? <Lock size={16} /> : <Globe size={16} />}
                      </button>
                      <button 
                        onClick={() => navigate(`/super-admin/templates/${template.id}`)}
                        className="p-2 bg-white text-black rounded-full hover:bg-primary hover:text-white transition-colors"
                        title="Edit Template"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDuplicate(template)}
                        className="p-2 bg-white text-black rounded-full hover:bg-primary hover:text-white transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(template.id)}
                        className="p-2 bg-white text-black rounded-full hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`p-1.5 rounded-md ${
                    template.type === 'slide' ? 'bg-blue-500/10 text-blue-500' :
                    template.type === 'menu' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-purple-500/10 text-purple-500'
                  }`}>
                    {getIconForType(template.type)}
                  </span>
                  <span className="text-xs text-text-muted font-medium uppercase tracking-wider">{template.category}</span>
                </div>
                <h3 className="font-bold text-text truncate mb-1">{template.name}</h3>
                <p className="text-sm text-text-muted line-clamp-2 h-10 mb-3">{template.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {template.tags.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs bg-surface-highlight px-2 py-0.5 rounded text-text-muted">
                      #{tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-xs text-text-muted">+{template.tags.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
