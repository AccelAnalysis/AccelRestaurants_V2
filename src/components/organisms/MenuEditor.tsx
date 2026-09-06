import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MenuService } from '../../services/menuService';
import { StorageService } from '../../services/storageService';
import { LocationService } from '../../services/locationService';
import { useAuthStore } from '../../store/useAuthStore';
import type { Menu, MenuSection, MenuItem, MenuSchedule, Location, LocationGroup } from '../../types/schema';
import { Timestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  GripVertical,
  UtensilsCrossed,
  Clock,
  Calendar,
  Settings,
  MapPin,
  Layers
} from 'lucide-react';

import { STORAGE_PATHS } from '../../lib/constants';
import { SchedulePreview } from '../molecules/SchedulePreview';
import { validateSchedules, type ValidationError } from '../../utils/dayparting';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun', full: 'Sunday' },
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
];

export const MenuEditor = ({
  initialData,
  onSave,
  isTemplateMode = false
}: {
  initialData?: Menu;
  onSave?: (menu: Menu) => Promise<void>;
  isTemplateMode?: boolean;
}) => {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const { user, organization } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'content' | 'scheduling' | 'locations'>('content');
  const [name, setName] = useState('');
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [locationGroupIds, setLocationGroupIds] = useState<string[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(!isTemplateMode);
  const [fetching, setFetching] = useState(!!menuId && !isTemplateMode);
  const [error, setError] = useState<string | null>(null);
  const [scheduleErrors, setScheduleErrors] = useState<ValidationError[]>([]);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  useEffect(() => {
    // Fetch locations and groups
    if (organization?.id && !isTemplateMode) {
      Promise.all([
        LocationService.getLocations(organization.id),
        LocationService.getLocationGroups(organization.id)
      ]).then(([locs, groups]) => {
        setLocations(locs);
        setLocationGroups(groups);
      }).catch(console.error);
    }
  }, [organization?.id, isTemplateMode]);

  useEffect(() => {
    setScheduleErrors(validateSchedules(schedules));
  }, [schedules]);

  useEffect(() => {
    if (isTemplateMode) {
      if (initialData) {
        setName(initialData.name);
        setSections(initialData.sections || []);
        setSchedules(initialData.schedule || []);
        setLocationIds(initialData.locationIds || []);
        setLocationGroupIds(initialData.locationGroupIds || []);
      } else {
        // Initialize default menu for new template
        setName('New Menu Template');
        setSections([]);
        setSchedules([]);
        setLocationIds([]);
        setLocationGroupIds([]);
      }
      setLoading(false);
      setFetching(false);
      return;
    }

    if (menuId) {
      const fetchMenu = async () => {
        try {
          const menu = await MenuService.getMenu(menuId);
          if (menu) {
            setName(menu.name);
            setSections(menu.sections || []);
            setSchedules(menu.schedule || []);
            setLocationIds(menu.locationIds || []);
            setLocationGroupIds(menu.locationGroupIds || []);
          } else {
            setError('Menu not found');
          }
        } catch {
          setError('Failed to fetch menu details');
        } finally {
          setFetching(false);
          setLoading(false);
        }
      };
      fetchMenu();
    }
  }, [menuId, isTemplateMode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!isTemplateMode && !user) return;

    setLoading(true);
    setError(null);

    try {
      if (isTemplateMode && onSave) {
        const menuData: Menu = {
          id: initialData?.id || 'template-draft',
          orgId: 'template',
          name,
          sections,
          schedule: schedules,
          locationIds,
          locationGroupIds,
          createdAt: initialData?.createdAt || Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        await onSave(menuData);
      } else if (menuId) {
        await MenuService.updateMenu(menuId, { name, sections, schedule: schedules, locationIds, locationGroupIds });
        navigate('/admin/menus');
      } else {
        if (organization) {
          await MenuService.createMenu({
            orgId: organization.id,
            name,
            sections,
            schedule: schedules,
            locationIds,
            locationGroupIds
          });
          navigate('/admin/menus');
        }
      }
    } catch {
      setError('Failed to save menu');
    } finally {
      setLoading(false);
    }
  };

  // --- Schedule Handlers ---
  const addSchedule = () => {
    const newSchedule: MenuSchedule = {
      id: crypto.randomUUID(),
      name: 'New Schedule',
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri default
      active: true
    };
    setSchedules([...schedules, newSchedule]);
  };

  const updateSchedule = (id: string, updates: Partial<MenuSchedule>) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSchedule = (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const toggleDay = (scheduleId: string, dayId: number) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const newDays = schedule.daysOfWeek.includes(dayId)
      ? schedule.daysOfWeek.filter(d => d !== dayId)
      : [...schedule.daysOfWeek, dayId].sort();
    
    updateSchedule(scheduleId, { daysOfWeek: newDays });
  };

  // --- Section Handlers ---
  const addSection = () => {
    const newSection: MenuSection = {
      id: crypto.randomUUID(),
      name: 'New Section',
      sortOrder: sections.length,
      items: []
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<MenuSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSection = (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  // --- Item Handlers ---
  const addItem = (sectionId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        const newItem: MenuItem = {
          id: crypto.randomUUID(),
          name: 'New Item',
          price: '0.00',
          isAvailable: true,
          description: ''
        };
        return { ...s, items: [...s.items, newItem] };
      }
      return s;
    }));
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<MenuItem>) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          items: s.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
        };
      }
      return s;
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, items: s.items.filter(i => i.id !== itemId) };
      }
      return s;
    }));
  };

  const handleImageUpload = async (sectionId: string, itemId: string, file: File) => {
    if (!file) return;
    
    try {
      setUploadingItem(itemId);
      
      let path;
      if (isTemplateMode) {
        path = `templates/menus/${crypto.randomUUID()}/${file.name}`;
      } else if (organization) {
        path = STORAGE_PATHS.ORGANIZATION_ASSETS(organization.id);
      } else {
        throw new Error('Organization context missing');
      }

      const url = await StorageService.uploadFile(file, path);
      updateItem(sectionId, itemId, { imageUrl: url });
    } catch {
      alert('Failed to upload image');
    } finally {
      setUploadingItem(null);
    }
  };

  if (fetching) return <div className="p-8 text-text-muted">Loading menu...</div>;

  return (
    <div className={`max-w-5xl mx-auto ${isTemplateMode ? 'pb-8' : 'pb-20'}`}>
      {/* Header */}
      {!isTemplateMode ? (
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-background pt-6 pb-6 border-b border-surface-highlight z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/menus')}
              className="text-text-muted hover:text-text p-2 hover:bg-surface-highlight/50 rounded-full transition-colors"
              title="Back to Menus"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-text">
                {menuId ? 'Edit Menu' : 'Create New Menu'}
              </h2>
              <p className="text-sm text-text-muted">Manage your menu sections and items</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/menus')}
              className="text-text-muted hover:text-text px-4 py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-6 rounded-md transition-colors disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-surface border-b border-surface-highlight px-6 py-4 flex items-center justify-between mb-6 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-text">Menu Template</h2>
            <p className="text-xs text-text-muted">Design the structure and default content</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md transition-colors text-sm"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6 flex items-center gap-2 mx-6">
          <span>{error}</span>
        </div>
      )}

      <div className={`space-y-8 ${isTemplateMode ? 'px-6' : ''}`}>
        {/* Menu Details & Tabs */}
        <div className="bg-surface rounded-lg border border-surface-highlight shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-highlight">
            <label htmlFor="name" className="block text-sm font-bold text-text-muted uppercase tracking-wider mb-2">
              Menu Name
            </label>
            <div className="flex gap-4">
              <div className="p-3 bg-surface-highlight/20 rounded-md border border-surface-highlight text-text-muted">
                <UtensilsCrossed size={24} />
              </div>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-background border border-surface-highlight rounded-md px-4 py-3 text-text text-lg focus:outline-none focus:border-primary transition-colors placeholder:text-surface-highlight"
                placeholder="e.g. Lunch Menu"
                required
              />
            </div>
          </div>
          
          <div className="flex border-b border-surface-highlight">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'content'
                  ? 'text-primary border-b-2 border-primary bg-surface-highlight/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-highlight/10'
              }`}
            >
              <Settings size={16} />
              Content
            </button>
            <button
              onClick={() => setActiveTab('scheduling')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'scheduling'
                  ? 'text-primary border-b-2 border-primary bg-surface-highlight/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-highlight/10'
              }`}
            >
              <Clock size={16} />
              Scheduling
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'locations'
                  ? 'text-primary border-b-2 border-primary bg-surface-highlight/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-highlight/10'
              }`}
            >
              <MapPin size={16} />
              Locations
            </button>
          </div>
        </div>

        {activeTab === 'locations' ? (
          <div className="space-y-6">
             <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-lg font-bold text-text flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  Menu Availability
                </h3>
                <p className="text-sm text-text-muted">Select which locations this menu is available at.</p>
              </div>
            </div>

            <div className="bg-surface rounded-lg border border-surface-highlight p-6 space-y-8">
              {/* Groups Section */}
              <div>
                <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers size={16} /> Location Groups
                </h4>
                {locationGroups.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No location groups defined.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locationGroups.map(group => (
                      <label 
                        key={group.id} 
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          locationGroupIds.includes(group.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-surface-highlight hover:bg-surface-highlight/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={locationGroupIds.includes(group.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocationGroupIds([...locationGroupIds, group.id]);
                            } else {
                              setLocationGroupIds(locationGroupIds.filter(id => id !== group.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-surface-highlight text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-text">{group.name}</p>
                          <p className="text-xs text-text-muted">{group.description || 'No description'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Individual Locations Section */}
              <div>
                <h4 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Individual Locations
                </h4>
                {locations.length === 0 ? (
                  <div className="text-center py-4 text-text-muted">
                    <p>No locations found.</p>
                    <p className="text-xs mt-1">Add locations in Organization Settings.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations.map(location => (
                      <label 
                        key={location.id} 
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          locationIds.includes(location.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-surface-highlight hover:bg-surface-highlight/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={locationIds.includes(location.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocationIds([...locationIds, location.id]);
                            } else {
                              setLocationIds(locationIds.filter(id => id !== location.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-surface-highlight text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-text">{location.name}</p>
                          {location.address && (
                            <p className="text-xs text-text-muted">
                              {location.address.city}, {location.address.state}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'scheduling' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-lg font-bold text-text flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">
                    {schedules.length}
                  </span>
                  Active Schedules
                </h3>
                <p className="text-sm text-text-muted">Set when this menu should be displayed on screens</p>
              </div>
              <button
                onClick={addSchedule}
                className="text-primary hover:text-primary-hover font-medium flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
              >
                <Plus size={18} />
                Add Schedule
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-surface-highlight rounded-lg text-text-muted bg-surface-highlight/5">
                <Clock size={48} className="mb-4 opacity-20" />
                <p className="font-medium mb-2">No schedules defined</p>
                <p className="text-sm text-text-muted/70 mb-6">This menu is available anytime unless restricted by other scheduled menus.</p>
                <button
                  onClick={addSchedule}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-md transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add First Schedule
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className={`bg-surface rounded-lg border p-6 shadow-sm ${scheduleErrors.some(e => e.scheduleId === schedule.id) ? 'border-red-500 ring-1 ring-red-500' : 'border-surface-highlight'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 mr-4">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1 block">Schedule Name</label>
                        <input
                          type="text"
                          value={schedule.name}
                          onChange={(e) => updateSchedule(schedule.id, { name: e.target.value })}
                          className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
                          placeholder="e.g. Breakfast Hours"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer mr-4">
                          <span className="text-sm text-text-muted">Active</span>
                          <div className={`w-10 h-5 rounded-full p-1 transition-colors ${schedule.active ? 'bg-success' : 'bg-surface-highlight'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${schedule.active ? 'translate-x-5' : ''}`} />
                          </div>
                          <input
                            type="checkbox"
                            checked={schedule.active}
                            onChange={(e) => updateSchedule(schedule.id, { active: e.target.checked })}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => removeSchedule(schedule.id)}
                          className="text-text-muted hover:text-red-500 p-2 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Clock size={14} /> Time Range
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => updateSchedule(schedule.id, { startTime: e.target.value })}
                            className="bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
                          />
                          <span className="text-text-muted">to</span>
                          <input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => updateSchedule(schedule.id, { endTime: e.target.value })}
                            className="bg-background border border-surface-highlight rounded px-3 py-2 text-text focus:border-primary focus:outline-none"
                          />
                        </div>
                        
                        <div className="mt-3">
                           <label className="text-xs text-text-muted mb-1 block">Timezone</label>
                           <select
                             value={schedule.timezone || ''}
                             onChange={(e) => updateSchedule(schedule.id, { timezone: e.target.value || undefined })}
                             className="w-full bg-background border border-surface-highlight rounded px-3 py-2 text-text text-sm focus:border-primary focus:outline-none"
                           >
                             <option value="">Use Organization Timezone</option>
                             <option value="America/New_York">Eastern Time (ET)</option>
                             <option value="America/Chicago">Central Time (CT)</option>
                             <option value="America/Denver">Mountain Time (MT)</option>
                             <option value="America/Los_Angeles">Pacific Time (PT)</option>
                             <option value="America/Phoenix">Arizona (MT no DST)</option>
                             <option value="America/Anchorage">Arizona (MT no DST)</option>
                             <option value="Pacific/Honolulu">Alaska (AKT)</option>
                             <option value="Pacific/Honolulu">Hawaii (HST)</option>
                             <option value="UTC">UTC</option>
                           </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Calendar size={14} /> Days Active
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = schedule.daysOfWeek.includes(day.id);
                            return (
                              <button
                                key={day.id}
                                onClick={() => toggleDay(schedule.id, day.id)}
                                className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-primary text-white shadow-md transform scale-105'
                                    : 'bg-surface-highlight text-text-muted hover:bg-surface-highlight/80'
                                }`}
                                title={day.full}
                              >
                                {day.label.charAt(0)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Schedule Visual Preview */}
                <SchedulePreview schedules={schedules} timezone={organization?.timezone} />
              </div>
            )}
          </div>
        ) : (
          /* Content Tab (Sections) */
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">
                  {sections.length}
                </span>
                Menu Sections
              </h3>
              <button
                onClick={addSection}
                className="text-primary hover:text-primary-hover font-medium flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>

            {sections.map((section) => (
              <div key={section.id} className="bg-surface rounded-lg border border-surface-highlight overflow-hidden shadow-sm transition-all hover:shadow-md">
                {/* Section Header */}
                <div className="p-4 bg-surface-highlight/10 border-b border-surface-highlight flex gap-4 items-center group">
                  <div className="text-text-muted cursor-grab opacity-50 group-hover:opacity-100 hover:text-text">
                    <GripVertical size={20} />
                  </div>
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => updateSection(section.id, { name: e.target.value })}
                    className="flex-1 bg-transparent font-bold text-lg text-text border-none focus:ring-0 px-0 placeholder:text-text-muted/50"
                    placeholder="Section Name (e.g. Appetizers)"
                  />
                  <button
                    onClick={() => removeSection(section.id)}
                    className="text-text-muted hover:text-red-500 p-2 rounded-full hover:bg-surface-highlight/30 transition-colors"
                    title="Delete Section"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-4">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-start p-4 bg-background rounded-lg border border-surface-highlight group hover:border-primary/30 transition-colors">
                      
                      {/* Image Upload */}
                      <div className="w-24 h-24 bg-black/20 rounded-md flex-shrink-0 relative overflow-hidden border border-surface-highlight group-hover:border-primary/30 transition-colors">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-1">
                            <ImageIcon size={20} />
                            <span className="text-[10px]">No Image</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity text-white gap-1">
                          {uploadingItem === item.id ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Upload size={16} />
                              <span className="text-[10px] font-medium">Upload</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageUpload(section.id, item.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex gap-4">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(section.id, item.id, { name: e.target.value })}
                            className="flex-1 bg-transparent font-semibold text-text text-base border-b border-transparent focus:border-primary focus:outline-none placeholder:text-text-muted/50"
                            placeholder="Item Name"
                          />
                          <div className="relative">
                            <span className="absolute left-0 top-0 text-text-muted text-sm">$</span>
                            <input
                              type="text"
                              value={item.price}
                              onChange={(e) => updateItem(section.id, item.id, { price: e.target.value })}
                              className="w-24 bg-transparent text-right font-medium text-text pl-3 border-b border-transparent focus:border-primary focus:outline-none placeholder:text-text-muted/50"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                          className="w-full bg-surface/50 text-sm text-text-muted border border-transparent focus:border-primary rounded px-3 py-2 focus:outline-none resize-none placeholder:text-text-muted/30"
                          placeholder="Add a description for this item..."
                          rows={2}
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer group/avail">
                            <input
                              type="checkbox"
                              checked={item.isAvailable}
                              onChange={(e) => updateItem(section.id, item.id, { isAvailable: e.target.checked })}
                              className="w-4 h-4 rounded border-surface-highlight text-primary focus:ring-primary bg-surface checked:bg-primary"
                            />
                            <span className="text-xs text-text-muted group-hover/avail:text-text transition-colors">Available</span>
                          </label>
                          
                          <button
                            onClick={() => removeItem(section.id, item.id)}
                            className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs flex items-center gap-1 hover:bg-red-500/10 px-2 py-1 rounded"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addItem(section.id)}
                    className="w-full py-3 border-2 border-dashed border-surface-highlight rounded-lg text-text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Item to {section.name || 'Section'}
                  </button>
                </div>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-surface-highlight rounded-lg text-text-muted bg-surface-highlight/5">
                <UtensilsCrossed size={48} className="mb-4 opacity-20" />
                <p className="font-medium mb-2">This menu is empty</p>
                <p className="text-sm text-text-muted/70 mb-6">Start building your menu by adding sections and items.</p>
                <button
                  onClick={addSection}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-md transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add First Section
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
