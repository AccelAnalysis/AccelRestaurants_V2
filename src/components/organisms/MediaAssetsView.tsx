import { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService, type StorageFile } from '../../services/storageService';
import { useAuthStore } from '../../store/useAuthStore';
import { Upload, Image as ImageIcon, Link as LinkIcon, Trash2, FileIcon, Volume2 } from 'lucide-react';
import { STORAGE_PATHS } from '../../lib/constants';

interface MediaAssetsViewProps {
  onSelect?: (url: string) => void;
  onClose?: () => void;
}

export const MediaAssetsView = ({ onSelect, onClose }: MediaAssetsViewProps = {}) => {
  const { user, organization } = useAuthStore();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!user || !organization) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // List files from the organization's assets folder using centralized path
      const data = await StorageService.listFiles(STORAGE_PATHS.ORGANIZATION_ASSETS(organization.id));
      setFiles(data);
    } catch {
      setError('Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }, [user, organization]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      setError('Only image, video, and audio files are supported');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size too large (max 50MB)');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      if (organization) {
        await StorageService.uploadFile(file, STORAGE_PATHS.ORGANIZATION_ASSETS(organization.id));
        await fetchFiles(); // Refresh list
      }
    } catch {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fullPath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      setError(null);
      await StorageService.deleteFile(fullPath);
      // Remove from local state immediately for better UX
      setFiles(files.filter(f => f.fullPath !== fullPath));
      // Refresh the list to ensure sync with Storage
      await fetchFiles();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete file. It may have already been removed.');
      // Refresh list to show current state
      await fetchFiles();
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };

  if (loading && files.length === 0) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user || !organization) {
    return <div className="text-text">Organization not loaded. Please refresh or re-login.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-text mb-1">Media Assets</h2>
            {onClose && (
              <button 
                onClick={onClose}
                className="md:hidden p-2 hover:bg-surface-highlight rounded-full text-text-muted"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            )}
          </div>
          <p className="text-text-muted text-sm">Manage images, videos, and audio for slides, menus, and venue atmosphere</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept="image/*,video/*,audio/*"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-primary/20 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload Asset
              </>
            )}
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="hidden md:flex p-2 hover:bg-surface-highlight rounded-full text-text-muted transition-colors"
              title="Close"
            >
              <Trash2 size={24} className="rotate-45" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-xl border border-surface-highlight text-center">
          <div className="w-16 h-16 bg-surface-highlight/30 rounded-full flex items-center justify-center mb-4">
            <ImageIcon size={32} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No media assets found</h3>
          <p className="text-text-muted mb-6 max-w-md">
            Upload images, videos, or audio to use them in digital signage slides, restaurant menus, and the cinematic atmosphere layer.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-primary hover:text-primary-hover font-medium flex items-center gap-2 hover:underline"
          >
            Upload your first asset
          </button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {files.map((file) => (
            <div 
              key={file.fullPath} 
              className="group bg-surface rounded-xl border border-surface-highlight overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="aspect-square bg-black/20 relative overflow-hidden">
                {file.contentType?.startsWith('image/') ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : file.contentType?.startsWith('video/') ? (
                  <video src={file.url} className="w-full h-full object-cover" />
                ) : file.contentType?.startsWith('audio/') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-3 bg-black/20 p-4">
                    <Volume2 size={36} />
                    <audio src={file.url} controls className="w-full" onClick={event => event.stopPropagation()} />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-2">
                    <FileIcon size={32} />
                    <span className="text-xs">File</span>
                  </div>
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                  {onSelect ? (
                    <button
                      onClick={() => onSelect(file.url)}
                      className="px-4 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg shadow-lg hover:scale-105 transition-all font-medium text-sm"
                    >
                      Select
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => copyUrl(file.url)}
                        className="p-2.5 bg-surface text-text hover:text-primary rounded-full shadow-lg hover:scale-110 transition-all"
                        title="Copy URL"
                      >
                        <LinkIcon size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(file.fullPath)}
                        className="p-2.5 bg-surface text-red-500 hover:bg-red-500 hover:text-white rounded-full shadow-lg hover:scale-110 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Type Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white backdrop-blur-md uppercase tracking-wider font-medium">
                  {file.contentType?.split('/')[0] || 'FILE'}
                </div>
              </div>
              
              <div className="p-3 border-t border-surface-highlight bg-surface">
                <p className="text-sm font-medium text-text truncate" title={file.name}>
                  {file.name.split('_').slice(1).join('_')}
                </p>
                <p className="text-xs text-text-muted mt-1 font-mono">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
