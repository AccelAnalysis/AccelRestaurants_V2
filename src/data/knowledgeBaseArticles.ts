export interface Article {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string; // HTML or Markdown content
  lastUpdated: string;
}

export const CATEGORIES = [
  'Getting Started',
  'Tiles & Components',
  'Screens & Deployment',
  'Account & Billing',
  'Troubleshooting',
  'Legal'
];

export const ARTICLES: Article[] = [
  {
    id: 'terms-of-service',
    title: 'Terms of Service',
    category: 'Legal',
    description: 'The terms and conditions for using AccelRestaurants.',
    content: `
      <h2>Terms of Service</h2>
      <p>Last Updated: January 1, 2024</p>
      
      <h3>1. Acceptance of Terms</h3>
      <p>By accessing and using AccelRestaurants, you accept and agree to be bound by the terms and provision of this agreement.</p>
      
      <h3>2. Use License</h3>
      <p>Permission is granted to temporarily download one copy of the materials (information or software) on AccelRestaurants' website for personal, non-commercial transitory viewing only.</p>
      
      <h3>3. Disclaimer</h3>
      <p>The materials on AccelRestaurants' website are provided "as is". AccelRestaurants makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
      
      <h3>4. Limitations</h3>
      <p>In no event shall AccelRestaurants or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on AccelRestaurants' website.</p>
    `,
    lastUpdated: '2024-01-01'
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'Legal',
    description: 'How we collect, use, and protect your data.',
    content: `
      <h2>Privacy Policy</h2>
      <p>Last Updated: January 1, 2024</p>
      
      <h3>1. Information Collection</h3>
      <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>
      
      <h3>2. Information Usage</h3>
      <p>We may use the information we collect about you to: Provide, maintain, and improve our Services; Provide and deliver the products and services you request, process transactions and send you related information.</p>
      
      <h3>3. Information Sharing</h3>
      <p>We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: With third party vendors, consultants and other service providers who need access to such information to carry out work on our behalf.</p>
    `,
    lastUpdated: '2024-01-01'
  },
  {
    id: 'creating-first-slide',
    title: 'Creating your first slide',
    category: 'Getting Started',
    description: 'Learn how to create, edit, and save your first digital signage slide.',
    content: `
      <h2>Introduction</h2>
      <p>Welcome to AccelRestaurants! Creating your first slide is easy and intuitive. Follow these steps to get started.</p>
      
      <h3>Step 1: Navigate to Slides</h3>
      <p>Click on the "Slides" tab in the left sidebar. This will take you to your slide library.</p>
      
      <h3>Step 2: Create New Slide</h3>
      <p>Click the "New Slide" button in the top right corner. You'll be taken to the Slide Editor.</p>
      
      <h3>Step 3: Add Tiles</h3>
      <p>Drag and drop tiles from the right sidebar onto your canvas. You can choose from Text, Image, Video, and many other tile types.</p>
      
      <h3>Step 4: Save</h3>
      <p>Once you're happy with your design, click the "Save" button in the top right.</p>
    `,
    lastUpdated: '2024-03-15'
  },
  {
    id: 'understanding-dashboard',
    title: 'Understanding the Dashboard',
    category: 'Getting Started',
    description: 'A comprehensive guide to navigating the Admin Dashboard.',
    content: `
      <h2>Dashboard Overview</h2>
      <p>The Admin Dashboard is your command center for managing your digital signage network.</p>
      
      <h3>Key Sections</h3>
      <ul>
        <li><strong>Menus:</strong> Manage your digital menu boards.</li>
        <li><strong>Slides:</strong> Create and edit generic content slides.</li>
        <li><strong>Screens:</strong> Manage your physical displays and what they show.</li>
        <li><strong>Media Assets:</strong> Upload and organize images and videos.</li>
      </ul>
    `,
    lastUpdated: '2024-03-10'
  },
  {
    id: 'deploying-content',
    title: 'Deploying content to screens',
    category: 'Screens & Deployment',
    description: 'How to push your slides and menus to your physical screens.',
    content: `
      <h2>Deployment Basics</h2>
      <p>Content is deployed to screens via "Playlists" or direct assignment.</p>
      
      <h3>Assigning Content</h3>
      <ol>
        <li>Go to the "Screens" section.</li>
        <li>Select the screen you want to update.</li>
        <li>In the "Live Playlist" section, click "Edit".</li>
        <li>Select the slides or menus you want to show.</li>
        <li>Save changes. The screen will update within 60 seconds.</li>
      </ol>
    `,
    lastUpdated: '2024-03-20'
  },
  {
    id: 'text-image-tiles',
    title: 'Using Text & Image Tiles',
    category: 'Tiles & Components',
    description: 'Deep dive into the most common tile types.',
    content: `
      <h2>Text Tiles</h2>
      <p>Text tiles allow you to add headers, paragraphs, and prices to your slides.</p>
      
      <h2>Image Tiles</h2>
      <p>Upload images from your computer or choose from your media library.</p>
    `,
    lastUpdated: '2024-02-28'
  },
  {
    id: 'pairing-screens',
    title: 'Pairing a new screen',
    category: 'Screens & Deployment',
    description: 'Connect a new physical display to your account.',
    content: `
      <h2>Pairing Process</h2>
      <p>1. Open the AccelRestaurants Player App on your TV/Display.</p>
      <p>2. You will see a 6-digit pairing code.</p>
      <p>3. Go to "Screens" in your dashboard and click "New Screen".</p>
      <p>4. Enter the code and give your screen a name.</p>
    `,
    lastUpdated: '2024-03-01'
  }
];
