import { useState } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

export const ContactForm = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const sendSupportEmail = httpsCallable(functions, 'sendSupportEmail');
      await sendSupportEmail({
        subject,
        message,
        category
      });
      setStatus('success');
      setSubject('');
      setMessage('');
      setCategory('general');
    } catch (error: unknown) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    }
  };

  return (
    <div className="bg-surface border border-surface-highlight rounded-xl p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text mb-2">Contact Support</h2>
        <p className="text-text-muted">Fill out the form below and we'll get back to you as soon as possible.</p>
      </div>

      {status === 'success' ? (
        <div className="text-center py-12">
          <div className="bg-success/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-success">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">Message Sent!</h3>
          <p className="text-text-muted mb-6">Thank you for contacting us. We've received your message.</p>
          <button 
            onClick={() => setStatus('idle')}
            className="text-primary hover:underline"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Topic</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-3 text-text focus:border-primary focus:outline-none"
              >
                <option value="general">General Inquiry</option>
                <option value="technical">Technical Support</option>
                <option value="billing">Billing & Subscription</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-3 text-text focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Message</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              rows={6}
              className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-3 text-text focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? 'Sending...' : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
