import { useLiveQuery } from 'dexie-react-hooks';
import {
  Actions,
  ActionsButton,
  ActionsGroup,
  ActionsLabel,
  Dialog,
  DialogButton,
  Navbar,
  NavbarBackLink,
  Page,
} from 'konsta/react';
import {
  EllipsisVertical,
  ReceiptText,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BillSheet } from '../components/BillSheet';
import { CancelOrderDialog } from '../components/CancelOrderDialog';
import { CartBar } from '../components/CartBar';
import { CartSheet } from '../components/CartSheet';
import { MenuGrid } from '../components/MenuGrid';
import { QuickKeypad } from '../components/QuickKeypad';
import { db } from '../db/db';
import {
  addSelections,
  clearItems,
  deleteOrder,
  removeItem,
  setItemQty,
} from '../db/orders';
import { MENU_CATEGORIES } from '../db/seed';
import type { MenuItem } from '../db/types';
import { tapFeedback } from '../lib/haptics';
import { resolveKeypad } from '../lib/keypad';
import { formatTaka } from '../lib/money';

const CATEGORY_ORDER: string[] = [...MENU_CATEGORIES];

function sortCategories(a: string, b: string): number {
  const indexA = CATEGORY_ORDER.indexOf(a);
  const indexB = CATEGORY_ORDER.indexOf(b);
  return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
}

export function OrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const id = Number(orderId);

  const order = useLiveQuery(() => db.orders.get(id), [id]);
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const menuItems = useLiveQuery(
    () => db.menuItems.orderBy('code').toArray(),
    [],
  );

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [keypad, setKeypad] = useState('');
  const [keypadError, setKeypadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const activeItems = useMemo(
    () => (menuItems ?? []).filter((item) => item.active),
    [menuItems],
  );

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of activeItems) names.add(item.category);
    return Array.from(names).sort(sortCategories);
  }, [activeItems]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeItems.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery =
        needle.length === 0 ||
        item.name.toLowerCase().includes(needle) ||
        item.code.includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [activeItems, category, query]);

  const quantities = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of order?.items ?? []) map.set(line.menuItemId, line.qty);
    return map;
  }, [order]);

  const itemCount = order?.items.reduce((sum, line) => sum + line.qty, 0) ?? 0;
  const editable = order?.status === 'unpaid';

  function run(task: Promise<unknown>) {
    task.catch((error: unknown) => {
      setActionError(
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    });
  }

  function handleAdd(item: MenuItem) {
    if (order?.id == null || !editable) return;
    tapFeedback();
    setActionError('');
    run(addSelections(order.id, [{ item, qty: 1 }], settings));
  }

  function handleQtyChange(menuItemId: number, qty: number) {
    if (order?.id == null) return;
    run(setItemQty(order.id, menuItemId, qty, settings));
  }

  function handleRemove(menuItemId: number) {
    if (order?.id == null) return;
    run(removeItem(order.id, menuItemId, settings));
  }

  function handleKeypadSubmit() {
    if (order?.id == null || !editable) return;
    const inbox = keypad.trim();
    if (!inbox) return;

    const knownCodes = new Set(activeItems.map((item) => item.code));
    const result = resolveKeypad(inbox, knownCodes);
    const problems = [
      ...result.unknown.map((code) => `Unknown code ${code}`),
      ...result.invalid.map((token) => `Invalid "${token}"`),
    ];

    if (problems.length > 0) {
      setKeypadError(problems.join(' · '));
      return;
    }

    const selections = result.entries.map((entry) => ({
      item: activeItems.find((item) => item.code === entry.code) as MenuItem,
      qty: entry.qty,
    }));

    setKeypad('');
    setKeypadError('');
    setActionError('');
    tapFeedback();
    run(addSelections(order.id, selections, settings));
  }

  async function handleBack() {
    if (order?.id != null && order.status === 'unpaid' && order.items.length === 0) {
      await deleteOrder(order.id);
    }
    navigate('/tables', { replace: true });
  }

  async function handleClear() {
    if (order?.id == null) return;
    await clearItems(order.id, settings);
    setClearOpen(false);
    setActionOpen(false);
    setCartOpen(false);
  }

  function handleDone() {
    if (order?.id == null) return;
    setBillOpen(false);
    navigate(`/receipt/${order.id}`, { replace: true });
  }

  if (!order) {
    return (
      <Page>
        <Navbar
          title="Order"
          left={
            <NavbarBackLink
              text="Back"
              showText
              onClick={() => navigate('/tables')}
            />
          }
        />
        <p className="px-4 py-10 text-center text-sm text-neutral-500">
          Loading order…
        </p>
      </Page>
    );
  }

  return (
    <Page className="overflow-x-hidden pb-28">
      <Navbar
        title={order.tableName ?? 'Parcel'}
        subtitle={order.orderNo}
        left={
          <NavbarBackLink text="Back" showText onClick={() => void handleBack()} />
        }
        right={
          <button
            type="button"
            onClick={() => setActionOpen(true)}
            aria-label="Order actions"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 active:bg-neutral-100"
          >
            <EllipsisVertical className="h-5 w-5" />
          </button>
        }
      />

      {!editable && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              This order is {order.status}
            </p>
            <p className="text-xs text-amber-700">
              {order.orderNo} · {formatTaka(order.total)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/receipt/${order.id}`)}
            className="flex items-center gap-1 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white active:bg-amber-800"
          >
            <ReceiptText className="h-3.5 w-3.5" /> Receipt
          </button>
        </div>
      )}

      {editable && (
        <>
          <div className="mx-4 mt-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or code"
                inputMode="search"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <QuickKeypad
              value={keypad}
              error={keypadError}
              onChange={(value) => {
                setKeypad(value);
                setKeypadError('');
              }}
              onSubmit={handleKeypadSubmit}
            />
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {['All', ...categories].map((name) => {
              const selected = category === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {actionError && (
            <p className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {actionError}
            </p>
          )}

          <div className="mt-3 pb-2">
            {!menuItems ? (
              <p className="px-4 py-6 text-sm text-neutral-500">Loading menu…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-neutral-500">
                No menu items match this search.
              </p>
            ) : (
              <MenuGrid
                items={filtered}
                quantities={quantities}
                onAdd={handleAdd}
              />
            )}
          </div>

          <CartBar
            count={itemCount}
            total={order.total}
            onReview={() => setCartOpen(true)}
          />
        </>
      )}

      <CartSheet
        opened={cartOpen}
        order={order}
        onClose={() => setCartOpen(false)}
        onReview={() => {
          setCartOpen(false);
          setBillOpen(true);
        }}
        onQtyChange={handleQtyChange}
        onRemove={handleRemove}
      />

      {billOpen && (
        <BillSheet
          opened
          order={order}
          settings={settings}
          onClose={() => setBillOpen(false)}
          onDone={handleDone}
        />
      )}

      <Actions
        opened={actionOpen}
        onBackdropClick={() => setActionOpen(false)}
        className="z-50"
      >
        <ActionsGroup>
          <ActionsLabel>{order.orderNo}</ActionsLabel>
          {editable && (
            <>
              <ActionsButton
                bold
                onClick={() => {
                  setActionOpen(false);
                  setBillOpen(true);
                }}
              >
                Review bill
              </ActionsButton>
              <ActionsButton
                onClick={() => {
                  setActionOpen(false);
                  setCartOpen(true);
                }}
              >
                Current items
              </ActionsButton>
              <ActionsButton
                className="text-red-600"
                onClick={() => {
                  setActionOpen(false);
                  setClearOpen(true);
                }}
              >
                Clear all items
              </ActionsButton>
              <ActionsButton
                className="text-red-600"
                onClick={() => {
                  setActionOpen(false);
                  setCancelOpen(true);
                }}
              >
                Cancel order
              </ActionsButton>
            </>
          )}
          {!editable && (
            <ActionsButton
              bold
              onClick={() => {
                setActionOpen(false);
                navigate(`/receipt/${order.id}`);
              }}
            >
              View receipt
            </ActionsButton>
          )}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setActionOpen(false)}>
            Close
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <Dialog
        opened={clearOpen}
        onBackdropClick={() => setClearOpen(false)}
        title="Clear all items?"
        content="Every item in this order will be removed. The table stays open."
        buttons={
          <>
            <DialogButton onClick={() => setClearOpen(false)}>
              Keep items
            </DialogButton>
            <DialogButton strong onClick={() => void handleClear()}>
              Clear
            </DialogButton>
          </>
        }
      />

      <CancelOrderDialog
        order={cancelOpen ? order : null}
        onClose={() => setCancelOpen(false)}
        onDone={() => navigate('/tables', { replace: true })}
      />
    </Page>
  );
}
