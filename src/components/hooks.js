import { useEffect, useState } from 'react';
import {
  ensureAppStateRow,
  fetchAppState,
  hasSupabaseEnv,
  normalizeAppStatePayload,
  saveAppState,
} from '../lib/supabase';

const LOCAL_PREFIX = 'tkpa-cache:';
const LOCAL_ONLY_KEYS = new Set(['tkpa-session']);

function cloneInitialValue(initialValue) {
  if (Array.isArray(initialValue)) return [...initialValue];
  if (initialValue && typeof initialValue === 'object') return { ...initialValue };
  return initialValue;
}

function normalizeStoredValue(rawValue, initialValue) {
  if (Array.isArray(initialValue)) {
    return Array.isArray(rawValue) ? rawValue : cloneInitialValue(initialValue);
  }

  if (initialValue && typeof initialValue === 'object') {
    return rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
      ? rawValue
      : cloneInitialValue(initialValue);
  }

  if (initialValue === null) {
    return rawValue === undefined ? null : rawValue;
  }

  return rawValue === undefined ? initialValue : rawValue;
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value) {
  if (!value) return '-';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('fr-FR').format(date);
}

export function printHTML(title, html) {
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) {
    window.alert("Impossible d'ouvrir la fenêtre d'impression. Autorise les pop-ups puis réessaie.");
    return;
  }

  win.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 24px;
            color: #111;
          }
          h1, h2, h3, h4 {
            margin: 0 0 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            border: 1px solid #d7d7d7;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #f5f5f5;
          }
          .total {
            margin-top: 16px;
            font-weight: 700;
          }
          .muted {
            color: #666;
          }
          .amount {
            text-align: right;
          }
          @media print {
            body {
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);

  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}

export function downloadJSONBackup(data) {
  const filename = `backup-the-king-pieces-autos-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useLocalStorage(key, initialValue) {
  const isLocalOnly = LOCAL_ONLY_KEYS.has(key);

  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_PREFIX + key);
      const parsed = raw ? JSON.parse(raw) : initialValue;
      return normalizeStoredValue(parsed, initialValue);
    } catch {
      return cloneInitialValue(initialValue);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  useEffect(() => {
    if (isLocalOnly || !hasSupabaseEnv) return;

    let cancelled = false;

    const sync = async () => {
      try {
        await ensureAppStateRow();
        const row = await fetchAppState();
        if (!row || cancelled) return;

        const normalized = normalizeAppStatePayload(row.payload);
        const remoteValue = normalized.values?.[key];

        if (remoteValue !== undefined) {
          setValue(normalizeStoredValue(remoteValue, initialValue));
        }
      } catch {}
    };

    sync();
    return () => {
      cancelled = true;
    };
  }, [key, isLocalOnly, initialValue]);

  const setAndSync = async (newValue) => {
    const resolvedValue = typeof newValue === 'function'
      ? newValue(normalizeStoredValue(value, initialValue))
      : newValue;

    const safeValue = normalizeStoredValue(resolvedValue, initialValue);
    setValue(safeValue);

    if (isLocalOnly || !hasSupabaseEnv) return;

    try {
      await ensureAppStateRow();
      const row = await fetchAppState();
      const normalized = normalizeAppStatePayload(row?.payload);

      const updated = {
        values: {
          ...normalized.values,
          [key]: safeValue,
        },
        meta: {
          ...normalized.meta,
          [key]: Date.now(),
        },
      };

      await saveAppState(updated);
    } catch {}
  };

  return [value, setAndSync];
}
