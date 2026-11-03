export interface MenuItem {
  id?: number;
  code: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  active: boolean;
}

export interface RestaurantTable {
  id?: number;
  name: string;
  seats: number;
}

export type OrderStatus = 'unpaid' | 'due' | 'paid' | 'void';
export type OrderType = 'dine-in' | 'parcel' | 'counter';
export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'card' | 'due';
export type DiscountType = 'percent' | 'fixed';

export interface OrderItem {
  menuItemId: number;
  code: string;
  name: string;
  unitPrice: number;
  unitCost: number;
  qty: number;
  note?: string;
}

export interface Order {
  id?: number;
  orderNo: string;
  tableId?: number;
  tableName?: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discount: number;
  vatPct: number;
  servicePct: number;
  vat: number;
  service: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paidAmount: number;
  cashReceived?: number;
  change?: number;
  dueCustomer?: string;
  customerPhone?: string;
  note?: string;
  createdAt: number;
  updatedAt?: number;
  paidAt?: number;
  voidReason?: string;
  voidAt?: number;
}

export interface Expense {
  id?: number;
  date: string;
  category: string;
  amount: number;
  note?: string;
}

export interface DayClose {
  id?: number;
  date: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number;
  note?: string;
  closedAt: number;
}

export interface Settings {
  id: 'app';
  restaurantName: string;
  address: string;
  phone: string;
  vatPct: number;
  servicePct: number;
  roundToTaka: boolean;
  currencySymbol: string;
  receiptFooter: string;
}

export interface AuditLog {
  id?: number;
  at: number;
  action: string;
  entityId?: number;
  meta?: unknown;
}
