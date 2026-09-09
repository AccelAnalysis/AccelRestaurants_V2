import { useParams, useSearchParams } from 'react-router-dom';
import { ScreenEditor } from '../organisms/ScreenEditor';
import { FirstScreenGuide } from './FirstScreenGuide';
export const ScreenSetupPage = () => {
  const { screenId } = useParams();
  const [search] = useSearchParams();
  return <>{screenId && search.get('setup') === '1' && <div className="p-4 sm:p-8"><FirstScreenGuide screenId={screenId} /></div>}<ScreenEditor /></>;
};
