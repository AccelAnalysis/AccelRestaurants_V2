import { useState, useEffect } from 'react';
import { TemplateService } from '../../services/templateService';
import type { Template } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { InlineFeedback } from '../atoms/InlineFeedback';

interface TemplateSelectorModalProps {
  type: 'slide' | 'menu' | 'screen';
  onClose: () => void;
  onCreateBlank: () => void;
  onImport: (newResourceId: string) => void;
}

export const TemplateSelectorModal = ({ type, onClose, onCreateBlank, onImport }: TemplateSelectorModalProps) => {
  const { organization } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try { const result = await TemplateService.getTemplates({ isPublic: true }); if (active) setTemplates(result.filter(item => item.type === type)); }
      catch { if (active) setError('Templates could not be loaded. Retry or start from scratch.'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [type, reload]);
  const select = async (template: Template) => {
    if (!organization || importing) return;
    setImporting(template.id); setError(null);
    try {
      const result = await TemplateService.importTemplate(template.id, organization.id);
      if (!result.success) throw new Error('Import failed');
      onImport(result.resourceId);
    } catch { setError('The template could not be imported. Nothing new has been opened. Try again.'); }
    finally { setImporting(null); }
  };
  const filtered = templates.filter(template => [template.name, template.category, ...(template.tags || [])].join(' ').toLowerCase().includes(search.toLowerCase()));
  return <AccessibleDialog title={`Choose a ${type} template`} description="Use a template or start with a blank design." onClose={onClose} closeLabel="Cancel" wide busy={!!importing}>
    <div className="flex flex-wrap gap-3 justify-between items-end mb-4">
      <div className="flex-1 min-w-0"><label htmlFor="template-search" className="block text-sm font-medium mb-1">Search templates</label><input id="template-search" type="search" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-background border border-surface-highlight rounded-lg px-3 py-2" /></div>
      <button type="button" className="ui-button ui-button-secondary" disabled={!!importing} onClick={onCreateBlank}>Start from scratch</button>
    </div>
    <InlineFeedback message={error} tone="error"><button type="button" className="ui-button ui-button-secondary ml-3" disabled={!!importing} onClick={() => setReload(v => v + 1)}>Retry loading</button></InlineFeedback>
    <InlineFeedback message={importing ? 'Importing template…' : loading ? 'Loading templates…' : null} />
    {!loading && !importing && filtered.length === 0 && <p className="py-8 text-text-secondary">{search ? 'No matching templates. Change your search or start from scratch.' : 'No templates available. You can still start from scratch.'}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map(template => <button key={template.id} type="button" disabled={!!importing || !organization} onClick={() => void select(template)} aria-label={`Use ${template.name}`} className="text-left rounded-lg border border-surface-highlight overflow-hidden bg-background hover:border-primary p-0">
        {template.thumbnailUrl && <img src={template.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />}
        <span className="block p-4"><span className="block font-semibold text-text">{template.name}</span><span className="block mt-1 text-sm text-text-secondary">{template.description}</span><span className="block mt-3 text-sm text-primary">Use template</span></span>
      </button>)}
    </div>
  </AccessibleDialog>;
};
