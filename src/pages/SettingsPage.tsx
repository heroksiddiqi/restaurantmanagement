import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Navbar, Page, Toggle } from 'konsta/react';
import {
  Check,
  ChevronRight,
  Database,
  LayoutGrid,
  UtensilsCrossed,
} from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import type { Settings } from '../db/types';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function Field({ label, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
      />
    </label>
  );
}

function NavRow({
  icon: Icon,
  title,
  value,
  onClick,
}: {
  icon: typeof UtensilsCrossed;
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 bg-white px-3 py-3 text-left active:bg-neutral-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-neutral-900">
          {title}
        </span>
        <span className="block text-xs text-neutral-500">{value}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
    </button>
  );
}

function SettingsForm({
  settings,
  menuCount,
  tableCount,
}: {
  settings: Settings;
  menuCount: number;
  tableCount: number;
}) {
  const navigate = useNavigate();

  const [restaurantName, setRestaurantName] = useState(settings.restaurantName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [vat, setVat] = useState(String(settings.vatPct));
  const [service, setService] = useState(String(settings.servicePct));
  const [roundToTaka, setRoundToTaka] = useState(settings.roundToTaka);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function markDirty() {
    setSaved(false);
    setError('');
  }

  async function handleSave() {
    const name = restaurantName.trim();
    if (!name) {
      setError('Restaurant name is required.');
      return;
    }

    const vatPct = vat.trim() === '' ? 0 : Number(vat);
    const servicePct = service.trim() === '' ? 0 : Number(service);

    if (!Number.isFinite(vatPct) || vatPct < 0 || vatPct > 100) {
      setError('VAT must be between 0 and 100.');
      return;
    }
    if (!Number.isFinite(servicePct) || servicePct < 0 || servicePct > 100) {
      setError('Service charge must be between 0 and 100.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await db.settings.put({
        ...settings,
        restaurantName: name,
        phone: phone.trim(),
        address: address.trim(),
        receiptFooter:
          receiptFooter.trim() || 'Thank you, please come again!',
        vatPct,
        servicePct,
        roundToTaka,
      });
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="mx-4 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Restaurant profile
        </h2>
        <div className="space-y-3">
          <Field
            label="Restaurant name"
            type="text"
            value={restaurantName}
            onChange={(event) => {
              markDirty();
              setRestaurantName(event.target.value);
            }}
          />
          <Field
            label="Phone"
            type="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(event) => {
              markDirty();
              setPhone(event.target.value);
            }}
          />
          <Field
            label="Address"
            type="text"
            placeholder="Area, city"
            value={address}
            onChange={(event) => {
              markDirty();
              setAddress(event.target.value);
            }}
          />
          <Field
            label="Receipt footer"
            type="text"
            placeholder="Thank you, please come again!"
            value={receiptFooter}
            onChange={(event) => {
              markDirty();
              setReceiptFooter(event.target.value);
            }}
          />
        </div>
      </section>

      <section className="mx-4 mt-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Charges
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="VAT (%)"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            value={vat}
            onChange={(event) => {
              markDirty();
              setVat(event.target.value);
            }}
          />
          <Field
            label="Service (%)"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            value={service}
            onChange={(event) => {
              markDirty();
              setService(event.target.value);
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Round total to taka
            </p>
            <p className="text-[11px] text-neutral-500">
              Rounds the final bill to the nearest whole taka.
            </p>
          </div>
          <Toggle
            checked={roundToTaka}
            onChange={() => {
              markDirty();
              setRoundToTaka((current) => !current);
            }}
          />
        </div>

        <p className="mt-2 text-[11px] text-neutral-500">
          VAT and service charge are calculated on the bill after discount.
        </p>
      </section>

      {error && (
        <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="mx-4 mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" /> Settings saved.
        </p>
      )}

      <div className="mx-4 mt-3">
        <Button
          large
          className="w-full"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Manage
        </h2>
      </div>

      <div className="mx-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
        <NavRow
          icon={UtensilsCrossed}
          title="Menu items"
          value={`${menuCount} items`}
          onClick={() => navigate('/menu')}
        />
        <NavRow
          icon={LayoutGrid}
          title="Dining tables"
          value={`${tableCount} tables`}
          onClick={() => navigate('/settings/tables')}
        />
        <NavRow
          icon={Database}
          title="Backup & restore"
          value="Export or import local JSON"
          onClick={() => navigate('/settings/data')}
        />
      </div>

      <p className="mx-4 mt-4 pb-4 text-center text-xs leading-relaxed text-neutral-400">
        All data is stored locally in IndexedDB on this device. Export a backup
        regularly.
      </p>
    </>
  );
}

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const menuCount = useLiveQuery(() => db.menuItems.count(), []);
  const tableCount = useLiveQuery(() => db.diningTables.count(), []);

  return (
    <Page className="overflow-x-hidden pb-safe-24">
      <Navbar
        title="Settings"
        subtitle={settings?.restaurantName ?? 'Restaurant POS'}
      />

      {!settings ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading settings…
        </p>
      ) : (
        <SettingsForm
          settings={settings}
          menuCount={menuCount ?? 0}
          tableCount={tableCount ?? 0}
        />
      )}
    </Page>
  );
}
