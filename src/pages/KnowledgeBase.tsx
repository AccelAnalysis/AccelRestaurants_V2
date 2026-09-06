import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Book, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { CATEGORIES } from '../data/knowledgeBaseArticles';
import { ArticleService, type Article } from '../services/articleService';

export const KnowledgeBase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await ArticleService.getArticles();
        setArticles(data);
      } catch (error) {
        console.error('Failed to load articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            article.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? article.category === selectedCategory : true;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, articles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to="/admin/help" className="inline-flex items-center text-text-muted hover:text-primary transition-colors mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Help
          </Link>
          <h1 className="text-3xl font-bold text-text mb-2">Knowledge Base</h1>
          <p className="text-text-muted">Find guides, tutorials, and documentation.</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-surface-highlight rounded-xl pl-12 pr-4 py-3 text-text focus:border-primary focus:outline-none shadow-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null 
                  ? 'bg-primary text-white' 
                  : 'bg-surface border border-surface-highlight text-text hover:border-primary'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map(category => (
              <button 
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-white' 
                    : 'bg-surface border border-surface-highlight text-text hover:border-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.length > 0 ? (
            filteredArticles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="bg-surface-highlight/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book size={32} className="text-text-muted" />
              </div>
              <h3 className="text-xl font-bold text-text mb-2">No articles found</h3>
              <p className="text-text-muted">Try adjusting your search or category filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ArticleCard = ({ article }: { article: Article }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/admin/kb/${article.id}`)}
      className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
    >
      <div className="mb-4">
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
          {article.category}
        </span>
      </div>
      <h3 className="text-xl font-bold text-text mb-2 group-hover:text-primary transition-colors">
        {article.title}
      </h3>
      <p className="text-text-muted text-sm mb-4 line-clamp-3 flex-1">
        {article.description}
      </p>
      <div className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-surface-highlight">
        <span>Updated: {article.updatedAt?.seconds ? new Date(article.updatedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</span>
        <div className="flex items-center text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Read Article <ChevronRight size={14} className="ml-1" />
        </div>
      </div>
    </div>
  );
};
