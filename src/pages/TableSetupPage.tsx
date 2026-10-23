import { useLiveQuery } from 'dexie-react-hooks';
import {
  Button,
  Dialog,
  DialogButton,
  List,
  ListInput,
  Navbar,
  NavbarBackLink,
  Page,
  Sheet,
} from 'konsta/react';
import { Armchair, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { deleteTable, saveTable } from '../db/tables';

interface TableForm {
  id?: number;
  name: string;
  seats: string;
}

const EMPTY_FORM: TableForm = { name: '', seats: '4' };

export function TableSetupPage() {
  const navigate = useNavigate();
  const tables = useLiveQuery(
    async () =>
      (await db.diningTables.toArray()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      ),
    [],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TableForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError('');
    setDeleteError('');
    setFormOpen(true);
  }

  function openEdit(id: number, name: string, seats: number) {
    setForm({ id, name, seats: String(seats) });
    setError('');
    setDeleteError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setDeleteOpen(false);
    setError('');
  }

  async function handleSave() {
    const seats = Number(form.seats);
    if (!form.name.trim()) {
      setError('Table name is required.');
      return;
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 50) {
      setError('Seats must be a whole number between 1 and 50.');
      return;
    }

    try {
      await saveTable({ id: form.id, name: form.name, seats });
      closeForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save table.',
      );
    }
  }

  async function handleDelete() {
    if (form.id == null || deleting) return;
    setDeleting(true);
    setDeleteError('');
    setDeleteOpen(false);
    setFormOpen(false);
    try {
      await deleteTable(form.id);
      closeForm();
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error
          ? deleteFailure.message
          : 'Could not delete table.',
      );
    } finally {
      setDeleting(false);
    }
  }

  function cancelDelete() {
    setDeleteOpen(false);
    setFormOpen(true);
  }

  return (
    <Page className="overflow-x-hidden pb-safe-24">
      <Navbar
        title="Dining tables"
        subtitle={`${tables?.length ?? 0} tables`}
        left={
          <NavbarBackLink
            text="Settings"
            showText
            onClick={() => navigate('/settings')}
          />
        }
        right={
          <Button small onClick={openCreate}>
            Add
          </Button>
        }
      />

      <p className="mx-4 mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
        Tap a table to rename it or change its seat count. Tables with open
        orders cannot be deleted.
      </p>

      {deleteError && (
        <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {deleteError}
        </p>
      )}

      {!tables ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading tables…
        </p>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <p className="text-sm font-medium text-neutral-700">No tables yet</p>
          <p className="text-xs text-neutral-500">
            Add your first dining table to start taking dine-in orders.
          </p>
          <Button small onClick={openCreate}>
            Add table
          </Button>
        </div>
      ) : (
        <div className="mx-4 mt-3 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {tables.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => {
                if (table.id != null) {
                  openEdit(table.id, table.name, table.seats);
                }
              }}
              className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-neutral-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Armchair className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900">
                  {table.name}
                </span>
                <span className="block text-xs text-neutral-500">
                  {table.seats} seats
                </span>
              </span>
              <span className="text-xs font-medium text-emerald-700">Edit</span>
            </button>
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
              {form.id != null ? 'Edit table' : 'New table'}
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
                label="Table name"
                type="text"
                placeholder="e.g. T-13"
                value={form.name}
                onInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <ListInput
                label="Seats"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                step={1}
                placeholder="4"
                value={form.seats}
                onInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    seats: event.target.value,
                  }))
                }
              />
            </List>

            {error && (
              <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 px-4 py-3 pb-safe-3">
            <Button large onClick={() => void handleSave()} className="w-full">
              Save table
            </Button>
            {form.id != null && (
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(true);
                  setFormOpen(false);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-red-600 active:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete table
              </button>
            )}
          </div>
        </div>
      </Sheet>

      <Dialog
        opened={deleteOpen}
        onBackdropClick={cancelDelete}
        title="Delete table?"
        content={`"${form.name}" will be removed from the floor plan. Past orders keep their records.`}
        buttons={
          <>
            <DialogButton onClick={cancelDelete}>Cancel</DialogButton>
            <DialogButton
              strong
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              Delete
            </DialogButton>
          </>
        }
      />
    </Page>
  );
}
