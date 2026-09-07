import { InlineFeedback } from '../atoms/InlineFeedback';
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuService } from '../../services/menuService';
import type { Menu } from '../../types/schema';
import { useAuthStore } from '../../store/useAuthStore';
import { Plus, UtensilsCrossed, Search, ChevronRight, Trash2 } from 'lucide-react';
import { TemplateSelectorModal } from './TemplateSelectorModal';

export const MenuListView = () => {
  const { user, organization } = useAuthStore();
  const navigate = useNavigate();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const fetchMenus = useCallback(async () => {
    if (!user || !organization) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await MenuService.getMenus(organization.id);
      setMenus(data);
    } catch {
      setError('Failed to load menus');
    } finally {
      setLoading(false);
    }
  }, [user, organization]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this menu?')) {
      try {
        await MenuService.deleteMenu(id);
        fetchMenus();
      } catch {
        setError('Failed to delete menu. Please try again.');
      }
    }
  };

  const handleTemplateImport = (newId: string) => {
    setShowTemplateModal(false);
    navigate(`/admin/menus/${newId}`);
  };

  const handleCreateNew = () => {
    setShowTemplateModal(false);
    navigate('/admin/menus/new');
  };

  const filteredMenus = menus.filter(menu => 
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div role="status" className="flex items-center justify-center gap-3 h-64">Loading menus...
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <InlineFeedback tone="error" message={error}><button type="button" className="ui-button ui-button-secondary ml-3" onClick={() => void fetchMenus()}>Try again</button></InlineFeedback>
  );

  return (
    <div className="space-y-8">
      {showTemplateModal && (
        <TemplateSelectorModal 
          type="menu" 
          onClose={() => setShowTemplateModal(false)}
          onCreateBlank={handleCreateNew}
          onImport={handleTemplateImport} 
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text mb-1">Menus</h2>
          <p className="text-text-muted text-sm">Manage your restaurant's digital menus</p>
        </div>
        
        <button 
          onClick={() => setShowTemplateModal(true)}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center gap-2 font-medium"
        >
          <Plus size={18} />
          Create New Menu
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
        <input 
          type="text" 
          aria-label="Search menus" placeholder="Search menus..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-96 bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2.5 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted/50"
        />
      </div>

      {filteredMenus.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-xl border border-surface-highlight text-center">
          <div className="w-16 h-16 bg-surface-highlight/30 rounded-full flex items-center justify-center mb-4">
            <UtensilsCrossed size={32} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No menus found</h3>
          <p className="text-text-muted mb-6 max-w-md">
            {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating your first menu for your digital signage.'}
          </p>
          {!searchQuery && (
            <Link 
              to="/admin/menus/new"
              className="text-primary hover:text-primary-hover font-medium flex items-center gap-2 hover:underline"
            >
              Create Menu <ChevronRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMenus.map((menu) => (
            <div 
              key={menu.id} 
              className="group bg-surface rounded-xl border border-surface-highlight hover:border-primary/50 transition-all overflow-hidden hover:shadow-lg hover:shadow-primary/5 relative"

            >
              <div className="absolute top-2 right-2  z-20">
                <button aria-label={`Delete ${menu.name}`}
                  onClick={(e) => handleDelete(e, menu.id)}
                  className="p-1.5 bg-black/50 hover:bg-error/80 text-white rounded-md backdrop-blur-sm transition-colors"
                  title="Delete Menu"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="h-32 bg-surface-highlight/10 border-b border-surface-highlight flex items-center justify-center group-hover:bg-surface-highlight/20 transition-colors relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#9CA3AF 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                <UtensilsCrossed size={32} className="text-text-muted/50 group-hover:scale-110 transition-transform duration-300" />
              </div>
              
              <div className="p-5">
                <h3 className="text-lg font-bold text-text mb-2 group-hover:text-primary transition-colors"><Link to={`/admin/menus/${menu.id}`} className="inline-flex items-center min-h-11">{menu.name}</Link></h3>
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <span>{menu.sections?.length || 0} Sections</span>
                  <span className="flex items-center gap-1 text-xs bg-surface-highlight/30 px-2 py-1 rounded">
                    {menu.sections?.reduce((acc, sec) => acc + (sec.items?.length || 0), 0) || 0} Items
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
