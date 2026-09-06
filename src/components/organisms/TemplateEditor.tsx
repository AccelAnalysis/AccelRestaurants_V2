import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../../store/useAuthStore';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useFeedback } from '../../hooks/useFeedback';
import { FeedbackRegion } from '../atoms/FeedbackRegion';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TemplateService } from '../../services/templateService';
import type { Template, Slide, Menu, AppScreen } from '../../types/schema';
import { ArrowLeft } from 'lucide-react';
import { SlideEditor } from './SlideEditor';
import { MenuEditor } from './MenuEditor';
import { ScreenEditor } from './ScreenEditor';

function blankContent(type: 'slide' | 'menu' | 'screen'): Record<string, unknown> {
  const base = { id: 'template-draft', orgId: '', name: 'Untitled', createdAt: Timestamp.now() };
  if (type === 'menu') return { ...base, updatedAt: Timestamp.now(), sections: [] };
  if (type === 'screen') return { ...base, locationId: '', orientation: 'landscape', isActive: false, livePlaylist: [], rotationSettings: { algorithm: 'loop', transition: 'fade', rotationMs: 10000 } };
  return { ...base, updatedAt: Timestamp.now(), dimensions: { width: 1920, height: 1080 }, orientation: 'landscape', backgroundColor: '#111827', elements: [] };
}

export const TemplateEditor = () => {
  const { feedback, notify } = useFeedback();
  const { templateId } = useParams();
  const isNew = !templateId || templateId === 'new';
  const { user } = useAuthStore();
  const { confirmAction, confirmation } = useConfirmation();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    category: '',
    tags: [],
    isPublic: true,
    type: 'slide',
    content: blankContent('slide')
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isNew && templateId) {
      const fetchTemplate = async () => {
        setLoading(true); setLoadError(false);
        try {
          const data = await TemplateService.getTemplate(templateId);
          if (data) {
            setTemplate(data);
          } else { throw new Error('Template not found'); }
        } catch (error) {
          console.error('Failed to load template', error);
          setLoadError(true); notify('Could not load this template. No blank replacement has been saved.', 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchTemplate();
    }
  }, [templateId, isNew, reload, notify]);

  const handleSave = async (content: Slide | Menu | AppScreen) => {
    if (!template.name?.trim()) { notify('Give the template a name before saving.', 'error'); throw new Error('Template name is required'); }
    setSaving(true);
    try {
      const templateData = {
        ...template,
        content: content as unknown as Record<string, unknown>
      };

      if (!isNew && templateId) {
        await TemplateService.updateTemplate(templateId, templateData);
      } else {
        await TemplateService.createTemplate({
          ...templateData,
          version: 1,
          createdBy: user?.uid || 'system'
        } as Omit<Template, 'id' | 'createdAt' | 'updatedAt'>);
      }
      navigate('/super-admin/templates');
    } catch (error) {
      console.error('Failed to save template', error);
      notify('Could not save the template. Your changes are still here.', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div role="status">Loading template…</div>;
  if (loadError) return <div className="p-6"><FeedbackRegion feedback={feedback} onRetry={() => setReload(v => v + 1)} /><button className="ui-button ui-button-secondary" onClick={() => navigate('/super-admin/templates')}>Back to templates</button></div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-4 sm:p-8 min-h-screen flex flex-col">
      <FeedbackRegion feedback={feedback} />
      {confirmation}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button aria-label={"Back to templates"} onClick={() => navigate('/super-admin/templates')} className="p-2 hover:bg-surface-highlight rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{isNew ? 'New Template' : 'Edit Template'}</h1>
        {saving && <span className="text-sm text-text-muted">Saving...</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* Sidebar Settings */}
        <div className="lg:col-span-3 space-y-4 overflow-y-auto">
          <div className="bg-surface border border-surface-highlight p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input aria-label={"Name"}
                type="text"
                value={template.name}
                onChange={e => setTemplate({ ...template, name: e.target.value })}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
                placeholder="Template Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select aria-label={"Type"}
                value={template.type}
                onChange={async e => {
                  const type = e.target.value as 'slide' | 'menu' | 'screen';
                  if (type !== template.type && await confirmAction('Changing template type will replace the unsaved canvas. Continue?')) setTemplate(previous => ({ ...previous, type, content: blankContent(type) }));
                }}
                disabled={!isNew || saving}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
              >
                <option value="slide">Slide</option>
                <option value="menu">Menu</option>
                <option value="screen">Screen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input aria-label={"Category"}
                type="text"
                value={template.category}
                onChange={e => setTemplate({ ...template, category: e.target.value })}
                className="w-full bg-background border border-surface-highlight rounded px-3 py-2"
                placeholder="e.g. Holidays, Menu Board"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea aria-label={"Description"}
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
        <div className="lg:col-span-9 min-h-[70vh] border border-surface-highlight rounded-lg overflow-hidden relative bg-black/90">
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
