import type { MenuItem, RestaurantTable, Settings } from './types';

export const MENU_CATEGORIES = [
  'Rice',
  'Curry',
  'Bhuna',
  'Kabab',
  'Bread',
  'Drinks',
  'Dessert',
] as const;

export const SEED_MENU_ITEMS: MenuItem[] = [
  { code: '101', name: 'Plain Rice', category: 'Rice', price: 30, cost: 10, active: true },
  { code: '102', name: 'Vegetable Polao', category: 'Rice', price: 90, cost: 35, active: true },
  { code: '103', name: 'Chicken Fried Rice', category: 'Rice', price: 150, cost: 70, active: true },
  { code: '104', name: 'Khichuri', category: 'Rice', price: 120, cost: 50, active: true },

  { code: '201', name: 'Chicken Curry', category: 'Curry', price: 160, cost: 80, active: true },
  { code: '202', name: 'Beef Curry', category: 'Curry', price: 220, cost: 120, active: true },
  { code: '203', name: 'Mutton Curry', category: 'Curry', price: 280, cost: 160, active: true },
  { code: '204', name: 'Fish Curry', category: 'Curry', price: 180, cost: 100, active: true },
  { code: '205', name: 'Egg Curry', category: 'Curry', price: 80, cost: 35, active: true },
  { code: '206', name: 'Dal', category: 'Curry', price: 60, cost: 20, active: true },

  { code: '301', name: 'Chicken Bhuna', category: 'Bhuna', price: 180, cost: 90, active: true },
  { code: '302', name: 'Beef Bhuna', category: 'Bhuna', price: 240, cost: 130, active: true },
  { code: '303', name: 'Mutton Bhuna', category: 'Bhuna', price: 300, cost: 170, active: true },

  { code: '401', name: 'Chicken Tikka', category: 'Kabab', price: 180, cost: 95, active: true },
  { code: '402', name: 'Seekh Kabab', category: 'Kabab', price: 200, cost: 110, active: true },
  { code: '403', name: 'Chicken Wings', category: 'Kabab', price: 160, cost: 85, active: true },

  { code: '501', name: 'Naan', category: 'Bread', price: 30, cost: 10, active: true },
  { code: '502', name: 'Paratha', category: 'Bread', price: 25, cost: 8, active: true },
  { code: '503', name: 'Tandoori Roti', category: 'Bread', price: 15, cost: 5, active: true },

  { code: '601', name: 'Mineral Water', category: 'Drinks', price: 20, cost: 12, active: true },
  { code: '602', name: 'Soft Drink', category: 'Drinks', price: 40, cost: 25, active: true },
  { code: '603', name: 'Borhani', category: 'Drinks', price: 60, cost: 25, active: true },
  { code: '604', name: 'Tea', category: 'Drinks', price: 20, cost: 7, active: true },
  { code: '605', name: 'Lassi', category: 'Drinks', price: 80, cost: 35, active: true },

  { code: '701', name: 'Firni', category: 'Dessert', price: 80, cost: 30, active: true },
  { code: '702', name: 'Jilapi', category: 'Dessert', price: 60, cost: 25, active: true },
];

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
