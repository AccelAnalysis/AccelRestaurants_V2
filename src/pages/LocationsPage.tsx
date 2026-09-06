import { useParams } from 'react-router-dom';
import { LocationListView } from '../components/organisms/LocationListView';
import { LocationDetailView } from '../components/organisms/LocationDetailView';

export const LocationsPage = () => {
  const { locationId } = useParams();

  // If locationId is present, show detail view
  if (locationId) {
    return <LocationDetailView />;
  }

  // Otherwise show list view
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Locations</h1>
        <p className="text-text-muted text-sm mt-1">
          Manage your organization's locations and synchronized audio playback
        </p>
      </div>
      <LocationListView />
    </div>
  );
};
