import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, ExternalLink } from 'lucide-react';

export const RedirectTracker = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const tileId = searchParams.get('tid');
  const screenId = searchParams.get('sid'); // Optional, if we can capture it
  const orgId = searchParams.get('oid'); // Organization ID for multi-tenant analytics
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trackAndRedirect = async () => {
      if (!url) {
        setError('No destination URL provided');
        return;
      }

      try {
        // Log the scan
        await addDoc(collection(db, 'qr_scans'), {
          url,
          tileId,
          screenId,
          orgId,
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        });

        // Redirect
        // Add protocol if missing
        let targetUrl = url;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = `https://${targetUrl}`;
        }
        
        window.location.href = targetUrl;
      } catch (err) {
        console.error('Tracking failed:', err);
        // Attempt redirect anyway
        let targetUrl = url;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = `https://${targetUrl}`;
        }
        window.location.href = targetUrl;
      }
    };

    trackAndRedirect();
  }, [url, tileId, screenId, orgId]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">
          <ExternalLink size={48} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <Loader2 className="animate-spin text-primary mb-4" size={48} />
      <h1 className="text-xl font-bold">Redirecting...</h1>
    </div>
  );
};
