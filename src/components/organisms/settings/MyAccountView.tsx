import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { UserService } from '../../../services/userService';
import { StorageService } from '../../../services/storageService';
import { auth } from '../../../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { User, Mail, Phone, Globe, Shield, Key, Bell, Download, Trash2, Camera, Save, Loader, MessageSquare } from 'lucide-react';

export const MyAccountView = () => {
  const { user, userProfile, organization, setUserProfile } = useAuthStore();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [marketingNotifs, setMarketingNotifs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setTimezone(userProfile.timezone || 'UTC');
    }
  }, [userProfile]);


  const handleUpdateProfile = async () => {
    if (!user || !userProfile) return;
    setIsSaving(true);
    try {
      // Build update data with all fields
      const updateData: Partial<{ displayName: string; phoneNumber: string; timezone: string }> = {
        displayName,
        timezone
      };
      
      // Only include phoneNumber if it has a value
      if (phoneNumber.trim()) {
        updateData.phoneNumber = phoneNumber;
      }
      
      await UserService.updateProfile(user.uid, updateData);
      
      // Update local store
      setUserProfile({ 
        ...userProfile, 
        displayName, 
        phoneNumber: phoneNumber.trim() || undefined,
        timezone
      });
      alert('Profile updated successfully.');
    } catch {
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`Password reset email sent to ${user.email}`);
    } catch {
      alert('Failed to send password reset email.');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const path = `users/${user.uid}/avatar_${Date.now()}`;
      const url = await StorageService.uploadFile(file, path);
      
      await UserService.updateProfile(user.uid, { photoURL: url });
      
      if (userProfile) {
        setUserProfile({ ...userProfile, photoURL: url });
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Failed to upload avatar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDataExport = () => {
    if (!userProfile) return;
    const data = {
      profile: userProfile,
      organization: organization || 'No Organization',
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accel_data_export_${user?.uid}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (!user || !userProfile) return null;

  const isOrgAdmin = organization?.ownerId === user.uid || 
    (organization?.members?.includes(user.uid) && userProfile.platformRole === 'admin'); // Rough check, real check relies on members subcollection

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Profile Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          <User size={20} className="text-primary" />
          Profile
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal Info Card */}
            <div className="md:col-span-2 bg-surface border border-surface-highlight rounded-lg p-6 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Personal Info</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-text-muted mb-1 block">Full Name</label>
                        <input 
                            type="text" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-sm text-text focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>
                     <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-text-muted mb-1 block">Email</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-surface-highlight/10 border border-surface-highlight rounded text-text-muted cursor-not-allowed">
                            <Mail size={14} />
                            <span className="text-sm flex-1 truncate">{userProfile.email}</span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">Verified</span>
                        </div>
                    </div>
                     <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-text-muted mb-1 block">Phone (Optional)</label>
                         <div className="relative">
                            <Phone size={14} className="absolute left-3 top-2.5 text-text-muted" />
                            <input 
                                type="tel" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-background border border-surface-highlight rounded pl-9 pr-3 py-2 text-sm text-text focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                     <div className="col-span-2 md:col-span-1">
                        <label className="text-xs text-text-muted mb-1 block">Time Zone</label>
                         <div className="relative">
                            <Globe size={14} className="absolute left-3 top-2.5 text-text-muted" />
                            <select 
                              value={timezone}
                              onChange={(e) => setTimezone(e.target.value)}
                              className="w-full bg-background border border-surface-highlight rounded pl-9 pr-3 py-2 text-sm text-text focus:border-primary focus:outline-none appearance-none transition-colors"
                            >
                                <option value="UTC">UTC (GMT+00:00)</option>
                                <option value="America/New_York">Eastern Time (GMT-05:00)</option>
                                <option value="America/Chicago">Central Time (GMT-06:00)</option>
                                <option value="America/Denver">Mountain Time (GMT-07:00)</option>
                                <option value="America/Los_Angeles">Pacific Time (GMT-08:00)</option>
                                <option value="Europe/London">London (GMT+00:00)</option>
                                <option value="Europe/Paris">Paris (GMT+01:00)</option>
                                <option value="Asia/Tokyo">Tokyo (GMT+09:00)</option>
                                <option value="Australia/Sydney">Sydney (GMT+10:00)</option>
                            </select>
                        </div>
                    </div>
                </div>
                 <div className="pt-4 flex justify-end">
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={isSaving}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Avatar & Context */}
            <div className="space-y-6">
                {/* Avatar */}
                <div className="bg-surface border border-surface-highlight rounded-lg p-6 flex flex-col items-center text-center shadow-sm">
                    <div 
                      className="relative w-24 h-24 mb-4 group cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                        <div className="w-full h-full rounded-full bg-surface-highlight flex items-center justify-center overflow-hidden border-2 border-surface-highlight group-hover:border-primary transition-colors">
                            {userProfile.photoURL ? (
                                <img src={userProfile.photoURL} alt={userProfile.displayName || 'User'} className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-text-muted" />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUploading ? (
                              <Loader size={20} className="text-white animate-spin" />
                            ) : (
                              <Camera size={20} className="text-white" />
                            )}
                        </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <p className="text-xs text-text-muted">Click to upload new avatar</p>
                </div>

                {/* Account Context */}
                 <div className="bg-surface border border-surface-highlight rounded-lg p-6 space-y-3 shadow-sm">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Context</h4>
                    <div className="space-y-3">
                        <div>
                             <label className="text-xs text-text-muted block mb-1">Organization</label>
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <p className="text-sm font-medium text-text">{organization?.name || 'Loading...'}</p>
                             </div>
                        </div>
                        <div>
                             <label className="text-xs text-text-muted block mb-1">Role</label>
                             <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                               isOrgAdmin 
                               ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' 
                               : 'bg-surface-highlight text-text border-surface-highlight/50'
                             }`}>
                                {isOrgAdmin ? 'Org Admin' : 'User'}
                             </span>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          Security
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-text mb-1">Password</h4>
                        <p className="text-xs text-text-muted">Manage your password and recovery options</p>
                    </div>
                    <Key size={20} className="text-text-muted" />
                </div>
                 <button onClick={handlePasswordReset} className="w-full py-2 border border-surface-highlight rounded text-sm text-text hover:bg-surface-highlight transition-colors font-medium">
                    Change Password
                </button>
            </div>
        </div>
      </section>

      {/* Notifications Section */}
       <section className="space-y-4">
        <h3 className="text-lg font-bold text-text flex items-center gap-2">
          <Bell size={20} className="text-primary" />
          Notifications
        </h3>
        
        <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-text">Email Notifications</p>
                        <p className="text-xs text-text-muted">Receive updates about your account and activity</p>
                    </div>
                    <button 
                      onClick={() => setEmailNotifs(!emailNotifs)}
                      className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none ${emailNotifs ? 'bg-primary' : 'bg-surface-highlight'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 left-1 transition-transform ${emailNotifs ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
                 <div className="flex items-center justify-between pt-4 border-t border-surface-highlight">
                    <div>
                        <p className="text-sm font-medium text-text">Marketing Updates</p>
                        <p className="text-xs text-text-muted">News about product features and improvements</p>
                    </div>
                    <button 
                      onClick={() => setMarketingNotifs(!marketingNotifs)}
                      className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none ${marketingNotifs ? 'bg-primary' : 'bg-surface-highlight'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 left-1 transition-transform ${marketingNotifs ? 'translate-x-4' : ''}`} />
                    </button>
                </div>
             </div>
        </div>
       </section>
       
       {/* Feedback Section */}
       <section className="space-y-4">
         <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <MessageSquare size={20} className="text-primary" />
            Feedback
         </h3>
         <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
            <p className="text-sm text-text-muted mb-4">
              We value your input! Let us know how we can improve AccelRestaurants.
            </p>
            <textarea 
              className="w-full bg-background border border-surface-highlight rounded p-3 text-sm text-text focus:border-primary focus:outline-none min-h-[100px] mb-4"
              placeholder="Share your thoughts, report a bug, or suggest a feature..."
            />
            <div className="flex justify-end">
              <button 
                className="px-4 py-2 bg-surface-highlight hover:bg-surface-highlight/80 text-text rounded text-sm font-medium transition-colors"
                onClick={() => alert('Thank you for your feedback!')}
              >
                Submit Feedback
              </button>
            </div>
         </div>
       </section>

       {/* Data & Privacy */}
       <section className="space-y-4">
         <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <Shield size={20} className="text-red-500" />
            Data & Privacy
         </h3>
         
          <div className="bg-surface border border-surface-highlight rounded-lg p-6 shadow-sm">
             <div className="flex items-center justify-between pb-4 border-b border-surface-highlight mb-4">
                 <div>
                     <p className="text-sm font-medium text-text">Export Data</p>
                     <p className="text-xs text-text-muted">Download a copy of your personal data</p>
                 </div>
                 <button 
                   onClick={handleDataExport}
                   className="flex items-center gap-2 px-3 py-2 border border-surface-highlight rounded text-sm text-text hover:bg-surface-highlight transition-colors font-medium"
                 >
                     <Download size={14} />
                     Export
                 </button>
             </div>
             
             <div className="flex items-center justify-between">
                 <div>
                     <p className="text-sm font-medium text-text">Delete Account</p>
                     <p className="text-xs text-text-muted">Permanently delete your account and remove access</p>
                 </div>
                 <button className="flex items-center gap-2 px-3 py-2 border border-red-500/20 bg-red-500/5 rounded text-sm text-red-500 hover:bg-red-500/10 transition-colors font-medium">
                     <Trash2 size={14} />
                     Delete Account
                 </button>
             </div>
          </div>
       </section>
    </div>
  );
};
