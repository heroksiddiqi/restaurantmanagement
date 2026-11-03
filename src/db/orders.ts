import { calculateBill, calculateChange } from '../lib/bill';
import {
  buildOrderNo,
  endOfLocalDay,
  nextOrderNo,
  parseOrderSequence,
  startOfLocalDay,
} from '../lib/orderNo';
import { db } from './db';
import type {
  MenuItem,
  Order,
  OrderItem,
  OrderType,
  Settings,
} from './types';

export interface CreateOrderInput {
  tableId?: number;
  tableName?: string;
  type: OrderType;
}

export interface MenuSelection {
  item: MenuItem;
  qty: number;
}

export interface PaymentInput {
  discount: number;
  note: string;
}

export interface DueInput extends PaymentInput {
  customerName: string;
  phone: string;
}

function billSettings(settings: Settings | undefined, order: Order) {
  return {
    vatPct: settings?.vatPct ?? order.vatPct,
    servicePct: settings?.servicePct ?? order.servicePct,
    roundToTaka: settings?.roundToTaka ?? true,
  };
}

function applyTotals(order: Order, settings?: Settings): Order {
  const percentages = billSettings(settings, order);
  const totals = calculateBill(
    order.items.map((line) => ({
      price: line.unitPrice,
      cost: line.unitCost,
      qty: line.qty,
    })),
    order.discount,
    percentages,
  );

  return {
    ...order,
    subtotal: totals.subtotal,
    discount: totals.discount,
    vatPct: percentages.vatPct,
    servicePct: percentages.servicePct,
    vat: totals.vat,
    service: totals.service,
    total: totals.total,
    updatedAt: Date.now(),
  };
}

function toOrderItem(item: MenuItem, qty: number) {
  if (item.id == null) throw new Error('Menu item must have an id');
  return {
    menuItemId: item.id,
    code: item.code,
    name: item.name,
    unitPrice: item.price,
    unitCost: item.cost,
    qty,
  };
}

async function audit(
  action: string,
  entityId: number,
  meta?: Record<string, unknown>,
): Promise<void> {
  await db.auditLogs.add({
    at: Date.now(),
    action,
    entityId,
    meta,
  });
}

async function generateOrderNo(timestamp: number): Promise<string> {
  const dayStart = startOfLocalDay(timestamp);
  const dayEnd = endOfLocalDay(timestamp);
  const todaysOrders = await db.orders
    .where('createdAt')
    .between(dayStart, dayEnd, true, false)
    .toArray();

  let orderNo = nextOrderNo(
    todaysOrders.map((order) => order.orderNo),
    timestamp,
  );
  let guard = 0;
  while (guard < 10 && (await db.orders.where('orderNo').equals(orderNo).count())) {
    const sequence = parseOrderSequence(orderNo) ?? 0;
    orderNo = buildOrderNo(timestamp, sequence + 1);
    guard += 1;
  }
  return orderNo;
}

export async function getOpenOrderForTable(
  tableId: number,
): Promise<Order | undefined> {
  return db.orders
    .where('tableId')
    .equals(tableId)
    .filter((order) => order.status === 'unpaid')
    .first();
}

export async function createOrder(input: CreateOrderInput): Promise<number> {
  const timestamp = Date.now();
  const settings = await db.settings.get('app');

  return db.transaction('rw', db.orders, db.auditLogs, async () => {
    const orderNo = await generateOrderNo(timestamp);

    const order: Order = {
      orderNo,
      tableId: input.tableId,
      tableName: input.tableName,
      type: input.type,
      status: 'unpaid',
      items: [],
      subtotal: 0,
      discountType: 'fixed',
      discountValue: 0,
      discount: 0,
      vatPct: settings?.vatPct ?? 0,
      servicePct: settings?.servicePct ?? 0,
      vat: 0,
      service: 0,
      total: 0,
      paidAmount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const id = await db.orders.add(order);
    await audit('order.create', id, {
      orderNo,
      type: input.type,
      table: input.tableName,
    });
    return id;
  });
}

export async function addSelections(
  orderId: number,
  selections: MenuSelection[],
  settings?: Settings,
): Promise<void> {
  await db.transaction('rw', db.orders, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status !== 'unpaid') return;

    for (const selection of selections) {
      if (selection.item.id == null || selection.qty <= 0) continue;
      const existing = order.items.find(
        (line) => line.menuItemId === selection.item.id,
      );
      if (existing) existing.qty += selection.qty;
      else order.items.push(toOrderItem(selection.item, selection.qty));
    }

    await db.orders.put(applyTotals(order, settings));
  });
}

export async function setItemQty(
  orderId: number,
  menuItemId: number,
  qty: number,
  settings?: Settings,
): Promise<void> {
  await db.transaction('rw', db.orders, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status !== 'unpaid') return;

    if (qty <= 0) {
      order.items = order.items.filter(
        (line) => line.menuItemId !== menuItemId,
      );
    } else {
      const line = order.items.find((item) => item.menuItemId === menuItemId);
      if (line) line.qty = qty;
    }

    await db.orders.put(applyTotals(order, settings));
  });
}

export async function removeItem(
  orderId: number,
  menuItemId: number,
  settings?: Settings,
): Promise<void> {
  await setItemQty(orderId, menuItemId, 0, settings);
}

export async function clearItems(
  orderId: number,
  settings?: Settings,
): Promise<void> {
  await db.transaction('rw', db.orders, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status !== 'unpaid') return;
    order.items = [];
    order.discount = 0;
    order.discountValue = 0;
    await db.orders.put(applyTotals(order, settings));
    if (order.id != null) await audit('order.clear', order.id);
  });
}

export async function markOrderPaid(
  orderId: number,
  input: PaymentInput & { cashReceived: number },
  settings?: Settings,
): Promise<Order | null> {
  return db.transaction('rw', db.orders, db.auditLogs, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status !== 'unpaid') return null;

    const timestamp = Date.now();
    const priced = applyTotals(
      {
        ...order,
        discount: input.discount,
        discountValue: input.discount,
        discountType: 'fixed',
        note: input.note || order.note,
      },
      settings,
    );

    const paid: Order = {
      ...priced,
      status: 'paid',
      paymentMethod: 'cash',
      paidAmount: priced.total,
      cashReceived: input.cashReceived,
      change: calculateChange(input.cashReceived, priced.total),
      paidAt: timestamp,
      updatedAt: timestamp,
    };

    await db.orders.put(paid);
    await audit('order.paid', orderId, {
      orderNo: paid.orderNo,
      total: paid.total,
      cashReceived: paid.cashReceived,
    });
    return paid;
  });
}

export async function markOrderDue(
  orderId: number,
  input: DueInput,
  settings?: Settings,
): Promise<Order | null> {
  return db.transaction('rw', db.orders, db.auditLogs, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status !== 'unpaid') return null;

    const timestamp = Date.now();
    const priced = applyTotals(
      {
        ...order,
        discount: input.discount,
        discountValue: input.discount,
        discountType: 'fixed',
        note: input.note || order.note,
      },
      settings,
    );

    const due: Order = {
      ...priced,
      status: 'due',
      paymentMethod: 'due',
      paidAmount: 0,
      dueCustomer: input.customerName || undefined,
      customerPhone: input.phone || undefined,
      updatedAt: timestamp,
    };

    await db.orders.put(due);
    await audit('order.due', orderId, {
      orderNo: due.orderNo,
      total: due.total,
      customer: due.dueCustomer,
    });
    return due;
  });
}

export async function collectDue(orderId: number): Promise<Order | null> {
  return db.transaction('rw', db.orders, db.auditLogs, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status !== 'due') return null;

    const timestamp = Date.now();
    const paid: Order = {
      ...order,
      status: 'paid',
      paymentMethod: 'cash',
      paidAmount: order.total,
      cashReceived: order.total,
      change: 0,
      paidAt: timestamp,
      updatedAt: timestamp,
    };

    await db.orders.put(paid);
    await audit('order.collect', orderId, {
      orderNo: paid.orderNo,
      total: paid.total,
    });
    return paid;
  });
}

export async function voidOrder(
  orderId: number,
  reason: string,
): Promise<Order | null> {
  return db.transaction('rw', db.orders, db.auditLogs, async () => {
    const order = await db.orders.get(orderId);
    if (!order || order.status === 'void') return null;

    const timestamp = Date.now();
    const voided: Order = {
      ...order,
      status: 'void',
      voidReason: reason || 'Cancelled by staff',
      voidAt: timestamp,
      updatedAt: timestamp,
    };

    await db.orders.put(voided);
    await audit('order.void', orderId, {
      orderNo: voided.orderNo,
      reason: voided.voidReason,
    });
    return voided;
  });
}

export async function deleteOrder(orderId: number): Promise<void> {
  await db.orders.delete(orderId);
}

export interface CounterOrderInput {
  /** Final bill amount in taka, as quoted at the counter. */
  amount: number;
  /** Optional menu items for reference on the bill. */
  items?: MenuSelection[];
}

export async function createCounterOrder(
  input: CounterOrderInput,
): Promise<Order> {
  const timestamp = Date.now();
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Bill amount must be greater than zero.');
  }

  const items: OrderItem[] = [];
  for (const selection of input.items ?? []) {
    if (selection.item.id == null || selection.qty <= 0) continue;
    items.push(toOrderItem(selection.item, selection.qty));
  }

  return db.transaction('rw', db.orders, db.auditLogs, async () => {
    const orderNo = await generateOrderNo(timestamp);

    const order: Order = {
      orderNo,
      type: 'counter',
      status: 'paid',
      items,
      subtotal: amount,
      discountType: 'fixed',
      discountValue: 0,
      discount: 0,
      vatPct: 0,
      servicePct: 0,
      vat: 0,
      service: 0,
      total: amount,
      paymentMethod: 'cash',
      paidAmount: amount,
      cashReceived: amount,
      change: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      paidAt: timestamp,
    };

    const id = await db.orders.add(order);
    await audit('order.counter', id, {
      orderNo,
      total: amount,
      itemCount: items.reduce((sum, line) => sum + line.qty, 0),
    });
    return { ...order, id };
  });
}

export async function cleanupEmptyOrders(): Promise<void> {
  const empty = await db.orders
    .where('status')
    .equals('unpaid')
    .filter((order) => order.items.length === 0)
    .toArray();

  const ids = empty
    .map((order) => order.id)
    .filter((id): id is number => id != null);

  if (ids.length > 0) await db.orders.bulkDelete(ids);
}
