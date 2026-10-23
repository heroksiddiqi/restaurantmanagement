import { useLiveQuery } from 'dexie-react-hooks';
import {
  Button,
  Dialog,
  DialogButton,
  Navbar,
  NavbarBackLink,
  Page,
} from 'konsta/react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  Upload,
} from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBackup, restoreBackup } from '../db/backup';
import { db } from '../db/db';
import type { BackupFile } from '../lib/backup';
import { backupFileName, parseBackup } from '../lib/backup';

export function DataPage() {
  const navigate = useNavigate();
  const counts = useLiveQuery(async () => {
    const [menuItems, tables, orders, expenses, dayCloses, auditLogs] =
      await Promise.all([
        db.menuItems.count(),
        db.diningTables.count(),
        db.orders.count(),
        db.expenses.count(),
        db.dayCloses.count(),
        db.auditLogs.count(),
      ]);
    return { menuItems, tables, orders, expenses, dayCloses, auditLogs };
  }, []);

  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const backup = await createBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName(new Date(backup.exportedAt));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setSuccess(`Backup exported with ${backup.data.orders.length} orders.`);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Could not export backup.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const text = await file.text();
      setPending(parseBackup(text));
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? fileError.message
          : 'Could not read this backup file.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await restoreBackup(pending);
      setSuccess('Backup restored. All data has been replaced.');
      setPending(null);
    } catch (restoreError) {
      setPending(null);
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : 'Could not restore backup.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page className="overflow-x-hidden pb-safe-24">
      <Navbar
        title="Backup & restore"
        subtitle="Local JSON file"
        left={
          <NavbarBackLink
            text="Settings"
            showText
            onClick={() => navigate('/settings')}
          />
        }
      />

      <section className="mx-4 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-700" />
          <h2 className="text-sm font-semibold text-neutral-900">
            On this device
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ['Menu items', counts?.menuItems],
            ['Tables', counts?.tables],
            ['Orders', counts?.orders],
            ['Expenses', counts?.expenses],
            ['Day closes', counts?.dayCloses],
            ['Audit entries', counts?.auditLogs],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-neutral-50 px-3 py-2"
            >
              <p className="text-lg font-semibold leading-tight text-neutral-900">
                {value ?? '—'}
              </p>
              <p className="text-[11px] text-neutral-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mx-4 mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" /> {success}
        </p>
      )}

      <section className="mx-4 mt-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Export</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          Download all menu, table, order, expense, day-close and settings data
          as one JSON file. Keep it somewhere safe.
        </p>
        <Button
          large
          className="mt-3 w-full"
          onClick={() => void handleExport()}
          disabled={busy}
        >
          <Download className="mr-1.5 h-5 w-5" />
          {busy ? 'Working…' : 'Export backup'}
        </Button>
      </section>

      <section className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Restore</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          Restoring replaces every record on this device with the contents of
          the backup file. This cannot be undone.
        </p>
        <label
          className={`mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white text-sm font-semibold text-amber-800 active:bg-amber-100 ${
            busy ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Upload className="h-5 w-5" />
          Choose backup file
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void handleFile(event)}
            disabled={busy}
          />
        </label>
      </section>

      <p className="mx-4 mt-4 pb-4 text-center text-xs leading-relaxed text-neutral-400">
        Backups never leave this device unless you move the downloaded file.
      </p>

      <Dialog
        opened={pending != null}
        onBackdropClick={() => {
          if (!busy) setPending(null);
        }}
        title="Restore this backup?"
        content={
          pending
            ? `This will replace all current data with the backup from ${format(new Date(pending.exportedAt), 'dd MMM yyyy, hh:mm a')} (${pending.data.orders.length} orders, ${pending.data.menuItems.length} menu items, ${pending.data.diningTables.length} tables).`
            : ''
        }
        buttons={
          <>
            <DialogButton
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancel
            </DialogButton>
            <DialogButton
              strong
              disabled={busy}
              onClick={() => void handleRestore()}
            >
              {busy ? 'Restoring…' : 'Restore'}
            </DialogButton>
          </>
        }
      />
    </Page>
  );
}
