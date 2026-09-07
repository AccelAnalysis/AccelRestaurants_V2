import type { ReactNode } from 'react';
import { useBrandStyle } from '../../hooks/useBrandStyle';
import { useLocation } from 'react-router-dom';

/** UI ergonomics must not resize customer-authored content on deployed screens. */
export const ApplicationSurface = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const style = useBrandStyle();
  const isPlayerSurface = pathname.startsWith('/player/') || pathname === '/display' || pathname.startsWith('/display/player/');
  return isPlayerSurface ? <>{children}</> : <div className="app-ui min-h-screen" style={style}>{children}</div>;
};
