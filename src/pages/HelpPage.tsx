import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, 
  MessageCircle, 
  ExternalLink,
  ChevronRight,
  Monitor,
  Layout,
  Rocket,
  X
} from 'lucide-react';
import { ContactForm } from '../components/organisms/ContactForm';

export const HelpPage = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Rocket className="text-primary" size={24} />,
      description: 'Learn the basics of AccelRestaurants',
      articles: [
        { title: 'Creating your first slide', link: '#' },
        { title: 'Understanding the Dashboard', link: '#' },
        { title: 'Inviting team members', link: '#' }
      ]
    },
    {
      id: 'tiles',
      title: 'Tiles & Components',
      icon: <Layout className="text-purple-500" size={24} />,
      description: 'Detailed guide on available slide tiles',
      articles: [
        { title: 'Text & Image Tiles', link: '#' },
        { title: 'Menu & Pricing Tiles', link: '#' },
        { title: 'Weather & Clock Tiles', link: '#' }
      ]
    },
    {
      id: 'deployment',
      title: 'Screens & Deployment',
      icon: <Monitor className="text-blue-500" size={24} />,
      description: 'How to manage and deploy to screens',
      articles: [
        { title: 'Pairing a new screen', link: '#' },
        { title: 'Deploying content', link: '#' },
        { title: 'Troubleshooting connectivity', link: '#' }
      ]
    },
    {
      id: 'legal',
      title: 'Legal & Privacy',
      icon: <Book className="text-green-500" size={24} />,
      description: 'Terms of Service and Privacy Policy',
      articles: [
        { title: 'Terms of Service', link: '/terms' },
        { title: 'Privacy Policy', link: '/privacy' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            How can we help you?
          </h1>
          <div className="max-w-xl mx-auto relative">
            <input 
              type="text" 
              placeholder="Search for answers..." 
              className="w-full bg-surface border border-surface-highlight rounded-full px-6 py-3 text-text focus:border-primary focus:outline-none shadow-lg"
            />
            <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div 
              key={category.id}
              className="bg-surface border border-surface-highlight rounded-xl p-6 hover:border-primary transition-colors cursor-pointer group"
              onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
            >
              <div className="mb-4 bg-surface-highlight/30 w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                {category.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{category.title}</h3>
              <p className="text-text-muted text-sm mb-4">{category.description}</p>
              
              <ul className="space-y-2">
                {category.articles.map((article, idx) => (
                  <li key={idx} className="flex items-center text-sm text-primary hover:underline">
                    <ChevronRight size={14} className="mr-1" />
                    {article.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-900/20 to-surface border border-blue-500/30 rounded-xl p-8 flex items-center gap-6">
            <div className="bg-blue-500/20 p-4 rounded-full">
              <Book size={32} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Knowledge Base</h3>
              <p className="text-text-muted text-sm mb-3">Browse detailed documentation and guides.</p>
              <Link to="/admin/kb" className="text-blue-400 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                View Articles <ExternalLink size={16} />
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/20 to-surface border border-primary/30 rounded-xl p-8 flex items-center gap-6">
            <div className="bg-primary/20 p-4 rounded-full">
              <MessageCircle size={32} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Contact Support</h3>
              <p className="text-text-muted text-sm mb-3">Get in touch with our team for assistance.</p>
              <button 
                onClick={() => setShowContactModal(true)}
                className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                Send Message <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl">
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <ContactForm />
          </div>
        </div>
      )}
    </div>
  );
};

const SearchIcon = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
