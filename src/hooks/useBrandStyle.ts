import { useConfigStore } from '../store/useConfigStore';
import { brandStyle } from '../utils/brandColors';
export const useBrandStyle = () => brandStyle(useConfigStore(state => state.generalConfig.primaryBrandColor));
