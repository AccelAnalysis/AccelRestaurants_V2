export interface WebsiteContent {
  bookingUrl?: string;
  benefits?: { title: string; body: string }[];
  measurementDescription?: string;
  faqs?: { question: string; answer: string }[];
}
export const WEBSITE_CONTENT: Required<WebsiteContent> = {
  bookingUrl: '',
  benefits: [
    { title: 'Make your menu stand out', body: 'Start with an editable restaurant design. Add your menu, prices and a background that suits your space.' },
    { title: 'Learn from guest responses', body: 'Connect a QR code to an offer or feedback form. Compare scans, responses and guest ratings in one place.' },
    { title: 'Update without the extra trip', body: 'Manage content for your restaurant screens from your browser, with one place for your menus and promotions.' },
  ],
  measurementDescription: 'Track interest in an offer, ask about a visit, or collect a quick rating. QR scans, completed forms and guest ratings help you decide what to try next.',
  faqs: [
    { question: 'Do I need to change my point-of-sale system?', answer: 'No. Create and manage restaurant screens alongside your existing point-of-sale system.' },
    { question: 'What do I need for my screen?', answer: 'You need a display, a compatible device with a modern web browser, and an internet connection for setup and updates. Test your device with the free preview before committing.' },
    { question: 'What does Free include?', answer: 'Create an editable restaurant design and try a five-minute screen preview. Choose a paid plan for ongoing playback.' },
  ],
};
