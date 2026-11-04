import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ReceiptText,
  Settings as SettingsIcon,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { App, Tabbar, TabbarLink } from 'konsta/react';
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ExpensePage } from '../pages/ExpensePage';
import { HistoryPage } from '../pages/HistoryPage';
import { ReportsPage } from '../pages/ReportsPage';
import { DataPage } from '../pages/DataPage';
import { MenuPage } from '../pages/MenuPage';
import { OrderEntryPage } from '../pages/OrderEntryPage';
import { ReceiptPage } from '../pages/ReceiptPage';
import { SettingsPage } from '../pages/SettingsPage';

const tabs = [
  { path: '/order', label: 'Order', icon: ClipboardList },
  { path: '/expense', label: 'Expense', icon: Wallet },
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/history', label: 'History', icon: ReceiptText },
  { path: '/reports', label: 'Reports', icon: ChartColumn },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

/** Konsta ignores ToolbarPane's className in the material theme, so the scroll
 *  pane is identified by the class we pass through Tabbar's innerClassName. */
function tabbarPane(bar: HTMLElement | null): HTMLElement | null {
  return bar?.querySelector<HTMLElement>('.tabbar-scroll') ?? null;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideTabbar = location.pathname.startsWith('/receipt/');

  const tabbarRef = useRef<HTMLElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const syncEdges = useCallback(() => {
    const pane = tabbarPane(tabbarRef.current);
    if (!pane) return;

    const left = pane.scrollLeft > 2;
    const right =
      pane.scrollLeft + pane.clientWidth < pane.scrollWidth - 2;

    setEdges((previous) =>
      previous.left === left && previous.right === right
        ? previous
        : { left, right },
    );
  }, []);

  useLayoutEffect(() => {
    const pane = tabbarPane(tabbarRef.current);
    if (!pane) return;

    syncEdges();
    pane.addEventListener('scroll', syncEdges, { passive: true });
    pane.addEventListener('scrollend', syncEdges);

    const observer = new ResizeObserver(syncEdges);
    observer.observe(pane);

    return () => {
      pane.removeEventListener('scroll', syncEdges);
      pane.removeEventListener('scrollend', syncEdges);
      observer.disconnect();
    };
  }, [syncEdges, hideTabbar]);

  // Keep the active tab in view, e.g. when opening Settings directly.
  useLayoutEffect(() => {
    if (hideTabbar) return;
    const pane = tabbarPane(tabbarRef.current);
    if (!pane) return;

    const active = pane.querySelector<HTMLElement>('a.k-tabbar-link-active');
    if (!active) return;

    const tabLeft = active.offsetLeft;
    const tabRight = tabLeft + active.offsetWidth;
    const paneLeft = pane.scrollLeft;
    const paneRight = paneLeft + pane.clientWidth;

    // Only move the bar when the active tab is actually hidden.
    if (tabLeft >= paneLeft && tabRight <= paneRight) return;

    const target =
      tabRight > paneRight ? tabRight - pane.clientWidth : tabLeft;
    pane.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });  }, [location.pathname, hideTabbar]);

  return (
    <App
      theme="material"
      className="mx-auto min-h-dvh w-full max-w-md bg-white shadow-xl"
    >
      <Routes>
        <Route path="/" element={<Navigate to="/order" replace />} />
        <Route path="/tables" element={<Navigate to="/order" replace />} />
        <Route path="/orders" element={<Navigate to="/history" replace />} />
        <Route path="/order" element={<OrderEntryPage />} />
        <Route path="/expense" element={<ExpensePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/receipt/:orderId" element={<ReceiptPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/data" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/order" replace />} />
      </Routes>

      {!hideTabbar && (
        <>
          <Tabbar
            ref={tabbarRef}
            labels
            icons
            outline
            innerClassName="tabbar-scroll"
            className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active =
                location.pathname === tab.path ||
                location.pathname.startsWith(`${tab.path}/`);

              return (
                <TabbarLink
                  key={tab.path}
                  active={active}
                  onClick={() => navigate(tab.path)}
                  className="w-1/5 flex-none px-0"
                  icon={<Icon className="h-6 w-6" />}
                  label={tab.label}
                />
              );
            })}
          </Tabbar>

          {/*
           * Swipe affordance: a soft fade plus a nudging chevron on whichever
           * side still has hidden tabs. pointer-events-none keeps taps going
           * through to the tab underneath.
           */}
          <div className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 pb-[env(safe-area-inset-bottom)]">
            <div className="relative h-20">
              {edges.left && (
                <div className="tabbar-fade-left absolute inset-y-0 left-0 flex w-5 items-center justify-start">
                  <ChevronLeft className="tabbar-hint tabbar-hint-left h-4 w-4 text-neutral-500" />
                </div>
              )}
              {edges.right && (
                <div className="tabbar-fade-right absolute inset-y-0 right-0 flex w-5 items-center justify-end">
                  <ChevronRight className="tabbar-hint h-4 w-4 text-emerald-700" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </App>
  );
}
