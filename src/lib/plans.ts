import type { TileType } from '../types/schema';

export type PlanType = 'Free' | 'Basic' | 'Growth' | 'Enterprise' | 'Franchise';

export interface PlanLimits {
  seats: number;
  screens: number; // -1 for unlimited (or base included)
  deploymentDurationLimit: boolean; // true means limited to 5 mins
  allowedTiles: TileType[];
  price: number;
  stripePriceId?: string;
  description: string;
  addOns?: {
    screen?: number;
    screenPriceId?: string;
    seat?: number;
    seatPriceId?: string;
  };
  maxScreens?: number; // Hard cap if any
  maxSeats?: number; // Hard cap if any
}

// Helper to calculate effective limits including add-ons
export const getEffectivePlanLimits = (
  org: { plan: PlanType; purchasedScreens?: number; purchasedSeats?: number },
  configs: Record<PlanType, PlanLimits> = PLAN_CONFIGS
): { screens: number; seats: number } => {
  const config = configs[org.plan];
  if (!config) return { screens: 1, seats: 1 };

  let screens = config.screens;
  if (screens !== -1) {
    screens += (org.purchasedScreens || 0);
    if (config.maxScreens !== undefined) {
      screens = Math.min(screens, config.maxScreens);
    }
  }

  let seats = config.seats;
  if (seats !== -1) {
    seats += (org.purchasedSeats || 0);
    if (config.maxSeats !== undefined) {
      seats = Math.min(seats, config.maxSeats);
    }
  }

  return { screens, seats };
};

// Categorize tiles for easier management
export const BASIC_TILES: TileType[] = [
  'text', 'image', 'shape', 'clock', 'weather', 'qr_code', 'container', 'divider', 'grid', 'flex',
  'button', 'form' // Moved to Basic for accessibility/testing
];

export const ADVANCED_TILES: TileType[] = [
  ...BASIC_TILES,
  'dynamic_text', 'scrolling_text', 'rich_text', 'marquee', 
  'video', 'gif', 'youtube', 'vimeo', 'background_video', 'slideshow',
  'bar_chart', 'line_chart', 'pie_chart', 'table', 'kpi_card', 'progress_bar',
  'social_feed', 'menu_selector', 'promotion_banner',
  'tabs', 'accordion', 'carousel', 'sticky_note', 'frame',
  'calendar', 'rss_feed', 'menu_item', 'special_offer', 'event_countdown'
];

export const ALL_TILES: TileType[] = [
  ...ADVANCED_TILES,
  'typewriter', 'word_art', 'gradient_text', 'animated_text', 'text_shadow',
  'lottie', 'audio', 'webcam',
  'gauge', 'heatmap', 'sparklines', 'timeline',
  'countdown', 'form', 'poll', 'loyalty_card',
  'social_proof', 'testimonial', 'stock_ticker'
];

export const PLAN_CONFIGS: Record<PlanType, PlanLimits> = {
  Free: {
    seats: 1,
    screens: 1,
    deploymentDurationLimit: true,
    allowedTiles: BASIC_TILES,
    price: 0,
    stripePriceId: 'price_free',
    description: 'Perfect for trial and personal use'
  },
  Basic: {
    seats: 1,
    screens: 1,
    deploymentDurationLimit: false,
    allowedTiles: BASIC_TILES,
    price: 29,
    stripePriceId: 'price_basic',
    description: 'Essential tools for single locations',
    addOns: {
      screen: 15,
      screenPriceId: 'price_extra_screen_basic',
      seat: 19,
      seatPriceId: 'price_extra_seat_basic'
    }
  },
  Growth: {
    seats: 2,
    screens: 7,
    deploymentDurationLimit: false,
    allowedTiles: ADVANCED_TILES,
    price: 79,
    stripePriceId: 'price_growth',
    description: 'Advanced features for growing businesses',
    addOns: {
      screen: 13,
      screenPriceId: 'price_extra_screen_growth',
      seat: 15,
      seatPriceId: 'price_extra_seat_growth'
    },
    maxScreens: 25 // Add-on pricing valid up to 25 total screens
  },
  Enterprise: {
    seats: 5,
    screens: 25, // Base includes up to 25, hard capped at 25 for this tier
    deploymentDurationLimit: false,
    allowedTiles: ALL_TILES,
    price: 299,
    stripePriceId: 'price_enterprise',
    description: 'Maximum power for organizations',
    addOns: {
      seat: 10,
      seatPriceId: 'price_extra_seat_enterprise'
    },
    maxScreens: 25
  },
  Franchise: {
    seats: -1, // Custom
    screens: -1, // Unlimited
    deploymentDurationLimit: false,
    allowedTiles: ALL_TILES,
    price: 0, // Contact Sales
    stripePriceId: 'price_franchise',
    description: 'Custom solutions for large chains',
  }
};

export const DEPLOYMENT_DURATION_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
