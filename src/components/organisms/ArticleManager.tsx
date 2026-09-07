import { AccessibleDialog } from '../atoms/AccessibleDialog';
import { useFeedback } from '../../hooks/useFeedback';
import { FeedbackRegion } from '../atoms/FeedbackRegion';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useState, useEffect, useCallback } from 'react';
import { ArticleService, type Article } from '../../services/articleService';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Book, 
  Save,
  Loader2
} from 'lucide-react';
import { CATEGORIES, ARTICLES as STATIC_ARTICLES } from '../../data/knowledgeBaseArticles';

export const ArticleManager = () => {
  const { feedback, notify } = useFeedback();
  const { confirmAction, confirmation } = useConfirmation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ArticleService.getArticles();
      setArticles(data);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      notify('Failed to load articles', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);
  useEffect(() => { void fetchArticles(); }, [fetchArticles]);

  const handleMigrate = async () => {
    if (!(await confirmAction('This will import all static articles to Firestore. Continue?'))) return;
    setMigrating(true);
    try {
      let count = 0;
      for (const article of STATIC_ARTICLES) {
        // Check if article with this title already exists to avoid duplicates
        const exists = articles.some(a => a.title === article.title);
        if (!exists) {
          await ArticleService.createArticle({
            title: article.title,
            content: article.content,
            category: article.category,
            description: article.description
          });
          count++;
        }
      }
      notify(`Migration complete. Imported ${count} articles.`, 'success');
      fetchArticles();
    } catch (error) {
      console.error('Migration failed:', error);
      notify('Migration failed', 'error');
    } finally {
      setMigrating(false);
    }
  };

  const handleEdit = (article: Article) => {
    setCurrentArticle(article);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentArticle({
      title: '',
      content: '',
      category: CATEGORIES[0],
      description: ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction('Are you sure you want to delete this article?'))) return;
    try {
      await ArticleService.deleteArticle(id);
      setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete article:', error);
      notify('Failed to delete article', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArticle.title || !currentArticle.content || !currentArticle.category) return;

    setSaving(true);
    try {
      if (currentArticle.id) {
        await ArticleService.updateArticle(currentArticle.id, {
          title: currentArticle.title,
          content: currentArticle.content,
          category: currentArticle.category,
          description: currentArticle.description || ''
        });
      } else {
        await ArticleService.createArticle({
          title: currentArticle.title,
          content: currentArticle.content,
          category: currentArticle.category,
          description: currentArticle.description || ''
        });
      }
      setIsEditing(false);
      fetchArticles();
    } catch (error) {
      console.error('Failed to save article:', error);
      notify('Failed to save article', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <FeedbackRegion feedback={feedback} onRetry={!isEditing ? () => void fetchArticles() : undefined} />
      {confirmation}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input aria-label={"Search articles"}
            type="text" 
            placeholder="Search articles..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-surface-highlight rounded-lg pl-10 pr-4 py-2 text-text focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button aria-label={articles.length > 0 ? "Articles already exist" : "Import from static file"}
            onClick={handleMigrate}
            disabled={migrating || articles.length > 0}
            className="bg-surface border border-surface-highlight text-text hover:bg-surface-highlight px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={articles.length > 0 ? "Articles already exist" : "Import from static file"}
          >
            {migrating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Import Static
          </button>
          <button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Create Article
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading articles...</div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12 bg-surface border border-surface-highlight rounded-lg">
          <Book size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text">No articles found</h3>
          <p className="text-text-muted">Get started by creating your first knowledge base article.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredArticles.map(article => (
            <div key={article.id} className="bg-surface border border-surface-highlight rounded-lg p-4 flex flex-wrap gap-3 justify-between items-center">
              <div>
                <h3 className="font-bold text-text">{article.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {article.category}
                  </span>
                  <span className="text-xs text-text-muted">
                    Last updated: {article.updatedAt?.seconds ? new Date(article.updatedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button aria-label={`Edit ${article.title}`}
                  onClick={() => handleEdit(article)}
                  className="p-2 hover:bg-surface-highlight rounded text-text-muted hover:text-primary transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button aria-label={`Delete ${article.title}`}
                  onClick={() => handleDelete(article.id)}
                  className="p-2 hover:bg-surface-highlight rounded text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <AccessibleDialog title={currentArticle.id ? "Edit article" : "New article"} description="Update the article, then save your changes." onClose={() => setIsEditing(false)} busy={saving} wide>

        <FeedbackRegion feedback={feedback} onRetry={!isEditing ? () => void fetchArticles() : undefined} />

            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Title</label>
                <input aria-label={"Title"}
                  type="text"
                  value={currentArticle.title}
                  onChange={(e) => setCurrentArticle({ ...currentArticle, title: e.target.value })}
                  placeholder="Article Title"
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Category</label>
                <select aria-label={"Category"}
                  value={currentArticle.category}
                  onChange={(e) => setCurrentArticle({ ...currentArticle, category: e.target.value })}
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
                  required
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Description</label>
                <input aria-label={"Description"}
                  type="text"
                  value={currentArticle.description}
                  onChange={(e) => setCurrentArticle({ ...currentArticle, description: e.target.value })}
                  placeholder="Short description for list view"
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">Content (HTML/Markdown support)</label>
                <textarea aria-label={"Content (HTML/Markdown support)"}
                  value={currentArticle.content}
                  onChange={(e) => setCurrentArticle({ ...currentArticle, content: e.target.value })}
                  placeholder="# Heading\n\nContent goes here..."
                  className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 text-text focus:border-primary focus:outline-none min-h-[300px] font-mono text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-highlight">
                <button 
                  type="button"
                  disabled={saving} onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-text-muted hover:text-text transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  <Save size={18} />
                  Save Article
                </button>
              </div>
            </form>
          </AccessibleDialog>
      )}
    </div>
  );
};
