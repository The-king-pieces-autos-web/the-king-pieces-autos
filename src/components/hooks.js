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
