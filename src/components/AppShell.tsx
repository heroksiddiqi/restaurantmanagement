import {
  ChartColumn,
  ClipboardList,
  ReceiptText,
  Settings as SettingsIcon,
  UtensilsCrossed,
} from 'lucide-react';
import {
  App,
  Tabbar,
  TabbarLink,
  ToolbarPane,
} from 'konsta/react';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DataPage } from '../pages/DataPage';
import { MenuPage } from '../pages/MenuPage';
import { OrderEntryPage } from '../pages/OrderEntryPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ReceiptPage } from '../pages/ReceiptPage';
import { SettingsPage } from '../pages/SettingsPage';

const ReportsPage = lazy(() =>
  import('../pages/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
);

const tabs = [
  { path: '/order', label: 'Order', icon: ClipboardList },
  { path: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { path: '/orders', label: 'History', icon: ReceiptText },
  { path: '/reports', label: 'Reports', icon: ChartColumn },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideTabbar = location.pathname.startsWith('/receipt/');

  return (
    <App
      theme="material"
      className="mx-auto min-h-dvh w-full max-w-md bg-white shadow-xl"
    >
      <Suspense
        fallback={
          <p className="px-4 py-10 text-center text-sm text-neutral-500">
            Loading…
          </p>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/order" replace />} />
          <Route path="/tables" element={<Navigate to="/order" replace />} />
          <Route path="/order" element={<OrderEntryPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/receipt/:orderId" element={<ReceiptPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/order" replace />} />
        </Routes>
      </Suspense>

      {!hideTabbar && (
        <Tabbar
          labels
          icons
          outline
          className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2"
        >
          <ToolbarPane>
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
                  className="min-w-0 flex-1 px-0"
                  icon={<Icon className="h-6 w-6" />}
                  label={tab.label}
                />
              );
            })}
          </ToolbarPane>
        </Tabbar>
      )}
    </App>
  );
}
