import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** UI ergonomics must not resize customer-authored content on deployed screens. */
export const ApplicationSurface = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return pathname.startsWith('/player/') ? <>{children}</> : <div className="app-ui min-h-screen">{children}</div>;
};
