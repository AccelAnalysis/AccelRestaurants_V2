/// <reference types="vite/client" />

import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      marquee: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        behavior?: string;
        direction?: string;
        scrollamount?: number | string;
      };
    }
  }
}

export {};
