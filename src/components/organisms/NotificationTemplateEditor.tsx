import { useFeedback } from '../../hooks/useFeedback';
import { FeedbackRegion } from '../atoms/FeedbackRegion';
import { useState, useEffect, useCallback } from 'react';
import { AdminService } from '../../services/adminService';
import type { SystemTemplate } from '../../types/schema';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';

export const NotificationTemplateEditor = () => {
  const { feedback, notify } = useFeedback();
  const [templates, setTemplates] = useState<SystemTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SystemTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState(false);
  const fetchTemplates = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try { setTemplates(await AdminService.getSystemTemplates()); }
    catch { setLoadError(true); notify('Could not load notification templates. Try again.', 'error'); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);

  const handleSave = async () => {
    if (!selectedTemplate || saving) return;

    setSaving(true);
    try {
      await AdminService.updateSystemTemplate(selectedTemplate.id, {
        subject: selectedTemplate.subject,
        content: selectedTemplate.content
      });
      notify('Template saved successfully', 'success');
      setTemplates(items => items.map(item => item.id === selectedTemplate.id ? selectedTemplate : item));
    } catch {
      notify('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div role="status" className="p-8 text-center text-text-muted">Loading templates…</div>;
  if (loadError) return <FeedbackRegion feedback={feedback} onRetry={() => void fetchTemplates()} />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
      <div className="lg:col-span-4"><FeedbackRegion feedback={feedback} /></div>
      {/* Sidebar List */}
      <div className="bg-surface border border-surface-highlight rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-highlight bg-surface-highlight/10">
          <h3 className="font-bold text-text">Templates</h3>
        </div>
        <div className="overflow-y-auto flex-1">
          {templates.length === 0 ? (
             <div className="p-4 text-sm text-text-muted text-center">
               No notification templates are available yet.
             </div>
          ) : (
            templates.map(template => (
              <button
                key={template.id}
                disabled={saving} aria-pressed={selectedTemplate?.id === template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full text-left p-4 border-b border-surface-highlight hover:bg-surface-highlight/5 transition-colors ${
                  selectedTemplate?.id === template.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="font-bold text-sm text-text">{template.name}</div>
                <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">{template.type}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="lg:col-span-3 bg-surface border border-surface-highlight rounded-xl flex flex-col overflow-hidden">
        {selectedTemplate ? (
          <>
            <div className="p-6 border-b border-surface-highlight flex flex-wrap gap-4 justify-between items-start bg-surface-highlight/5">
              <div>
                <h2 className="text-xl font-bold text-text">{selectedTemplate.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTemplate.variables.map(v => (
                    <span key={v} className="px-2 py-1 bg-surface-highlight rounded text-xs font-mono text-text-muted">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {selectedTemplate.type === 'email' && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Subject Line</label>
                  <input disabled={saving} aria-label={"Subject Line"}
                    type="text"
                    value={selectedTemplate.subject || ''}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                    className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="h-full flex flex-col">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Content (HTML)
                </label>
                <textarea disabled={saving} aria-label={"Content (HTML)"}
                  value={selectedTemplate.content}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content: e.target.value })}
                  className="flex-1 w-full bg-background border border-surface-highlight rounded-lg p-4 font-mono text-sm text-text focus:border-primary focus:outline-none min-h-[300px]"
                />
                <p className="text-xs text-text-muted mt-2">
                  Supports standard HTML tags. Use variables exactly as shown above.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
            <AlertCircle size={48} className="mb-4 opacity-50" />
            <p>Select a template to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
};
