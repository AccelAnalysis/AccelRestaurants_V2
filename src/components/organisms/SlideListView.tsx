import { InlineFeedback } from '../atoms/InlineFeedback';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SlideService } from '../../services/slideService';
import type { Slide } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { Plus, Presentation, Search, ChevronRight, Trash2, Copy } from 'lucide-react';
import { TemplateSelectorModal } from './TemplateSelectorModal';

export const SlideListView = () => {
  const { user, organization } = useAuthStore();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const fetchSlides = useCallback(async () => {
    if (!user || !organization) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await SlideService.getSlides(organization.id);
      setSlides(data);
    } catch {
      setError('Failed to load slides');
    } finally {
      setLoading(false);
    }
  }, [user, organization]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this slide? It will be removed from all playlists.')) {
      try {
        await SlideService.deleteSlide(id);
        fetchSlides();
      } catch {
        setError('Failed to delete slide. Please try again.');
      }
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const newSlideId = await SlideService.duplicateSlide(id);
      fetchSlides();
      navigate(`/admin/slides/${newSlideId}`);
    } catch {
      setError('Failed to duplicate slide. Please try again.');
    }
  };

  const handleTemplateImport = (newId: string) => {
    setShowTemplateModal(false);
    navigate(`/admin/slides/${newId}`);
  };

  const handleCreateNew = async () => {
    setShowTemplateModal(false);
    if (!organization) return;
    try {
      setLoading(true);
      const newSlideId = await SlideService.createSlide({
        orgId: organization.id,
        name: 'New Slide',
        dimensions: { width: 1920, height: 1080 },
        orientation: 'landscape',
        backgroundColor: '#000000',
        elements: []
      });
      navigate(`/admin/slides/${newSlideId}`);
    } catch {
      setError('Failed to create new slide');
      setLoading(false);
    }
  };

  const filteredSlides = slides.filter(slide => 
    slide.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );



  return (
    <div className="space-y-8">
      <InlineFeedback message={error} tone="error"><button type="button" onClick={() => void fetchSlides()} className="ui-button ui-button-secondary ml-3">Retry</button></InlineFeedback>
      {showTemplateModal && (
        <TemplateSelectorModal 
          type="slide" 
          onClose={() => setShowTemplateModal(false)}
          onCreateBlank={handleCreateNew}
          onImport={handleTemplateImport} 
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">Slides</h2>
          <p className="text-text-muted text-sm">Create and manage your digital signage content</p>
        </div>
        
        <button 
          onClick={() => setShowTemplateModal(true)}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center gap-2 font-medium"
        >
          <Plus size={18} />
          Create New Slide
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
        <input 
          type="text" 
          aria-label="Search slides" placeholder="Search slides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-96 bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2.5 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted/50"
        />
      </div>

      {filteredSlides.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-xl border border-surface-highlight text-center">
          <div className="w-16 h-16 bg-surface-highlight/30 rounded-full flex items-center justify-center mb-4">
            <Presentation size={32} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No slides found</h3>
          <p className="text-text-muted mb-6 max-w-md">
            {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating your first slide for your displays.'}
          </p>
          {!searchQuery && (
            <button 
              onClick={handleCreateNew}
              className="text-primary hover:text-primary-hover font-medium flex items-center gap-2 hover:underline"
            >
              Create Slide <ChevronRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSlides.map((slide) => (
            <div 
              key={slide.id} 
              className="group bg-surface rounded-xl border border-surface-highlight hover:border-primary/50 transition-all cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-primary/5 relative"
            >
              <div className="absolute top-2 right-2 opacity-100 transition-opacity z-20 flex gap-1">
                <button aria-label="Duplicate Slide"
                  onClick={(e) => handleDuplicate(e, slide.id)}
                  className="p-1.5 bg-black/50 hover:bg-primary/80 text-white rounded-md backdrop-blur-sm transition-colors"
                  title="Duplicate Slide"
                >
                  <Copy size={14} />
                </button>
                <button aria-label="Delete Slide"
                  onClick={(e) => handleDelete(e, slide.id)}
                  className="p-1.5 bg-black/50 hover:bg-error/80 text-white rounded-md backdrop-blur-sm transition-colors"
                  title="Delete Slide"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="aspect-video bg-black/20 border-b border-surface-highlight flex items-center justify-center relative overflow-hidden group-hover:bg-black/30 transition-colors">
                {/* Simulated Preview - In real app, render a thumbnail */}
                {slide.backgroundImageUrl ? (
                   <img src={slide.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: slide.backgroundColor }}></div>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#9CA3AF 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                  </>
                )}
                
                <div className="text-center z-10">
                  <Presentation size={32} className="text-text-muted/50 mb-2 mx-auto group-hover:text-primary/50 transition-colors" />
                  <span className="text-xs text-text-muted bg-surface/80 px-2 py-1 rounded backdrop-blur-sm border border-surface-highlight">
                    {slide.dimensions.width}x{slide.dimensions.height}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-bold text-text mb-2 group-hover:text-primary transition-colors"><Link to={`/admin/slides/${slide.id}`} className="inline-flex items-center min-h-11">{slide.name}</Link></h3>
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <span>{slide.elements.length} Elements</span>
                  <span className="text-xs bg-surface-highlight/30 px-2 py-1 rounded">
                    {slide.updatedAt?.toDate?.().toLocaleDateString() || ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
