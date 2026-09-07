import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import { ARTICLES } from '../data/knowledgeBaseArticles';

export const ArticleView = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();

  const article = ARTICLES.find(a => a.id === articleId);

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-text p-8 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
        <Link to="/admin/kb" className="text-primary hover:underline">Return to Knowledge Base</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-text-muted hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </button>

        <article className="bg-surface border border-surface-highlight rounded-xl p-8 md:p-12 shadow-lg">
          <div className="flex items-center gap-4 mb-6 text-sm">
            <span className="flex items-center gap-1 text-primary bg-primary/10 px-3 py-1 rounded-full font-medium">
              <Tag size={14} />
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-text-muted">
              <Calendar size={14} />
              Last updated: {article.lastUpdated}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-text mb-6">{article.title}</h1>
          
          <div className="w-full h-px bg-surface-highlight mb-8"></div>

          <div 
            className="prose prose-invert max-w-none text-text prose-headings:text-text prose-a:text-primary prose-strong:text-text"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </div>
    </div>
  );
};
