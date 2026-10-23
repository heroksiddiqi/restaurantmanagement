import { describe, expect, it } from 'vitest';
import { backupFileName, parseBackup } from './backup';

function validBackup() {
  return {
    app: 'restaurant-pos',
    version: 1,
    exportedAt: 1_760_000_000_000,
    data: {
      menuItems: [],
      diningTables: [],
      orders: [],
      expenses: [],
      dayCloses: [],
      settings: [
        {
          id: 'app',
          restaurantName: 'Demo Restaurant',
          address: 'Mirpur, Dhaka',
          phone: '01XXXXXXXXX',
          vatPct: 0,
          servicePct: 0,
          roundToTaka: true,
          currencySymbol: '৳',
          receiptFooter: 'Thank you!',
        },
      ],
      auditLogs: [],
    },
  };
}

describe('parseBackup', () => {
  it('accepts a valid backup', () => {
    const backup = parseBackup(JSON.stringify(validBackup()));
    expect(backup.app).toBe('restaurant-pos');
    expect(backup.data.menuItems).toEqual([]);
  });

  it('rejects invalid JSON and foreign files', () => {
    expect(() => parseBackup('not json')).toThrow('not valid JSON');
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup(), app: 'other-app' })),
    ).toThrow('not a Restaurant POS backup');
  });

  it('rejects missing collections and unsupported versions', () => {
    const backup = validBackup();
    delete (backup.data as { orders?: unknown }).orders;
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('missing orders');
    expect(() =>
      parseBackup(JSON.stringify({ ...validBackup(), version: 2 })),
    ).toThrow('not supported');
  });

  it('rejects a backup without restaurant settings', () => {
    const backup = validBackup();
    backup.data.settings = [];
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(
      'missing valid restaurant settings',
    );
  });

  it('rejects invalid setting fields', () => {
    const backup = validBackup();
    (backup.data.settings[0] as { vatPct: unknown }).vatPct = '5';
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(
      'missing valid restaurant settings',
    );
  });
});

describe('backupFileName', () => {
  it('includes the local date and time', () => {
    expect(backupFileName(new Date(2026, 9, 23, 20, 35))).toBe(
      'restaurant-pos-backup-2026-10-23-2035.json',
    );
  });
});
