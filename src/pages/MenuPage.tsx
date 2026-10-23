import { useLiveQuery } from 'dexie-react-hooks';
import {
  Button,
  Dialog,
  DialogButton,
  List,
  ListInput,
  Navbar,
  Page,
  Sheet,
  Toggle,
} from 'konsta/react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../db/db';
import { MENU_CATEGORIES } from '../db/seed';
import type { MenuItem } from '../db/types';
import { formatTaka } from '../lib/money';

const CATEGORY_ORDER: string[] = [...MENU_CATEGORIES];

interface MenuForm {
  id?: number;
  code: string;
  name: string;
  category: string;
  price: string;
  cost: string;
  active: boolean;
}

const EMPTY_FORM: MenuForm = {
  code: '',
  name: '',
  category: CATEGORY_ORDER[0] ?? 'Uncategorized',
  price: '',
  cost: '',
  active: true,
};

function sortCategories(a: string, b: string): number {
  const indexA = CATEGORY_ORDER.indexOf(a);
  const indexB = CATEGORY_ORDER.indexOf(b);
  return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
}

export function MenuPage() {
  const items = useLiveQuery(() => db.menuItems.orderBy('code').toArray(), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MenuForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const allItems = useMemo(() => items ?? [], [items]);

  const categories = useMemo(() => {
    const names = new Set<string>(CATEGORY_ORDER);
    for (const item of allItems) names.add(item.category);
    return Array.from(names);
  }, [allItems]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery =
        needle.length === 0 ||
        item.name.toLowerCase().includes(needle) ||
        item.code.includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [allItems, category, query]);

  const groups = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      const group = map.get(item.category);
      if (group) group.push(item);
      else map.set(item.category, [item]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => sortCategories(a, b));
  }, [filtered]);

  const activeCount = allItems.filter((item) => item.active).length;

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      category: category === 'All' ? (categories[0] ?? 'Uncategorized') : category,
    });
    setError('');
    setFormOpen(true);
  }

  function openEdit(item: MenuItem) {
    setForm({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      price: String(item.price),
      cost: String(item.cost),
      active: item.active,
    });
    setError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setError('');
  }

  async function toggleActive(item: MenuItem) {
    if (item.id == null) return;
    await db.menuItems.update(item.id, { active: !item.active });
  }

  async function handleSave() {
    const code = form.code.trim();
    const name = form.name.trim();
    const categoryName = form.category.trim() || 'Uncategorized';
    const price = Number(form.price);
    const cost = form.cost.trim() === '' ? 0 : Number(form.cost);

    if (!code) {
      setError('Menu code is required.');
      return;
    }
    if (!name) {
      setError('Item name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be a valid number.');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError('Cost must be a valid number.');
      return;
    }

    const duplicate = await db.menuItems.where('code').equals(code).first();
    if (duplicate && duplicate.id !== form.id) {
      setError(`Code ${code} is already used by ${duplicate.name}.`);
      return;
    }

    const payload: MenuItem = {
      code,
      name,
      category: categoryName,
      price,
      cost,
      active: form.active,
    };

    try {
      if (form.id != null) {
        await db.menuItems.update(form.id, payload);
      } else {
        await db.menuItems.add(payload);
      }
      setFormOpen(false);
      setError('');
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save item.',
      );
    }
  }

  async function handleDelete() {
    if (deleteTarget?.id != null) {
      await db.menuItems.delete(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  return (
    <Page className="overflow-x-hidden pb-safe-24">
      <Navbar
        title="Menu"
        subtitle={`${activeCount} active of ${allItems.length} items`}
        right={
          <Button small onClick={openCreate}>
            Add
          </Button>
        }
      />

      <div className="relative mx-4 mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or code"
          inputMode="search"
          className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
        />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {['All', ...categories].map((name) => {
          const isActive = category === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {!items ? (
        <p className="px-4 py-6 text-sm text-neutral-500">Loading menu…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <p className="text-sm font-medium text-neutral-700">No menu items found</p>
          <p className="text-xs text-neutral-500">
            Adjust the search or add a new item with its code, price and cost.
          </p>
          <Button small onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </div>
      ) : (
        <div className="pb-2">
          {groups.map(([groupName, groupItems]) => (
            <section key={groupName}>
              <h2 className="mb-1 mt-4 px-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                {groupName} · {groupItems.length}
              </h2>
              <div className="divide-y divide-neutral-100 border-y border-neutral-100 bg-white">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      item.active ? '' : 'opacity-50'
                    }`}
                  >
                    <span className="w-12 shrink-0 rounded-lg bg-neutral-100 py-1 text-center text-xs font-semibold tabular-nums text-neutral-600">
                      {item.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {formatTaka(item.price)}
                        <span className="text-neutral-300"> · </span>
                        cost {formatTaka(item.cost)}
                      </p>
                    </button>
                    <Toggle
                      checked={item.active}
                      onChange={() => void toggleActive(item)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Sheet
        opened={formOpen}
        onBackdropClick={closeForm}
        className="z-50 max-h-[88dvh]"
      >
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 className="text-base font-semibold text-neutral-900">
              {form.id != null ? 'Edit menu item' : 'New menu item'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <List strong inset>
              <ListInput
                label="Code"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 106"
                value={form.code}
                onInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
              <ListInput
                label="Name"
                type="text"
                placeholder="e.g. Chicken Curry"
                value={form.name}
                onInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <ListInput
                label="Price (৳)"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                placeholder="0"
                value={form.price}
                onInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
              />
              <ListInput
                label="Cost (৳)"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                placeholder="0"
                value={form.cost}
                onInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    cost: event.target.value,
                  }))
                }
              />
            </List>

            <div className="mx-4 mt-4">
              <label
                htmlFor="menu-category"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500"
              >
                Category
              </label>
              <select
                id="menu-category"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600"
              >
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="Uncategorized">Uncategorized</option>
              </select>
            </div>

            <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <div>
                <p className="text-sm font-medium text-neutral-900">Available</p>
                <p className="text-xs text-neutral-500">
                  Inactive items stay hidden on the order screen.
                </p>
              </div>
              <Toggle
                checked={form.active}
                onChange={() =>
                  setForm((current) => ({ ...current, active: !current.active }))
                }
              />
            </div>

            {error && (
              <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 px-4 py-3 pb-safe-3">
            <Button large onClick={() => void handleSave()} className="w-full">
              Save item
            </Button>
            {form.id != null && (
              <button
                type="button"
                onClick={() => {
                  const item = allItems.find((entry) => entry.id === form.id);
                  closeForm();
                  if (item) setDeleteTarget(item);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-red-600 active:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete item
              </button>
            )}
          </div>
        </div>
      </Sheet>

      <Dialog
        opened={deleteTarget != null}
        onBackdropClick={() => setDeleteTarget(null)}
        title="Delete menu item?"
        content={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the menu. Past orders keep their records.`
            : ''
        }
        buttons={
          <>
            <DialogButton onClick={() => setDeleteTarget(null)}>
              Cancel
            </DialogButton>
            <DialogButton strong onClick={() => void handleDelete()}>
              Delete
            </DialogButton>
          </>
        }
      />
    </Page>
  );
}
