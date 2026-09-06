import { useState, useEffect } from 'react';
import { TemplateService } from '../../services/templateService';
import type { Template } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { X, Search, Layout, FileText, Monitor, Loader2, Download } from 'lucide-react';

interface TemplateSelectorModalProps {
  type: 'slide' | 'menu' | 'screen';
  onClose: () => void;
  onImport: (newResourceId: string) => void;
}

export const TemplateSelectorModal = ({ type, onClose, onImport }: TemplateSelectorModalProps) => {
  const { organization } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Fetch public templates
        const publicTemplates = await TemplateService.getTemplates({ isPublic: true });
        
        // Filter by type locally since our service currently supports one filter object
        // Optimize: Update service to support composite filters if needed
        const filtered = publicTemplates.filter(t => t.type === type);
        setTemplates(filtered);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [type]);

  const handleSelect = async (template: Template) => {
    if (!organization || importing) return;
    
    try {
      setImporting(template.id);
      const result = await TemplateService.importTemplate(template.id, organization.id);
      if (result.success) {
        onImport(result.resourceId);
      } else {
        throw new Error('Import returned unsuccessful');
      }
    } catch (err) {
      console.error('Failed to import template:', err);
      alert('Failed to import template. Please try again.');
      setImporting(null);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getIcon = () => {
    switch (type) {
      case 'slide': return <Layout size={24} className="text-primary" />;
      case 'menu': return <FileText size={24} className="text-primary" />;
      case 'screen': return <Monitor size={24} className="text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border border-surface-highlight rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-highlight flex justify-between items-center bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Select a {type.charAt(0).toUpperCase() + type.slice(1)} Template</h2>
              <p className="text-sm text-text-muted">Choose a template to start with or create from scratch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-highlight rounded-lg text-text-muted hover:text-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-surface-highlight bg-surface/50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder={`Search ${type} templates...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-surface-highlight rounded-lg pl-10 pr-4 py-2 text-text focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <Loader2 size={32} className="animate-spin mb-2" />
              <p>Loading templates...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>{error}</p>
              <button onClick={onClose} className="mt-4 text-sm underline">Close</button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted border-2 border-dashed border-surface-highlight rounded-lg">
              <p className="mb-2">No templates found matching your search.</p>
              {searchTerm && <button onClick={() => setSearchTerm('')} className="text-primary hover:underline">Clear Search</button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Blank Option */}
              <div 
                onClick={() => onClose()} // Close simply returns control to parent to create new default
                className="bg-surface border-2 border-dashed border-surface-highlight hover:border-primary/50 rounded-xl overflow-hidden cursor-pointer group transition-all h-full flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="p-4 bg-surface-highlight/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Layout size={32} className="text-text-muted group-hover:text-primary" />
                </div>
                <h3 className="font-bold text-text group-hover:text-primary transition-colors">Start from Scratch</h3>
                <p className="text-sm text-text-muted text-center px-4">Create a blank {type}</p>
              </div>

              {/* Templates */}
              {filteredTemplates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={`bg-surface border border-surface-highlight rounded-xl overflow-hidden cursor-pointer group hover:shadow-lg hover:border-primary/50 transition-all relative ${importing === template.id ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  <div className="aspect-video bg-surface-highlight/10 relative overflow-hidden">
                    {template.thumbnailUrl ? (
                      <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        {getIcon()}
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Download size={18} />
                        Use Template
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-text line-clamp-1 group-hover:text-primary transition-colors">{template.name}</h3>
                      <span className="text-xs bg-surface-highlight px-2 py-0.5 rounded text-text-muted uppercase tracking-wider">{template.category}</span>
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2 h-10">{template.description}</p>
                  </div>
                  
                  {importing === template.id && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <div className="flex flex-col items-center text-white">
                        <Loader2 size={32} className="animate-spin mb-2" />
                        <span className="text-sm font-medium">Importing...</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
