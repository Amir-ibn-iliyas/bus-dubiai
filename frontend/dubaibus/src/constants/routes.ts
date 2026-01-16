/**
 * Route Names Constants
 *
 * Usage: import { routes } from '@/constants';
 * Example: router.push(routes.bus.details('8'));
 */

export const routes = {
  home: "/",

  bus: {
    index: "/bus",
    details: (id: string) => `/bus/${id}` as const,
  },

  metro: {
    index: "/metro",
    details: (id: string) => `/metro/${id}` as const,
  },

  journey: {
    index: "/journey",
    details: "/journey/details",
  },
} as const;

// Screen titles
export const screenTitles = {
  home: "Dubai Transit",
  bus: {
    index: "Bus",
    details: "Bus Details",
    search: "Search Bus",
  },
  metro: {
    index: "Metro",
    details: "Metro Line",
  },
  journey: {
    index: "Journey Planner",
    details: "Journey Path",
  },
} as const;
