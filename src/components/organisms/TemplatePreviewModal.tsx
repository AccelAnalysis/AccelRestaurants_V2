import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { useNavigate } from 'react-router-dom';
import { Layout, FileText, Monitor, CheckCircle2 } from 'lucide-react';
import type { Template } from '../../types/schema';

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

export const TemplatePreviewModal = ({ template, onClose }: TemplatePreviewModalProps) => {
  const navigate = useNavigate();

  const handleUseTemplate = () => {
    // Navigate to onboarding, potentially passing the template ID to pre-select it after signup
    // For now, we'll just go to onboarding
    navigate('/onboarding', { state: { templateId: template.id } });
  };

  const getIcon = () => {
    switch (template.type) {
      case 'slide': return <Layout size={24} className="text-primary" />;
      case 'menu': return <FileText size={24} className="text-primary" />;
      case 'screen': return <Monitor size={24} className="text-primary" />;
      default: return <Layout size={24} className="text-primary" />;
    }
  };

  return (
    <AccessibleDialog title={template.name} description={`${template.category} · ${template.type} template`} onClose={onClose} wide>
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Preview Image/Area */}
          <div className="flex-1 bg-black/50 p-8 flex items-center justify-center relative min-h-[300px]">
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />
            
            {template.thumbnailUrl ? (
              <img 
                src={template.thumbnailUrl} 
                alt={template.name} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-surface-highlight"
              />
            ) : (
              <div className="text-text-muted flex flex-col items-center gap-2">
                {getIcon()}
                <span>No Preview Available</span>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-80 bg-surface border-l border-surface-highlight p-6 flex flex-col">
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-2">Description</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {template.description || "No description provided."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-2">Features</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-text-muted">
                    <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                    <span>Fully customizable layout</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-text-muted">
                    <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                    <span>Responsive design</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-text-muted">
                    <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />
                    <span>Instant deployment</span>
                  </li>
                </ul>
              </div>

              {template.tags && template.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-surface-highlight rounded text-xs text-text-muted">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-surface-highlight">
              <button 
                onClick={handleUseTemplate}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                Use This Template
              </button>
              <p className="text-xs text-text-muted text-center mt-3">
                Free 14-day trial • No credit card required
              </p>
            </div>
          </div>
        </div>
    </AccessibleDialog>
  );
};
