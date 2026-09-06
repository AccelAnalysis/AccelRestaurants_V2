import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TemplateService } from '../../services/templateService';
import type { Template, Slide, Menu, AppScreen } from '../../types/schema';
import { ArrowLeft } from 'lucide-react';
import { SlideEditor } from './SlideEditor';
import { MenuEditor } from './MenuEditor';
import { ScreenEditor } from './ScreenEditor';

export const TemplateEditor = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    category: '',
    tags: [],
    isPublic: true,
    type: 'slide'
  });
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (templateId) {
      const fetchTemplate = async () => {
        try {
          const data = await TemplateService.getTemplate(templateId);
          if (data) {
            setTemplate(data);
          }
        } catch (error) {
          console.error('Failed to load template', error);
        } finally {
          setLoading(false);
        }
      };
      fetchTemplate();
    }
  }, [templateId]);

  const handleSave = async (content: Slide | Menu | AppScreen) => {
    setSaving(true);
    try {
      const templateData = {
        ...template,
        content: content as unknown as Record<string, unknown>
      };

      if (templateId) {
        await TemplateService.updateTemplate(templateId, templateData);
      } else {
        await TemplateService.createTemplate({
          ...templateData,
          version: 1,
          createdBy: 'system' // Should be current user
        } as Omit<Template, 'id' | 'createdAt' | 'updatedAt'>);
      }
      navigate('/super-admin/templates');
    } catch (error) {
      console.error('Failed to save template', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-8 h-screen flex flex-col">
      <div className="flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate('/super-admin/templates')} className="p-2 hover:bg-surface-highlight rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{templateId ? 'Edit Template' : 'New Template'}</h1>
        {saving && <span className="text-sm text-text-muted">Saving...</span>}
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Sidebar Settings */}
        <div className="col-span-3 space-y-4 overflow-y-auto">
          <div className="bg-surface border border-surface-highlight p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={template.name}
                onChange={e => setTemplate({ ...template, name: e.target.value })}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
                placeholder="Template Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={template.type}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={e => setTemplate({ ...template, type: e.target.value as any })}
                disabled={!!templateId}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
              >
                <option value="slide">Slide</option>
                <option value="menu">Menu</option>
                <option value="screen">Screen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                value={template.category}
                onChange={e => setTemplate({ ...template, category: e.target.value })}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
                placeholder="e.g. Holidays, Menu Board"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={template.description}
                onChange={e => setTemplate({ ...template, description: e.target.value })}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={template.isPublic}
                onChange={e => setTemplate({ ...template, isPublic: e.target.checked })}
                id="isPublic"
                className="rounded border-surface-highlight"
              />
              <label htmlFor="isPublic" className="text-sm">Public Template</label>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="col-span-9 h-full border border-surface-highlight rounded-lg overflow-hidden relative bg-black/90">
          {template.type === 'slide' && (
            <SlideEditor 
              initialData={template.content as unknown as Slide} 
              onSave={handleSave} 
              isTemplateMode={true} 
            />
          )}
          {template.type === 'menu' && (
            <MenuEditor 
              initialData={template.content as unknown as Menu} 
              onSave={handleSave} 
              isTemplateMode={true} 
            />
          )}
          {template.type === 'screen' && (
            <ScreenEditor 
              initialData={template.content as unknown as AppScreen} 
              onSave={handleSave} 
              isTemplateMode={true} 
            />
          )}
        </div>
      </div>
    </div>
  );
};
