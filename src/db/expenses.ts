import { db } from './db';
import type { Expense } from './types';

export const EXPENSE_CATEGORIES = [
  'Ingredients',
  'Utilities',
  'Salary',
  'Rent',
  'Transport',
  'Other',
] as const;

export interface ExpenseInput {
  date: string;
  category: string;
  amount: number;
  note?: string;
}

export async function addExpense(input: ExpenseInput): Promise<number> {
  const category = input.category.trim();
  if (!category) throw new Error('Expense category is required.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Expense date is invalid.');
  }

  const expense: Expense = {
    date: input.date,
    category,
    amount: Math.round(input.amount * 100) / 100,
    note: input.note?.trim() || undefined,
  };

  return db.transaction('rw', db.expenses, db.auditLogs, async () => {
    const id = await db.expenses.add(expense);
    await db.auditLogs.add({
      at: Date.now(),
      action: 'expense.add',
      entityId: id,
      meta: { date: expense.date, category, amount: expense.amount },
    });
    return id;
  });
}

export async function deleteExpense(id: number): Promise<void> {
  await db.transaction('rw', db.expenses, db.auditLogs, async () => {
    const expense = await db.expenses.get(id);
    if (!expense) return;
    await db.expenses.delete(id);
    await db.auditLogs.add({
      at: Date.now(),
      action: 'expense.delete',
      entityId: id,
      meta: {
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
      },
    });
  });
}
