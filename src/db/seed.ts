import type { MenuItem, RestaurantTable, Settings } from './types';

export const MENU_CATEGORIES = [
  'Uncategorized',
] as const;

export const SEED_MENU_ITEMS: MenuItem[] = [];

export const SEED_TABLES: RestaurantTable[] = [
  { name: 'T-01', seats: 2 },
  { name: 'T-02', seats: 2 },
  { name: 'T-03', seats: 4 },
  { name: 'T-04', seats: 4 },
  { name: 'T-05', seats: 4 },
  { name: 'T-06', seats: 4 },
  { name: 'T-07', seats: 6 },
  { name: 'T-08', seats: 6 },
  { name: 'T-09', seats: 2 },
  { name: 'T-10', seats: 4 },
  { name: 'T-11', seats: 4 },
  { name: 'T-12', seats: 8 },
];

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  restaurantName: 'Demo Restaurant',
  address: 'Mirpur, Dhaka',
  phone: '01XXXXXXXXX',
  vatPct: 0,
  servicePct: 0,
  roundToTaka: true,
  currencySymbol: '৳',
  receiptFooter: 'Thank you! Please visit again.',
};
