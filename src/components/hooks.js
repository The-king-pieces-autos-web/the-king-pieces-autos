<<<<<<< HEAD
import { useEffect, useState } from 'react';
import { company } from '../data/seed';
import {
  ensureAppStateRow,
  fetchAppState,
  hasSupabaseEnv,
  normalizeAppStatePayload,
  saveAppState,
} from '../lib/supabase';

const LOCAL_PREFIX = 'tkpa-cache:';
const LOCAL_WRAPPER_FLAG = '__tkpa_sync_record__';
const REMOTE_POLL_MS = 2000;

const listeners = new Map();
const stateCache = new Map();
let syncStarted = false;
let initialSyncPromise = null;
let pollTimer = null;
let flushTimer = null;
let flushInFlight = false;
let lastRemoteUpdatedAt = 0;
const pendingKeys = new Set();
const broadcast =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('tkpa-sync-channel')
    : null;

function deepClone(value) {
  if (value === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createLocalWrapper(value, updatedAt) {
  return {
    [LOCAL_WRAPPER_FLAG]: true,
    value,
    updatedAt,
  };
}

function readLocalRecord(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return {
      value: deepClone(fallbackValue),
      updatedAt: 0,
      hasStoredValue: false,
    };
  }

  const raw = window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);

  if (!raw) {
    return {
      value: deepClone(fallbackValue),
      updatedAt: 0,
      hasStoredValue: false,
    };
  }

  const parsed = safeJsonParse(raw);

  if (parsed && parsed[LOCAL_WRAPPER_FLAG]) {
    return {
      value: parsed.value,
      updatedAt: Number(parsed.updatedAt || 0),
      hasStoredValue: true,
    };
  }

  return {
    value: parsed,
    updatedAt: Date.now(),
    hasStoredValue: true,
  };
}

function writeLocalRecord(key, value, updatedAt) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      `${LOCAL_PREFIX}${key}`,
      JSON.stringify(createLocalWrapper(value, updatedAt))
    );
  } catch {}
}

function registerListener(key, listener) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }

  listeners.get(key).add(listener);

  return () => {
    const bucket = listeners.get(key);
    if (!bucket) return;
    bucket.delete(listener);
    if (!bucket.size) listeners.delete(key);
  };
}

function notifyListeners(key, value) {
  const bucket = listeners.get(key);
  if (!bucket) return;
  bucket.forEach((listener) => listener(deepClone(value)));
}

function ensureKeyState(key, fallbackValue) {
  if (!stateCache.has(key)) {
    const record = readLocalRecord(key, fallbackValue);
    stateCache.set(key, {
      value: record.value,
      updatedAt: record.updatedAt,
      hasStoredValue: record.hasStoredValue,
    });
  }

  return stateCache.get(key);
}

function mergeRemoteIntoCache(remotePayload, remoteUpdatedAt = 0) {
  const normalized = normalizeAppStatePayload(remotePayload);
  const remoteValues = normalized.values || {};
  const remoteMeta = normalized.meta || {};
  const localKeys = Array.from(stateCache.keys());
  const remoteKeys = Object.keys(remoteValues);
  const allKeys = new Set([...localKeys, ...remoteKeys]);

  allKeys.forEach((key) => {
    const localState = stateCache.get(key) || {
      value: undefined,
      updatedAt: 0,
      hasStoredValue: false,
    };

    const remoteHasValue = Object.prototype.hasOwnProperty.call(remoteValues, key);
    const remoteTimestamp = Number(remoteMeta[key] || 0);

    if (remoteHasValue && remoteTimestamp > localState.updatedAt) {
      const nextValue = deepClone(remoteValues[key]);
      stateCache.set(key, {
        value: nextValue,
        updatedAt: remoteTimestamp,
        hasStoredValue: true,
      });
      writeLocalRecord(key, nextValue, remoteTimestamp);
      notifyListeners(key, nextValue);
      return;
    }

    if (localState.hasStoredValue && localState.updatedAt > remoteTimestamp) {
      pendingKeys.add(key);
    }
  });

  if (remoteUpdatedAt) {
    lastRemoteUpdatedAt = Math.max(lastRemoteUpdatedAt, Date.parse(remoteUpdatedAt) || 0);
  }
}

async function loadRemoteState() {
  if (!hasSupabaseEnv) return;

  await ensureAppStateRow();
  const row = await fetchAppState();
  if (!row) return;

  mergeRemoteIntoCache(row.payload, row.updated_at);

  if (pendingKeys.size) {
    scheduleFlush(200);
  }
}

async function pollRemoteState() {
  if (!hasSupabaseEnv || flushInFlight) return;

  try {
    const row = await fetchAppState();
    if (!row) return;

    const remoteTimestamp = Date.parse(row.updated_at || 0) || 0;
    if (remoteTimestamp <= lastRemoteUpdatedAt) return;

    mergeRemoteIntoCache(row.payload, row.updated_at);
  } catch (error) {
    console.error('THE KING PIÈCES AUTOS — lecture Supabase impossible :', error);
  }
}

async function flushPendingChanges() {
  if (!hasSupabaseEnv || flushInFlight || !pendingKeys.size) return;

  flushInFlight = true;
  const queuedKeys = Array.from(pendingKeys);
  pendingKeys.clear();

  try {
    await ensureAppStateRow();
    const remoteRow = await fetchAppState();
    const normalized = normalizeAppStatePayload(remoteRow?.payload);
    const mergedValues = { ...(normalized.values || {}) };
    const mergedMeta = { ...(normalized.meta || {}) };

    queuedKeys.forEach((key) => {
      const localState = stateCache.get(key);
      if (!localState) return;

      const remoteTimestamp = Number(mergedMeta[key] || 0);

      if (localState.updatedAt >= remoteTimestamp) {
        mergedValues[key] = deepClone(localState.value);
        mergedMeta[key] = localState.updatedAt;
      }
    });

    const savedRow = await saveAppState({
      values: mergedValues,
      meta: mergedMeta,
    });

    if (savedRow) {
      lastRemoteUpdatedAt = Date.parse(savedRow.updated_at || 0) || lastRemoteUpdatedAt;
    }
  } catch (error) {
    queuedKeys.forEach((key) => pendingKeys.add(key));
    console.error('THE KING PIÈCES AUTOS — enregistrement Supabase impossible :', error);
  } finally {
    flushInFlight = false;
    if (pendingKeys.size) {
      scheduleFlush(800);
    }
  }
}

function scheduleFlush(delay = 500) {
  if (!hasSupabaseEnv) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flushPendingChanges();
  }, delay);
}

function applyValue(key, value, updatedAt, options = {}) {
  const {
    markDirty = false,
    notify = true,
    persistLocal = true,
    broadcastChange = false,
  } = options;

  const current = stateCache.get(key);
  if (current && Number(updatedAt) < Number(current.updatedAt || 0)) return;

  const nextValue = deepClone(value);
  const nextState = {
    value: nextValue,
    updatedAt: Number(updatedAt || Date.now()),
    hasStoredValue: true,
  };

  stateCache.set(key, nextState);

  if (persistLocal) {
    writeLocalRecord(key, nextValue, nextState.updatedAt);
  }

  if (markDirty) {
    pendingKeys.add(key);
    scheduleFlush();
  }

  if (notify) {
    notifyListeners(key, nextValue);
  }

  if (broadcastChange && broadcast) {
    broadcast.postMessage({
      key,
      value: nextValue,
      updatedAt: nextState.updatedAt,
    });
  }
}

function startSynchronization() {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;

  window.addEventListener('storage', (event) => {
    if (!event.key || !event.key.startsWith(LOCAL_PREFIX) || !event.newValue) return;

    const key = event.key.replace(LOCAL_PREFIX, '');
    const parsed = safeJsonParse(event.newValue);

    if (parsed && parsed[LOCAL_WRAPPER_FLAG]) {
      applyValue(key, parsed.value, parsed.updatedAt, {
        notify: true,
        persistLocal: false,
      });
    }
  });

  if (broadcast) {
    broadcast.onmessage = (event) => {
      const payload = event.data;
      if (!payload?.key) return;
      applyValue(payload.key, payload.value, payload.updatedAt, {
        notify: true,
        persistLocal: true,
      });
    };
  }

  if (hasSupabaseEnv) {
    initialSyncPromise = loadRemoteState().catch((error) => {
      console.error('THE KING PIÈCES AUTOS — initialisation Supabase impossible :', error);
    });

    pollTimer = window.setInterval(() => {
      pollRemoteState();
    }, REMOTE_POLL_MS);
  }
}

export function useLocalStorage(key, initialValue) {
  startSynchronization();

  const [value, setValueState] = useState(() => deepClone(ensureKeyState(key, initialValue).value));

  useEffect(() => {
    const unsubscribe = registerListener(key, (nextValue) => {
      setValueState(nextValue);
    });

    if (initialSyncPromise) {
      initialSyncPromise.finally(() => {
        const current = stateCache.get(key);
        if (current) {
          setValueState(deepClone(current.value));
        }
      });
    }

    return unsubscribe;
  }, [key]);

  const setValue = (updater) => {
    const previousValue = deepClone(ensureKeyState(key, initialValue).value);
    const nextValue = typeof updater === 'function' ? updater(previousValue) : updater;

    applyValue(key, nextValue, Date.now(), {
      markDirty: true,
      notify: true,
      persistLocal: true,
      broadcastChange: true,
    });
  };

  return [value, setValue];
}

=======
import { useEffect, useRef, useState } from 'react';
import { company } from '../data/seed';


const APP_STATE_ROW_ID = 'global';
const LOCAL_PREFIX = 'tkpa-cache:';

function getLocalMirror(key, fallback) {
  try {
    const raw = window.localStorage.getItem(`${LOCAL_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalMirror(key, value) {
  try {
    window.localStorage.setItem(`${LOCAL_PREFIX}${key}`, JSON.stringify(value));
  } catch {}
}


export function useLocalStorage(key, initialValue) {
  const [value, setValueState] = useState(() => getLocalMirror(key, initialValue));

  const setValue = (updater) => {
    setValueState((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater;
      setLocalMirror(key, nextValue);
      return nextValue;
    });
  };

  useEffect(() => {
    setLocalMirror(key, value);
  }, [key, value]);

  return [value, setValue];
}


>>>>>>> 9d0bf112b31d9377b6ec49d3e5fdc72702671f9e
export const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
};

export const downloadJSONBackup = (data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `sauvegarde-the-king-pieces-autos-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  a.click();
  URL.revokeObjectURL(url);
};

export const printHTML = (title, content, options = {}) => {
  const { includeShopHeader = true, footerCentered = true, includeFooter = true } = options;
  const win = window.open('', '_blank');
  if (!win) return;

  const header = includeShopHeader
    ? `
    <div class="print-shop-header">
      <div class="print-shop-brand">
        <img src="${company.logoPath}" alt="${company.name}" />
        <div>
          <div class="brand-name">${company.name}</div>
          <div class="brand-tagline gold">${company.tagline}</div>
          <div class="print-shop-meta">☎️ ${company.phone}</div>
          <div class="print-shop-meta">🟢 ${company.whatsapp}</div>
          <div class="print-shop-meta">✉️ ${company.email}</div>
          <div class="print-shop-meta">📍 ${company.address}</div>
        </div>
      </div>
    </div>`
    : '';

  const footer = includeFooter
    ? `
    <div class="print-footer ${footerCentered ? 'print-footer-centered' : ''}">
      <div>SIRET : 977 631 530 00010</div>
      <div>TVA : FR80 977 631 530</div>
    </div>`
    : '';

  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:26px;color:#111827;background:#ffffff}
          h1,h2,h3,h4{margin:0 0 12px}
          table{width:100%;border-collapse:collapse;margin-top:16px}
          th,td{border:1px solid #d1d5db;padding:8px;text-align:left;font-size:12px;vertical-align:top}
          thead th{background:#1f3c88;color:#fff}
          .top{display:flex;justify-content:space-between;gap:20px;margin-bottom:20px}
          .muted{color:#6b7280}
          .box{border:1px solid #d1d5db;border-radius:8px;padding:12px}
          .total{margin-top:16px;text-align:right;font-weight:bold}
          .print-shop-header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #e5e7eb;padding-bottom:18px;margin-bottom:18px}
          .print-shop-brand{display:flex;gap:16px;align-items:flex-start}
          .print-shop-brand img,.quote-brand img{width:92px;height:92px;object-fit:contain}
          .brand-name{font-size:24px;font-weight:800;letter-spacing:.4px;color:#1f3c88}
          .brand-tagline{font-size:14px;color:#475569;margin-bottom:8px}
          .brand-tagline.gold{color:#d6a734;font-weight:700}
          .print-shop-meta{font-size:13px;color:#334155;line-height:1.6}
          .quote-doc{display:grid;gap:18px}
          .quote-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:18px}
          .quote-brand{display:flex;gap:16px;align-items:flex-start;max-width:62%}
          .quote-meta{min-width:240px;border:1px solid #d1d5db;border-radius:14px;padding:16px;background:#f8fafc;display:grid;gap:8px}
          .quote-title{font-size:28px;font-weight:800;letter-spacing:1px}
          .quote-title.blue{color:#1f3c88}
          .quote-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
          .quote-box{border:1px solid #d1d5db;border-radius:14px;padding:14px;display:grid;gap:6px}
          .quote-box-title{font-size:14px;font-weight:700;text-transform:uppercase;color:#475569}
          .quote-table th{background:#0f172a;color:#fff}
          .quote-totals{margin-left:auto;display:grid;gap:8px;min-width:320px}
          .quote-totals > div{display:flex;justify-content:space-between;gap:18px;border:1px solid #d1d5db;border-radius:12px;padding:10px 14px}
          .quote-totals .grand-total{background:#fff;color:#000;border:2px solid #000;font-weight:800}
          .quote-totals .grand-total span,.quote-totals .grand-total strong{color:#000;font-weight:800}
          .quote-totals .grand-total strong{font-size:22px}
          .quote-signature{border:1px solid #d1d5db;border-radius:12px;padding:18px 14px;margin-top:8px}
          .quote-footer{margin-top:18px;border-top:1px solid #e5e7eb;padding-top:14px;color:#374151;display:grid;gap:8px;font-size:12px}
          .quote-footer-centered{text-align:center;justify-items:center;font-weight:700}
          .print-footer{margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;color:#334155;font-size:12px;display:grid;gap:4px}
          .print-footer-centered{text-align:center;justify-items:center;font-weight:700}
          @media print{body{padding:0}.quote-head,.print-shop-header{break-inside:avoid}}
        </style>
      </head>
      <body>${header}${content}${footer}</body>
    </html>
  `);

  win.document.close();
  win.print();
};
