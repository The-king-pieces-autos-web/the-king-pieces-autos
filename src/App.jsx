import React, { useEffect, useMemo, useState } from 'react';
import {
  company,
  initialAuditLog,
  initialClients,
  initialDailyReceipts,
  initialFamilies,
  initialFinanceTransactions,
  initialProducts,
  initialQuotes,
  initialSuppliers,
  initialUsers,
} from './data/seed';
import { downloadJSONBackup, formatCurrency, formatDate, printHTML, useLocalStorage } from './components/hooks';

const modules = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'stock', label: 'Stock' },
  { key: 'commandes', label: 'Stock à commander' },
  { key: 'devis', label: 'Devis' },
  { key: 'clients', label: 'Clients' },
  { key: 'fournisseurs', label: 'Fournisseurs' },
  { key: 'finance', label: 'Finance' },
  { key: 'utilisateurs', label: 'Utilisateurs & rôles' },
];

const lowStockThreshold = 2;



function normalizeSupplierText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}


function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function parseFrenchNumber(value) {
  const cleaned = String(value || '')
    .replace(/\s+/g, '')
    .replace(/€/g, '')
    .replace(/,/g, '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDateFromText(value) {
  if (!value) return '';
  const match = String(value).match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{2,4})/);
  if (!match) return '';
  let [, day, month, year] = match;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

function detectSupplierModel(text) {
  const normalized = normalizeSupplierText(text);
  if (!normalized) return 'Générique';
  if (normalized.includes('procodis france')) return 'PROCODIS';
  if (normalized.includes('wai fr') || normalized.includes('the power of wai')) return 'WAI';
  if (normalized.includes('oskarbi auto')) return 'OSKARBI';
  if (normalized.includes('ajs parts')) return 'AJS PARTS';
  if (normalized.includes('tradex france')) return 'TRADEX';
  if (normalized.includes('inter cars')) return 'INTER CARS';
  if (normalized.includes('auto partner')) return 'AUTO PARTNER';
  if (normalized.includes('dca plateforme paris')) return 'DCA';
  if (normalized.includes('preference seine')) return 'PREFERENCE SEINE';
  if (normalized.includes('ottogo')) return 'OTTOGO';
  if (normalized.includes('exadis')) return 'EXADIS';
  if (normalized.includes('acr_group') || normalized.includes('acr group') || normalized.includes('notification d’avoir') || normalized.includes('notification d\'avoir')) return 'ACR';
  return 'Générique';
}

function detectSupplierDocumentType(text, fallback = 'Bon de livraison') {
  const normalized = normalizeSupplierText(text);
  if (!normalized) return fallback;
  if (normalized.includes('notification d\'avoir') || normalized.includes('notification d’avoir') || normalized.includes('accord de retour') || normalized.includes('bon de retour') || normalized.includes('demande de retour') || normalized.includes('correction de facture') || normalized.includes('credit note') || normalized.includes('invoice ue (credit note)') || normalized.includes('avoir')) return 'BL retour';
  if (normalized.includes('bon de commande') || /^commande\b/m.test(normalized) || normalized.includes('commande catalogue')) return 'Bon de commande';
  if (normalized.includes('facture')) return 'Facture';
  if (normalized.includes('bordereau')) return 'Bon de livraison';
  if (normalized.includes('bon de livraison') || normalized.includes('livraison')) return 'Bon de livraison';
  return fallback;
}

function extractSupplierDocumentNumber(text) {
  const patterns = [
    /(?:facture ue \(korekta\)|correction de facture|invoice ue \(credit note\)|notification d['’]avoir|avoir|accord de retour|demande de retour|bon de retour|bon de livraison|bordereau|facture|commande|bon de commande)\s*(?:n[o°]|numero|num|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/_]+)/i,
    /\b([A-Z]{1,4}\/?\d{1,6}\/?\d{2,4}\/?[A-Z]{0,3}\d*)\b/,
    /\b(\d{6,})\b/
  ];
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match) return String(match[1] || '').replace(/\s+/g, '');
  }
  return '';
}

const designationTranslationRules = [
  { test: /(olej przekladniowy|transmission oil|atf oil|gear oil|huile de boite|huile boite|huile transmission)/, value: 'Huile de boîte' },
  { test: /(olej silnikowy|engine oil|huile moteur)/, value: 'Huile moteur' },
  { test: /(korek wlewu paliwa|fuel filler cap|bouchon reservoir|bouchon de reservoir)/, value: 'Bouchon de réservoir' },
  { test: /(poduszka silnika|engine suspension sandwich mounting|support moteur|silentbloc moteur)/, value: 'Support moteur' },
  { test: /(pompa elektryczna przekladni|electric transmission pump)/, value: 'Pompe électrique de transmission' },
  { test: /(skraplacz klimatyzacji|air conditioning cooler|air conditioning radiator|condenseur clim|condenser)/, value: 'Condenseur de climatisation' },
  { test: /(filtr oleju|oil filter)/, value: 'Filtre à huile' },
  { test: /(filtr powietrza|air filter)/, value: 'Filtre à air' },
  { test: /(filtr czastek stalych|filtre a particules|particulate filter|diesel particulate filter)/, value: 'Filtre à particules' },
  { test: /(uszczelniacz walu korbowego|crankshaft seal|joint spi vilebrequin)/, value: 'Joint spi vilebrequin' },
  { test: /(swieca zaplonowa|spark plug|bougie allumage|bougie d'allumage)/, value: 'Bougie d’allumage' },
  { test: /(obudowa lusterka|housing\/cover of side mirror|housing cover of side mirror|coque retroviseur|coque de retroviseur)/, value: 'Coque de rétroviseur' },
  { test: /(klocek hamulcowy kpl|klocki hamulcowe|brake pads set|brake pads|plaquettes frein)/, value: 'Plaquettes de frein' },
  { test: /(tarcza hamulcowa|brake disk|brake disc|disque frein)/, value: 'Disque de frein' },
  { test: /(zestaw naprawczy zacisku|brake caliper repair kit|kit reparation etrier)/, value: 'Kit de réparation d’étrier' },
  { test: /(gniazdo amortyzatora|mc pherson column cushion|strut mount|coupelle amortisseur)/, value: 'Coupelle d’amortisseur' },
  { test: /(chlodnica silnika|cooling water radiator|radiateur moteur)/, value: 'Radiateur moteur' },
  { test: /(inlet air cooler|intercooler|radiateur air suralimentation)/, value: 'Intercooler' },
  { test: /(capteur,? position d'arbre a cames|capteur position arbre a cames|camshaft position sensor)/, value: 'Capteur d’arbre à cames' },
  { test: /(courroie de distribution|timing belt)/, value: 'Courroie de distribution' },
  { test: /(thermostat d'eau|thermostat eau|water thermostat)/, value: 'Thermostat' },
  { test: /(zarowka xenonowa|xenon bulb|ampoule xenon)/, value: 'Ampoule Xénon' },
  { test: /(verre de retroviseur|mirror glass)/, value: 'Verre de rétroviseur' },
  { test: /(podnosnik szyby|window regulator|leve vitre|leve-vitre)/, value: 'Lève-vitre' },
  { test: /(valve de commande,? reglage d'arbres? a came|camshaft control valve|electrovanne arbre a cames)/, value: 'Électrovanne d’arbre à cames' },
  { test: /(kit de distribution|timing kit)/, value: 'Kit de distribution' },
  { test: /(soupape d'emission|exhaust valve)/, value: 'Soupape d’échappement' },
  { test: /(soupape d'admission|intake valve)/, value: 'Soupape d’admission' },
  { test: /(transmission \/|cardan|driveshaft)/, value: 'Cardan' },
  { test: /(turbocompresseur|turbocharger|turbo compresseur)/, value: 'Turbo' },
  { test: /(jeu plaq|plaquettes de frein)/, value: 'Plaquettes de frein' },
  { test: /(pare-chocs avant|front bumper)/, value: 'Pare-chocs avant' },
  { test: /(kit embrayage|clutch kit)/, value: 'Kit embrayage' },
  { test: /(roulement de roue|wheel bearing)/, value: 'Roulement de roue' },
  { test: /(joint d'arbre radial|simmerring|joint spi)/, value: 'Joint spi' },
  { test: /(galet accessoires|galet accessoire|accessory pulley)/, value: 'Galet accessoires' },
  { test: /(demarreur|starter motor)/, value: 'Démarreur' },
];

const familyKeywordRules = [
  { test: /(huile de boite|huile transmission)/, family: 'Lubrifiants / Huiles', subfamily: 'Huile boîte' },
  { test: /(huile moteur)/, family: 'Lubrifiants / Huiles', subfamily: 'Huile moteur 5W30' },
  { test: /(filtre a huile)/, family: 'Vidange / Entretien', subfamily: 'Filtres à huile' },
  { test: /(filtre a air)/, family: 'Vidange / Entretien', subfamily: 'Filtres à air' },
  { test: /(filtre a particules)/, family: 'Admission / Échappement', subfamily: 'Filtres à particules' },
  { test: /(plaquettes de frein)/, family: 'Freinage', subfamily: 'Plaquettes de frein' },
  { test: /(disque de frein)/, family: 'Freinage', subfamily: 'Disques de frein' },
  { test: /(kit de reparation d'etrier)/, family: 'Freinage', subfamily: 'Kits de frein' },
  { test: /(bougie d'allumage)/, family: 'Électricité / Électronique', subfamily: 'Bougies d’allumage' },
  { test: /(demarreur)/, family: 'Électricité / Électronique', subfamily: 'Démarreurs' },
  { test: /(capteur d'arbre a cames|electrovanne d'arbre a cames)/, family: 'Électricité / Électronique', subfamily: 'Capteurs moteur' },
  { test: /(support moteur)/, family: 'Moteur', subfamily: 'Supports moteur' },
  { test: /(joint spi vilebrequin|joint spi)/, family: 'Moteur', subfamily: 'Joints spi moteur' },
  { test: /(courroie de distribution)/, family: 'Moteur', subfamily: 'Courroies de distribution' },
  { test: /(kit de distribution)/, family: 'Moteur', subfamily: 'Kits distribution sans pompe à eau' },
  { test: /(thermostat)/, family: 'Refroidissement', subfamily: 'Thermostats' },
  { test: /(radiateur moteur)/, family: 'Refroidissement', subfamily: 'Radiateurs moteur' },
  { test: /(intercooler)/, family: 'Refroidissement', subfamily: 'Intercoolers' },
  { test: /(condenseur de climatisation)/, family: 'Climatisation / Chauffage', subfamily: 'Condenseurs' },
  { test: /(coupelle d'amortisseur)/, family: 'Suspension', subfamily: 'Coupelles d’amortisseur' },
  { test: /(cardan)/, family: 'Boîte / Transmission', subfamily: 'Cardans' },
  { test: /(bouchon de reservoir)/, family: 'Carburant / Injection', subfamily: 'Réservoirs' },
  { test: /(turbo)/, family: 'Admission / Échappement', subfamily: 'Turbos' },
  { test: /(roulement de roue)/, family: 'Roues / Moyeux', subfamily: 'Roulements de roue' },
  { test: /(pare-chocs avant)/, family: 'Carrosserie', subfamily: 'Pare-chocs avant' },
  { test: /(coque de retroviseur|verre de retroviseur)/, family: 'Carrosserie', subfamily: 'Rétroviseurs' },
  { test: /(leve-vitre)/, family: 'Carrosserie', subfamily: 'Lève-vitres' },
  { test: /(ampoule xenon)/, family: 'Éclairage', subfamily: 'Ampoules' },
  { test: /(kit embrayage)/, family: 'Embrayage', subfamily: 'Kits embrayage' },
  { test: /(galet accessoires)/, family: 'Moteur', subfamily: 'Galets tendeurs' },
];

function translateDesignationToFrench(designation = '') {
  const cleaned = String(designation || '').trim();
  const normalized = normalizeSupplierText(cleaned);
  if (!normalized) return '';
  for (const rule of designationTranslationRules) {
    if (rule.test.test(normalized)) return rule.value;
  }
  return cleaned;
}


function isDesignationLikelyFrench(value = '') {
  const normalized = normalizeSupplierText(value);
  if (!normalized) return true;
  const frenchSignals = [
    'huile', 'filtre', 'plaquette', 'disque', 'radiateur', 'condenseur', 'thermostat',
    'capteur', 'joint', 'support', 'bougie', 'demarreur', 'leve-vitre', 'roulement',
    'cardan', 'coque', 'verre', 'turbo', 'embrayage', 'amortisseur', 'coupelle', 'pompe'
  ];
  return frenchSignals.some((word) => normalized.includes(word));
}

function translateUntranslatedDesignation(value = '') {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '';
  if (isDesignationLikelyFrench(cleaned)) return cleaned;
  const translated = translateDesignationToFrench(cleaned);
  return translated || cleaned;
}

function guessFamilyFromDesignation(designation, families = []) {
  const normalizedDesignation = normalizeSupplierText(designation);
  if (!normalizedDesignation) return { family: '', subfamily: '' };
  for (const rule of familyKeywordRules) {
    if (rule.test.test(normalizedDesignation)) {
      return { family: rule.family, subfamily: rule.subfamily };
    }
  }
  for (const family of families) {
    for (const subfamily of (family.subfamilies || [])) {
      if (normalizedDesignation.includes(normalizeSupplierText(subfamily))) {
        return { family: family.name, subfamily };
      }
    }
  }
  for (const family of families) {
    if (normalizedDesignation.includes(normalizeSupplierText(family.name))) {
      return { family: family.name, subfamily: '' };
    }
  }
  return { family: '', subfamily: '' };
}

function shouldIgnoreSupplierLine(designation = '', reference = '') {
  const normalized = normalizeSupplierText(`${designation} ${reference}`);
  return [
    'frais de port',
    'frais d expedition',
    'frais d\'expedition',
    'emballage',
    'vracht',
    'transport',
    'consigne',
    'port paye',
    'versement',
    'cut off',
    'poids total',
    'nombre de lignes',
    'nombre d\'articles'
  ].some((term) => normalized.includes(term));
}

function buildSupplierLine({ designation = '', originalReference = '', internalReference = '', quantity = 1, unitPrice = 0, families = [], destination = 'stock', clientName = '', note = '', supplierBrand = '' }) {
  const frenchDesignation = translateDesignationToFrench(designation);
  const guessed = guessFamilyFromDesignation(frenchDesignation, families);
  return {
    id: crypto.randomUUID(),
    designation: String(frenchDesignation || '').trim(),
    originalReference: String(originalReference || '').trim(),
    internalReference: String(internalReference || '').trim(),
    family: guessed.family,
    subfamily: guessed.subfamily,
    quantity: Math.max(1, Number(quantity || 1)),
    unitPrice: Number(unitPrice || 0),
    destination,
    clientName,
    note,
    supplierBrand: String(supplierBrand || '').trim(),
  };
}

function parseRows(rawText) {
  return String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseLooseQuantityToken(value = '') {
  return parseFrenchNumber(String(value || '').replace(/,$/, ''));
}

function isItemNumberRow(row = '') {
  return /^\d+$/.test(String(row || '').trim());
}

function isLikelyRefDesignationRow(row = '') {
  const value = String(row || '').trim();
  if (!value) return false;
  if (isItemNumberRow(value)) return false;
  if (/^(?:strona|page|wartosc|do zaplaty|podpis|reverse charge|l\.p\.|nazwa towaru|ilosc|jm|cena jednost|wartosc towaru|vat|sww|code sww|quantity|unit|net price|value)/i.test(normalizeSupplierText(value))) return false;
  if (/^(?:pcs\/lt|pcs\/l|pcs|pc\.|pc|set|szt|lt|l)$/i.test(value)) return false;
  if (/^\d+(?:[.,]\d+)?,?$/.test(value)) return false;
  return /^[A-Z0-9][A-Z0-9 .+\-\/]{2,}\s+[A-Za-zÀ-ÿ]/.test(value);
}

function collectSequentialItemNumbers(rows = []) {
  for (let i = 0; i < rows.length; i += 1) {
    if (!isItemNumberRow(rows[i])) continue;
    const sequence = [];
    let expected = 1;
    let j = i;
    while (j < rows.length && String(expected) === rows[j]) {
      sequence.push(rows[j]);
      expected += 1;
      j += 1;
    }
    if (sequence.length >= 3 && sequence[0] === '1') {
      return { start: i, end: j - 1, count: sequence.length };
    }
  }
  return null;
}

function splitReferenceAndDesignation(prefix = '') {
  const tokens = String(prefix || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { ref: '', designation: '' };
  const refTokens = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    const codeLike = /\d/.test(token) || /[./-]/.test(token);
    if (codeLike) {
      refTokens.push(token);
      index += 1;
      continue;
    }
    break;
  }
  if (!refTokens.length) {
    return { ref: tokens[0] || '', designation: tokens.slice(1).join(' ').trim() };
  }
  return { ref: refTokens.join(' ').trim(), designation: tokens.slice(index).join(' ').trim() };
}

function isLikelyContinuationRow(row = '') {
  if (!row) return false;
  if (/^\d+\s+/.test(row)) return false;
  if (/^(?:strona|page|wartosc|do zaplaty|podpis|reverse charge|l\.p\.|nazwa towaru|ilosc|jm|cena jednost|wartosc towaru|vat)/i.test(normalizeSupplierText(row))) return false;
  if (/\b\d+[.,]\d{2}\b/.test(row) && /\b(?:pc|pcs|pce|szt|set|eur)\b/i.test(row)) return false;
  return /[A-Za-zÀ-ÿ]/.test(row);
}

function parseNumberedTableLines(rows, families) {
  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const qtyMatch = row.match(/^(\d+)\s+(.+?)\s+(-?\d+(?:[.,]\d+)?)\s*,?\s*(?:Pcs\/L\s*t|Pcs\/Lt|Pcs\/L|pc\.|pcs|pce|szt|set|pc|l|lt)\b/i);
    if (!qtyMatch) continue;
    const [, itemNo, beforeQty, qtyRaw] = qtyMatch;
    const { ref, designation } = splitReferenceAndDesignation(beforeQty);
    if (!ref) continue;
    let finalDesignation = designation;
    const continuation = [];
    let j = i + 1;
    while (j < rows.length && isLikelyContinuationRow(rows[j])) {
      continuation.push(rows[j]);
      j += 1;
      if (continuation.length >= 2) break;
    }
    if (!finalDesignation && continuation.length) {
      finalDesignation = continuation[0];
    } else if (continuation.length && finalDesignation.length < 12 && continuation[0].length > finalDesignation.length) {
      finalDesignation = `${finalDesignation} ${continuation[0]}`.trim();
    }
    if (!finalDesignation) finalDesignation = `Pièce ${itemNo}`;
    if (shouldIgnoreSupplierLine(finalDesignation, ref)) continue;
    lines.push(buildSupplierLine({ designation: finalDesignation, originalReference: ref, quantity: Math.abs(parseFrenchNumber(qtyRaw) || 1), families }));
  }
  return lines;
}

function parseProcodisLines(rows, families) {
  const lines = [];
  for (const row of rows) {
    const m = row.match(/^([A-Z0-9][A-Z0-9+\-\/.]*)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+\d+[.,]\d+\s+\d+[.,]\d+(?:\s+[A-Z0-9\/-]+)?$/);
    if (m) {
      const [, ref, designation, qty] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), families }));
    }
  }
  return lines;
}

function parseWaiLines(rows, families) {
  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = normalizeOcrCollapsedText(rows[i] || '');
    let m = row.match(/^(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d{2})\d*\s*([A-Z0-9+\-.]+)\s+([0-9.]+)\s+(.+)$/);
    if (m) {
      const [, qty, unitPrice, articleRef, pshRef, designation] = m;
      const cleanedDesignation = normalizeSupplierDesignationOcr(designation);
      if (!shouldIgnoreSupplierLine(cleanedDesignation, pshRef)) {
        lines.push(buildSupplierLine({
          designation: cleanedDesignation,
          originalReference: pshRef,
          internalReference: articleRef,
          quantity: parseFrenchNumber(qty),
          unitPrice: parseFrenchNumber(unitPrice),
          families,
        }));
      }
      continue;
    }

    m = row.match(/^(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d+)\s*([A-Z0-9+\-.]+)\s+([0-9.]+)\s+(.+?)\s+(\d+[.,]\d+)$/);
    if (m) {
      const [, qty, unitPrice, articleRef, pshRef, designation] = m;
      const cleanedDesignation = normalizeSupplierDesignationOcr(designation);
      if (!shouldIgnoreSupplierLine(cleanedDesignation, pshRef)) {
        lines.push(buildSupplierLine({
          designation: cleanedDesignation,
          originalReference: pshRef,
          internalReference: articleRef,
          quantity: parseFrenchNumber(qty),
          unitPrice: parseFrenchNumber(unitPrice),
          families,
        }));
      }
      continue;
    }

    const rawRow = rows[i] || '';
    m = rawRow.match(/^(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d+)\s*([A-Z0-9+\-.]+)\s+([0-9.]+)\s+(.+)$/);
    if (m) {
      const [, qty, unitPrice, articleRef, pshRef, designation] = m;
      const cleanedDesignation = normalizeSupplierDesignationOcr(designation);
      if (!shouldIgnoreSupplierLine(cleanedDesignation, pshRef)) {
        lines.push(buildSupplierLine({
          designation: cleanedDesignation,
          originalReference: pshRef,
          internalReference: articleRef,
          quantity: parseFrenchNumber(qty),
          unitPrice: parseFrenchNumber(unitPrice),
          families,
        }));
      }
    }
  }
  return lines;
}

function parseOskarbiLines(rows, families) {
  const lines = [];
  for (const row of rows) {
    const m = row.match(/^(\d+(?:[.,]\d+)?)\s+([A-Z0-9]+)\s+(.+?)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+\d+[.,]\d+\s+\d+[.,]\d+\s+(\d+[.,]\d+)$/);
    if (m) {
      const [, qty, ref, designation, unitPrice] = m;
      const cleanedDesignation = normalizeSupplierDesignationOcr(designation);
      if (!shouldIgnoreSupplierLine(cleanedDesignation, ref)) lines.push(buildSupplierLine({ designation: cleanedDesignation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families }));
    }
  }
  return lines;
}

function parseAjsLines(rows, families) {
  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    const compact = normalizeOcrCollapsedText((rows[i] || '').replace(/\s+/g, ' ').trim());
    if (/versandkosten|frais de port|transport/i.test(compact)) continue;

    let m = compact.match(/^([A-Z0-9\-]+)\s+(\d+(?:[.,]\d+)?)\s+pc\s+(\d+[.,]\d+)([A-Z])?\s+(.+)$/i);
    if (m) {
      const [, ref, qty, total, warehouse, designation] = m;
      const brandRow = normalizeOcrCollapsedText(rows[i + 1] || '');
      const priceRow = normalizeOcrCollapsedText(rows[i + 2] || '');
      const supplierBrand = /^[A-Z0-9\- ]{2,}$/.test(brandRow) ? brandRow : '';
      const unitPrice = (priceRow.match(/(\d+[.,]\d+)$/) || [])[1] || '';
      const cleanedDesignation = normalizeSupplierDesignationOcr(designation);
      if (!shouldIgnoreSupplierLine(cleanedDesignation, ref)) {
        lines.push(buildSupplierLine({
          designation: cleanedDesignation,
          originalReference: ref,
          internalReference: warehouse || '',
          quantity: parseFrenchNumber(qty),
          unitPrice: parseFrenchNumber(unitPrice) || (parseFrenchNumber(total) / (parseFrenchNumber(qty) || 1)),
          families,
          supplierBrand,
        }));
      }
      continue;
    }

    m = compact.match(/^(?:[A-Z]\s+)?([A-Z0-9\-]+)\s+([A-Z][A-Z0-9\-]+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+pc\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)$/i);
    if (m) {
      const [, warehouse, ref, designation, qty, total, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) {
        lines.push(buildSupplierLine({
          designation,
          originalReference: ref,
          internalReference: warehouse,
          quantity: parseFrenchNumber(qty),
          unitPrice: parseFrenchNumber(unitPrice) || (parseFrenchNumber(total) / (parseFrenchNumber(qty) || 1)),
          families,
        }));
      }
    }
  }
  return lines;
}

function parseTradexLines(rows, families) {
  const lines = [];
  for (const row of rows) {
    const m = row.match(/^([A-Z0-9\/.-]+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)$/);
    if (m) {
      const [, ref, designation, qty, unitPrice] = m;
      const cleanedDesignation = normalizeSupplierDesignationOcr(designation);
      if (!shouldIgnoreSupplierLine(cleanedDesignation, ref)) lines.push(buildSupplierLine({ designation: cleanedDesignation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families }));
    }
  }
  return lines;
}

function parseAutoPartnerInvoiceLines(rows, families) {
  const lines = [];
  const corrections = new Map();
  for (const row of rows) {
    let m = row.match(/^([+-])\s*([A-Z0-9\-\.]+)\s+(.+?)\s+\d+\s+(\d+(?:[.,]\d+)?)\s+(?:SZT|szt|pc)\s+(\d+[.,]\d+)\s+\d+[.,]\d+/i);
    if (m) {
      const [, sign, ref, designation, qty, unitPrice] = m;
      if (shouldIgnoreSupplierLine(designation, ref)) continue;
      const key = `${ref}__${designation}`;
      const current = corrections.get(key) || { ref, designation, qty: 0, unitPrice: parseFrenchNumber(unitPrice) };
      current.qty += (sign === '-' ? -1 : 1) * parseFrenchNumber(qty);
      corrections.set(key, current);
      continue;
    }
    m = row.match(/^\d+\s+([A-Z0-9\-\.]+)\s+(.+?)\s+\d+\s+(\d+(?:[.,]\d+)?)\s+(?:SZT|szt|pc)\s+(\d+[.,]\d+)\s+\d+%\s+(\d+[.,]\d+)/i);
    if (m) {
      const [, ref, designation, qty, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families }));
    }
  }
  if (corrections.size) {
    return [...corrections.values()].filter((item) => item.qty !== 0).map((item) => buildSupplierLine({ designation: item.designation, originalReference: item.ref, quantity: Math.abs(item.qty), unitPrice: item.unitPrice, families, note: item.qty < 0 ? 'Correction retour fournisseur' : 'Correction positive fournisseur' }));
  }
  return lines;
}

function parseDcaCommandLines(rows, families) {
  const lines = [];
  for (const rawRow of rows) {
    const row = normalizeOcrCollapsedText(rawRow || '');
    let m = row.match(/^(\d+(?:[.,]\d+)?)\s+([A-Z0-9\-]+)\s+-\s+(.+?)\s+(\d+[.,]\d+)\s+\d+\s*%.*?\s+(\d+[.,]\d+)\s+\d+$/);
    if (m) {
      const [, qty, ref, rawDesignation, unitPrice] = m;
      const designation = normalizeSupplierDesignationOcr(rawDesignation.replace(new RegExp(`\\s+${ref}$`), '').trim());
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families }));
      continue;
    }

    if (row.includes(' - ') && /\d+[.,]\d+/.test(row) && /%/.test(row)) {
      const parts = row.split(' - ');
      const left = parts[0] || '';
      const right = parts.slice(1).join(' - ');
      const qtyMatch = left.match(/^(\d+(?:[.,]\d+)?)/);
      const priceMatches = [...left.matchAll(/(\d+[.,]\d+)/g)].map((match) => match[1]);
      const refMatches = [...right.matchAll(/([A-Z0-9\-]{4,})/g)].map((match) => match[1]);
      const ref = refMatches.length ? refMatches[refMatches.length - 1] : '';
      const designation = normalizeSupplierDesignationOcr(right.replace(new RegExp(`${ref}\s*\d+\s*%.*$`), '').replace(/\s+/g, ' ').trim());
      if (ref && designation && !shouldIgnoreSupplierLine(designation, ref)) {
        lines.push(buildSupplierLine({
          designation,
          originalReference: ref,
          quantity: parseFrenchNumber((qtyMatch || [])[1] || 1),
          unitPrice: parseFrenchNumber(priceMatches[0] || 0),
          families,
        }));
      }
    }
  }
  return lines;
}

function parseDcaReturnLines(rows, families) {
  const lines = [];
  for (const row of rows) {
    const m = row.match(/^BL\s+\d+\s+\d{2}\/\d{2}\/\d{2}\s+([A-Z0-9\-]+)\s+[A-Z0-9\-]+\s+[A-Z0-9\-]+\s+(.+?)\s+(\d+(?:[.,]\d+)?)$/i);
    if (m) {
      const [, ref, designation, qty] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), families }));
    }
  }
  return lines;
}

function parsePreferenceLines(rows, families, isReturn = false) {
  const lines = [];
  for (const row of rows) {
    let m = row.match(/^([A-Z0-9]+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+0\s+\d+[.,]\d+\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)$/);
    if (m) {
      const [, ref, designation, qtyOrdered, qtyDelivered, unitPrice, total] = m;
      const qty = parseFrenchNumber(qtyDelivered) || parseFrenchNumber(qtyOrdered) || 1;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: qty, unitPrice: parseFrenchNumber(unitPrice) || (parseFrenchNumber(total) / qty), families }));
      continue;
    }
    m = row.match(/^-?1\s+(.+?)\s+([A-Z0-9]{4,})\s+-?1\s+-?\d+[.,]\d+\s+(\d+[.,]\d+)$/);
    if (m && isReturn) {
      const [, designation, ref, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: 1, unitPrice: parseFrenchNumber(unitPrice), families }));
    }
  }
  return lines;
}

function parseOttoGoLines(rows, families, isReturn = false) {
  const lines = [];
  for (const rawRow of rows) {
    const row = normalizeOcrCollapsedText(rawRow || '');
    let m = row.match(/^(\d+(?:[.,]\d+)?)\s+([A-Z0-9]+)\s+(.+?)\s+\d+[.,]\d+\s+\d+[.,]\d+\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+\d+$/);
    if (m) {
      const [, qty, ref, designation, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families }));
      continue;
    }
    if (!isReturn && row.includes('consigne')) continue;
    m = row.match(/^\d+\s+([A-Z0-9]+)\s+(\d+(?:[.,]\d+)?)\s+\d+\s+\d{2}\/\d{2}\/\d{4}/);
    if (m && isReturn) {
      const [, ref, qty] = m;
      lines.push(buildSupplierLine({ designation: `Retour ${ref}`, originalReference: ref, quantity: parseFrenchNumber(qty), families }));
    }
  }
  return lines;
}

function parseExadisBlLines(rows, families) {
  const lines = [];
  for (let i = 0; i < rows.length - 3; i++) {
    const exadisRef = rows[i];
    if (!/^\d{6,}$/.test(exadisRef)) continue;
    const designation = cleanSupplierDesignation(rows[i + 1] || '');
    const refRow = rows[i + 2] || '';
    const qtyRow = rows[i + 4] || rows[i + 3] || '';
    const qtyMatch = qtyRow.match(/(\d+(?:[.,]\d+)?)\s+PCE/i);
    const supplierRef = (refRow.match(/^([A-Z0-9\-.\/]+)/i) || [])[1] || '';
    if (designation && supplierRef && qtyMatch && !shouldIgnoreSupplierLine(designation, supplierRef)) {
      lines.push(buildSupplierLine({ designation, originalReference: supplierRef, internalReference: exadisRef, quantity: parseFrenchNumber(qtyMatch[1]), families, note: `Réf. Exadis: ${exadisRef}` }));
    }
  }
  return lines;
}

function parseExadisReturnLines(rows, families) {
  const lines = [];
  for (const row of rows) {
    const m = row.match(/^\d+\s+([A-Z0-9 ]+?)\s+(.+?)\s+\d+\s+[A-Z0-9\/ ]+\s+\d+[.,]\d+$/);
    if (m) {
      const [, ref, designation] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref.trim(), quantity: 1, families, note: 'Retour / consigne' }));
    }
  }
  return lines;
}

function parseAcrLines(rows, families, isReturn = false) {
  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    const compact = normalizeOcrCollapsedText((rows[i] || '').replace(/\s+/g, ' ').trim());

    let m = compact.match(/^(.+?)\s+([A-Z][A-Z0-9\- ]{2,})\s+([A-Z0-9\-]{4,})\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+(?:[.,]\d+)?)$/);
    if (m) {
      const [, designation, supplierBrand, ref, qty, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) {
        lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families, supplierBrand }));
      }
      continue;
    }

    if (!isReturn) {
      const nextRow = normalizeOcrCollapsedText(rows[i + 1] || '');
      const detailRow = normalizeOcrCollapsedText(rows[i + 2] || '');
      const trailingRow = normalizeOcrCollapsedText(rows[i + 3] || '');
      const detailMatch = detailRow.match(/^([A-Z0-9\-]{4,})\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+(?:[.,]\d+)?)$/);
      if (detailMatch && compact && !/^(?:designation|commandee|prix|unitaire|remise|total|commentaire|vehicule|marque|version|kilometrage|immatriculation|date d'envoi|n° de)/i.test(normalizeSupplierText(compact))) {
        const [, ref, qty, unitPrice] = detailMatch;
        let designation = compact;
        let supplierBrand = '';
        const brandMatch = compact.match(/^(.+?)\s+([A-Z][A-Z0-9\-]+(?:\s+[A-Z][A-Z0-9\-]+)*)$/);
        if (brandMatch) {
          designation = brandMatch[1].trim();
          supplierBrand = brandMatch[2].trim();
        }
        if (/^[A-Z0-9\- ]{2,}$/.test(nextRow) && !/^(?:pa\d|total|commentaire)/i.test(nextRow)) {
          supplierBrand = `${supplierBrand ? `${supplierBrand} ` : ''}${nextRow}`.trim();
        }
        if (!shouldIgnoreSupplierLine(designation, ref)) {
          lines.push(buildSupplierLine({
            designation,
            originalReference: ref,
            quantity: parseFrenchNumber(qty),
            unitPrice: parseFrenchNumber(unitPrice),
            families,
            supplierBrand,
          }));
          i += trailingRow && /^(\d+(?:[.,]\d+)?)$/.test(trailingRow) ? 3 : 2;
          continue;
        }
      }
    }

    m = compact.match(/^\d+\/?\d*\s+([A-Z]{2,}\s*[0-9A-Z]+)\s+(.+?)\s+\d+\s+\d+\s+(\d+[.,]\d+)\s+.*?(\d+[.,]\d+)$/);
    if (m && isReturn) {
      const [, ref, designation, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref.replace(/\s+/g, ''), quantity: 1, unitPrice: parseFrenchNumber(unitPrice), families, note: 'Avoir fournisseur' }));
    }
  }
  return lines;
}

function parseInterCarsColumnTable(rows, families, isReturn = false) {
  const seq = collectSequentialItemNumbers(rows);
  if (!seq) return [];

  const refRows = [];
  for (let i = seq.end + 1; i < rows.length && refRows.length < seq.count; i += 1) {
    const row = rows[i];
    if (!isLikelyRefDesignationRow(row)) continue;
    const match = row.match(/^([A-Z0-9][A-Z0-9 .+\-\/]{1,})\s+(.+)$/);
    if (!match) continue;
    const ref = String(match[1] || '').trim();
    const designation = String(match[2] || '').trim();
    if (!ref || !designation || shouldIgnoreSupplierLine(designation, ref)) continue;
    refRows.push({ ref, designation });
  }

  if (!refRows.length) return [];

  const quantities = [];
  for (let i = seq.end + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!/^\d+(?:[.,]\d+)?,?$/.test(row)) continue;
    const value = parseLooseQuantityToken(row);
    if (!(value > 0)) continue;
    quantities.push(value);
    if (quantities.length >= refRows.length) break;
  }

  return refRows.map((item, index) => buildSupplierLine({
    designation: item.designation,
    originalReference: item.ref,
    quantity: quantities[index] || 1,
    families,
    note: isReturn ? 'Retour / correction Inter Cars' : '',
  }));
}

function parseInterCarsInvoiceLines(rows, families) {
  const inlineLines = parseNumberedTableLines(rows, families);
  const columnLines = parseInterCarsColumnTable(rows, families, false);
  return dedupeSupplierLines([...inlineLines, ...columnLines]);
}

function parseInterCarsCreditLines(rows, families) {
  const inlineLines = parseNumberedTableLines(rows, families).map((line) => ({ ...line, note: 'Retour / correction Inter Cars' }));
  const columnLines = parseInterCarsColumnTable(rows, families, true);
  if (inlineLines.length || columnLines.length) {
    return dedupeSupplierLines([...inlineLines, ...columnLines]);
  }
  const lines = [];
  for (const row of rows) {
    const m = row.match(/^([A-Z0-9\-]+)\s+(.+?)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+0,00\s+0\s+0$/);
    if (m) {
      const [, ref, designation, qty, unitPrice] = m;
      if (!shouldIgnoreSupplierLine(designation, ref)) lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: parseFrenchNumber(qty), unitPrice: parseFrenchNumber(unitPrice), families, note: 'Retour / correction Inter Cars' }));
    }
  }
  return lines;
}

function parseGenericLines(rows, families) {
  const lines = [];
  for (const row of rows) {
    if (row.length < 8) continue;
    const refMatch = row.match(/\b([A-Z0-9][A-Z0-9\-\/.+]{2,})\b/);
    const priceMatches = [...row.matchAll(/\b\d+[.,]\d{2}\b/g)].map((m) => m[0]);
    const qtyMatch = row.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s+(?:pc|pcs|pce|szt|set|la piece|piece|qt[eé]|quantit[eé]))?/i);
    if (!refMatch) continue;
    const ref = refMatch[1];
    let designation = row.replace(ref, ' ').replace(/\b\d+[.,]\d{2}\b/g, ' ').replace(/\b\d+(?:[.,]\d+)?\b/g, ' ').replace(/\s+/g, ' ').trim();
    designation = designation.replace(/^(pc|pcs|pce|szt|set)\s+/i, '').trim();
    if (!designation || designation.length < 3 || shouldIgnoreSupplierLine(designation, ref)) continue;
    lines.push(buildSupplierLine({ designation, originalReference: ref, quantity: qtyMatch ? parseFrenchNumber(qtyMatch[1]) : 1, unitPrice: priceMatches.length ? parseFrenchNumber(priceMatches[0]) : 0, families }));
  }
  return lines;
}

function dedupeSupplierLines(lines = []) {
  const map = new Map();
  for (const line of lines) {
    const key = `${line.originalReference || ''}__${line.designation || ''}__${line.destination || 'stock'}`;
    if (!map.has(key)) {
      map.set(key, { ...line });
    } else {
      const current = map.get(key);
      current.quantity = Number(current.quantity || 0) + Number(line.quantity || 0);
      if (!current.unitPrice && line.unitPrice) current.unitPrice = line.unitPrice;
      if (!current.internalReference && line.internalReference) current.internalReference = line.internalReference;
      if (!current.note && line.note) current.note = line.note;
    }
  }
  return [...map.values()].filter((line) => line.designation && Number(line.quantity || 0) > 0);
}

function toStrictSupplierLines(lines = [], families = []) {
  return dedupeSupplierLines((lines || []).map((line) => buildSupplierLine({
    designation: line.designation || '',
    originalReference: line.originalReference || line.internalReference || '',
    quantity: Math.max(1, Number(line.quantity || 1)),
    families,
    destination: line.destination || 'stock',
    clientName: line.clientName || '',
    note: line.note || '',
    supplierBrand: line.supplierBrand || '',
  })));
}


function normalizeOcrReference(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[\s_]+/g, '')
    .replace(/[|]/g, '1')
    .replace(/[OQ]/g, '0')
    .replace(/I/g, '1')
    .replace(/[^A-Z0-9\-\/.+]/g, '');
}

function cleanSupplierDesignation(value) {
  return String(value || '')
    .replace(/\b(?:pcs?|pce|szt|set|qty|qte|quantite|quantité)\b/gi, ' ')
    .replace(/[|]/g, ' ')
    .replace(/[_]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOcrCollapsedText(value = '') {
  return String(value || '')
    .replace(/([A-ZÀ-Ý])\s+(?=[A-ZÀ-Ý]\b)/g, '$1')
    .replace(/\b([A-ZÀ-Ý]{1,4})\s+([A-ZÀ-Ý]{1,4})\s+([A-ZÀ-Ý]{1,4})\b/g, (_, a, b, c) => `${a}${b}${c}`)
    .replace(/\b([A-ZÀ-Ý]{1,4})\s+([A-ZÀ-Ý]{1,4})\b/g, (_, a, b) => `${a}${b}`)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSupplierDesignationOcr(value = '') {
  return cleanSupplierDesignation(value)
    .replace(/TRANSM\s*ISSION/gi, 'TRANSMISSION')
    .replace(/ROULEM\s*ENTDE\s*ROUE/gi, 'ROULEMENT DE ROUE')
    .replace(/ROULEM\s*ENT\s*DE\s*ROUE/gi, 'ROULEMENT DE ROUE')
    .replace(/COO:\s*[A-Z* ]+$/i, '')
    .trim();
}

function analyzeSupplierLine(line, products = []) {
  const reference = normalizeOcrReference(line.originalReference || line.internalReference || '');
  const designation = cleanSupplierDesignation(line.designation || '');
  const quantity = Number(line.quantity || 0);
  const hasDigits = /\d/.test(reference);
  const issues = [];
  if (!reference) issues.push('Référence manquante');
  else if (reference.length < 4) issues.push('Référence trop courte');
  else if (!hasDigits) issues.push('Référence à vérifier');
  if (!designation || designation.length < 4) issues.push('Désignation incomplète');
  if (!(quantity > 0)) issues.push('Quantité invalide');
  if (/^(facture|total|transport|emballage|port|consigne|remise|net a payer|net à payer|tva)$/i.test(designation)) issues.push('Ligne non produit');
  const existingProduct = products.find((product) => {
    const productOriginal = normalizeOcrReference(product.originalReference || '');
    const productInternal = normalizeOcrReference(product.internalReference || '');
    return (reference && (productOriginal === reference || productInternal === reference))
      || (!reference && designation && product.name === designation);
  }) || null;
  let confidence = 100;
  if (!reference) confidence -= 45;
  else if (reference.length < 4) confidence -= 25;
  else if (!hasDigits) confidence -= 15;
  if (!designation || designation.length < 4) confidence -= 35;
  if (!(quantity > 0)) confidence -= 35;
  if (issues.includes('Ligne non produit')) confidence = Math.min(confidence, 20);
  if (existingProduct) confidence += 10;
  confidence = Math.max(0, Math.min(100, confidence));
  const severity = issues.includes('Ligne non produit') || issues.includes('Référence manquante') || issues.includes('Désignation incomplète') || issues.includes('Quantité invalide')
    ? 'critical'
    : confidence >= 85
      ? 'good'
      : 'warning';
  const statusLabel = severity === 'good' ? 'Fiable' : severity === 'warning' ? 'À vérifier' : 'Bloquante';
  return {
    reference,
    designation,
    quantity,
    existingProduct,
    issues,
    confidence,
    severity,
    statusLabel,
  };
}

function parseSupplierDocumentLines(rawText, families = []) {
  const rows = parseRows(rawText);
  const supplierModel = detectSupplierModel(rawText);
  const documentType = detectSupplierDocumentType(rawText);
  let parsed = [];
  if (supplierModel === 'PROCODIS') parsed = parseProcodisLines(rows, families);
  else if (supplierModel === 'WAI') parsed = parseWaiLines(rows, families);
  else if (supplierModel === 'OSKARBI') parsed = parseOskarbiLines(rows, families);
  else if (supplierModel === 'AJS PARTS') parsed = parseAjsLines(rows, families);
  else if (supplierModel === 'TRADEX') parsed = parseTradexLines(rows, families);
  else if (supplierModel === 'AUTO PARTNER') parsed = parseAutoPartnerInvoiceLines(rows, families);
  else if (supplierModel === 'DCA') parsed = documentType === 'BL retour' ? parseDcaReturnLines(rows, families) : parseDcaCommandLines(rows, families);
  else if (supplierModel === 'PREFERENCE SEINE') parsed = parsePreferenceLines(rows, families, documentType === 'BL retour');
  else if (supplierModel === 'OTTOGO') parsed = parseOttoGoLines(rows, families, documentType === 'BL retour');
  else if (supplierModel === 'EXADIS') parsed = documentType === 'BL retour' ? parseExadisReturnLines(rows, families) : parseExadisBlLines(rows, families);
  else if (supplierModel === 'ACR') parsed = parseAcrLines(rows, families, documentType === 'BL retour');
  else if (supplierModel === 'INTER CARS') parsed = documentType === 'BL retour' ? parseInterCarsCreditLines(rows, families) : parseInterCarsInvoiceLines(rows, families);
  if (!parsed.length) parsed = parseGenericLines(rows, families);
  return { supplierModel, documentType, lines: toStrictSupplierLines(parsed, families) };
}

async function extractPdfTextFromFile(file) {
  const pdfjsLib = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items || [])
      .map((item) => ({
        str: String(item.str || '').trim(),
        x: Number(item.transform?.[4] || 0),
        y: Number(item.transform?.[5] || 0),
      }))
      .filter((item) => item.str);
    const lines = [];
    for (const item of items) {
      const existing = lines.find((line) => Math.abs(line.y - item.y) <= 2.2);
      if (existing) {
        existing.items.push(item);
        existing.y = (existing.y + item.y) / 2;
      } else {
        lines.push({ y: item.y, items: [item] });
      }
    }
    const pageLines = lines
      .sort((a, b) => b.y - a.y)
      .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    pages.push(pageLines.join('\n'));
  }
  return pages.join('\n');
}

function formatClientPurchaseStatus(purchase) {
  if (Number(purchase.remainingQuantity || 0) <= 0) return 'payé';
  if (Number(purchase.remainingQuantity || 0) < Number(purchase.quantity || 0)) return 'partiellement payé';
  return 'non payé';
}

function allocateClientPayment(purchases, amount) {
  let remainingAmount = Number(amount || 0);
  const ordered = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const updatedMap = new Map();
  const archivedItems = [];

  for (const purchase of ordered) {
    const unitPrice = Number(purchase.price || 0);
    const currentRemainingQty = Number(purchase.remainingQuantity ?? purchase.quantity ?? 0);
    let nextPurchase = { ...purchase, remainingQuantity: currentRemainingQty };
    if (remainingAmount > 0 && unitPrice > 0 && currentRemainingQty > 0) {
      const payableQty = Math.min(currentRemainingQty, Math.floor((remainingAmount + 0.0001) / unitPrice));
      if (payableQty > 0) {
        const paidTotal = payableQty * unitPrice;
        nextPurchase.remainingQuantity = currentRemainingQty - payableQty;
        archivedItems.push({
          purchaseId: purchase.id,
          designation: purchase.designation,
          quantity: payableQty,
          unitPrice,
          total: paidTotal,
          date: purchase.date,
        });
        remainingAmount -= paidTotal;
      }
    }
    nextPurchase.status = formatClientPurchaseStatus(nextPurchase);
    updatedMap.set(purchase.id, nextPurchase);
  }

  const updatedPurchases = purchases.map((purchase) => updatedMap.get(purchase.id) || purchase);
  return { updatedPurchases, archivedItems, unappliedAmount: remainingAmount };
}


class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Erreur d’affichage du module.' };
  }

  componentDidCatch(error) {
    console.error('ModuleErrorBoundary', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel premium-panel">
          <div className="panel-header"><h3>Le module a rencontré une erreur</h3></div>
          <div className="alert error">{this.state.message || 'Une erreur est survenue.'}</div>
          <div className="hint">Recharge la page. Si l’erreur revient, le document en cours contient probablement une ligne à corriger.</div>
        </section>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [users, setUsers] = useLocalStorage('tkpa-users', initialUsers);
  const [products, setProducts] = useLocalStorage('tkpa-products', initialProducts);
  const [orderRequests, setOrderRequests] = useLocalStorage('tkpa-order-requests', []);
  const [quotes, setQuotes] = useLocalStorage('tkpa-quotes', initialQuotes);
  const [quoteDraft, setQuoteDraft] = useLocalStorage('tkpa-quote-draft', emptyQuote());
  const [clients, setClients] = useLocalStorage('tkpa-clients', initialClients);
  const [suppliers, setSuppliers] = useLocalStorage('tkpa-suppliers', initialSuppliers);
  const [finance, setFinance] = useLocalStorage('tkpa-finance', initialFinanceTransactions);
  const [receipts, setReceipts] = useLocalStorage('tkpa-receipts', initialDailyReceipts);
  const [auditLog, setAuditLog] = useLocalStorage('tkpa-audit', initialAuditLog);

  const [session, setSession] = useLocalStorage('tkpa-session', null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

  const safeUsers = Array.isArray(users) && users.length ? users : initialUsers;

  const allowedModules = useMemo(() => {
    const base = session?.permissions || [];
    if (session?.role === 'Administrateur') {
      const next = [...base];
      if (!next.includes('commandes')) next.push('commandes');
      return next;
    }
    return base;
  }, [session]);

  const visibleCounts = {
    produits: products.filter((p) => !p.archived).length,
    devis: quotes.length,
    clients: clients.filter((c) => !c.archived).length,
    fournisseurs: suppliers.length,
    archives: auditLog.length,
    reglements: finance.length,
    recettes: receipts.length,
    commandes: orderRequests.length + products.filter((p) => !p.archived && Number(p.quantity) <= 0).length,
  };

  const addAudit = (action, entity) => {
    setAuditLog((prev) => [{ id: crypto.randomUUID(), date: new Date().toISOString(), user: session?.fullName || 'Système', action, entity }, ...prev]);
  };

  const backupAll = () => downloadJSONBackup({ products, quotes, clients, suppliers, finance, receipts, users: safeUsers, auditLog });

  if (!session) {
    return <LoginScreen users={safeUsers} onLogin={setSession} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-card">
            <img className="brand-logo" src={company.logoPath} alt={company.name} />
            <div>
              <h1>{company.name}</h1>
              <p>{company.tagline}</p>
            </div>
          </div>
          <nav className="nav-list">
            {modules
              .filter((m) => allowedModules.includes(m.key))
              .map((module) => (
                <button
                  key={module.key}
                  className={`nav-btn ${activeModule === module.key ? 'active' : ''}`}
                  onClick={() => setActiveModule(module.key)}
                >
                  {module.label}
                </button>
              ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="mini-user">
            <strong>{session.fullName}</strong>
            <span>{session.role}</span>
          </div>
          <button className="secondary-btn" onClick={backupAll}>Sauvegarder</button>
          <button className="secondary-btn" onClick={() => setSession(null)}>Déconnexion</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>{modules.find((m) => m.key === activeModule)?.label}</h2>
            <p>Interface simple, claire et responsive</p>
          </div>
          <input
            className="search-input"
            placeholder="Recherche rapide globale"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </header>

        {activeModule === 'dashboard' && (
          <Dashboard company={company} counts={visibleCounts} auditLog={auditLog} products={products} finance={finance} receipts={receipts} />
        )}
        {activeModule === 'stock' && (
          <StockModule
            products={products}
            setProducts={setProducts}
            suppliers={suppliers}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
            addAudit={addAudit}
            quoteDraft={quoteDraft}
            setQuoteDraft={setQuoteDraft}
          />
        )}
        {activeModule === 'commandes' && (
          <OrderRequestsModule
            products={products}
            requests={orderRequests}
            setRequests={setOrderRequests}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
            addAudit={addAudit}
          />
        )}
        {activeModule === 'devis' && (
          <QuotesModule
            quotes={quotes}
            setQuotes={setQuotes}
            products={products}
            clients={clients}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
            addAudit={addAudit}
            quoteDraft={quoteDraft}
            setQuoteDraft={setQuoteDraft}
          />
        )}
        {activeModule === 'clients' && (
          <ClientsModule clients={clients} setClients={setClients} globalSearch={globalSearch} addAudit={addAudit} />
        )}
        {activeModule === 'fournisseurs' && (
          <SuppliersModule suppliers={suppliers} setSuppliers={setSuppliers} products={products} setProducts={setProducts} clients={clients} globalSearch={globalSearch} addAudit={addAudit} />
        )}
        {activeModule === 'finance' && (
          <FinanceModule
            finance={finance}
            setFinance={setFinance}
            receipts={receipts}
            setReceipts={setReceipts}
            globalSearch={globalSearch}
            addAudit={addAudit}
          />
        )}
        {activeModule === 'utilisateurs' && session.role === 'Administrateur' && (
          <UsersModule users={safeUsers} setUsers={setUsers} addAudit={addAudit} />
        )}
      </main>
    </div>
  );
}

function LoginScreen({ users, onLogin }) {
  const fallbackUsers = Array.isArray(users) && users.length ? users : initialUsers;
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const user = fallbackUsers.find((u) => u.username === username && u.password === password);
    if (!user) {
      setError('Identifiants invalides');
      return;
    }
    onLogin(user);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img className="login-logo" src={company.logoPath} alt={company.name} />
        <h1>{company.name}</h1>
        <p>Connexion sécurisée</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Identifiant" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" type="password" />
        {error && <div className="alert error">{error}</div>}
        <button className="primary-btn">Se connecter</button>
        <div className="hint">Compte admin : admin / admin</div>
      </form>
    </div>
  );
}

function Dashboard({ company, counts, auditLog, products, finance, receipts }) {
  const totalFinance = finance.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalReceipts = receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const activeProducts = (products || []).filter((p) => !p.archived);
  const ruptures = activeProducts.filter((p) => Number(p.quantity || 0) <= 0).length;
  const low = activeProducts.filter(
    (p) => Number(p.quantity || 0) > 0 && Number(p.quantity || 0) <= lowStockThreshold
  ).length;

  const quickStats = [
    { label: 'Produits actifs', value: activeProducts.length, tone: 'blue' },
    { label: 'Devis enregistrés', value: counts.devis, tone: 'gold' },
    { label: 'Clients actifs', value: counts.clients, tone: 'blue' },
    { label: 'Fournisseurs', value: counts.fournisseurs, tone: 'blue' },
    { label: 'Pièces en rupture', value: ruptures, tone: ruptures ? 'danger' : 'success' },
    { label: 'Stock faible', value: low, tone: low ? 'warning' : 'success' },
    { label: 'Paiements reçus', value: formatCurrency(totalFinance), tone: 'success' },
    { label: 'Recettes espèces', value: formatCurrency(totalReceipts), tone: 'gold' },
  ];

  return (
    <div className="grid gap-16 dashboard-layout">
      <section className="dashboard-hero panel">
        <div className="dashboard-hero-overlay" />
        <img className="dashboard-hero-image" src={company.dashboardHeroPath} alt={company.name} />
        <div className="dashboard-hero-content">
          <div className="dashboard-badge">Tableau de bord premium</div>
          <h3>{company.name}</h3>
          <p>
            Vue d’ensemble du magasin, des ruptures, des paiements et de l’activité quotidienne
            avec une présentation plus classe et plus professionnelle.
          </p>
          <div className="dashboard-contact-row">
            <span>☎ {company.phone}</span>
            <span>WhatsApp {company.whatsapp}</span>
          </div>
        </div>
      </section>

      <section className="stats-grid dashboard-stats-grid">
        {quickStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </section>

      <section className="dashboard-secondary-grid">
        <div className="panel premium-panel">
          <div className="panel-header">
            <div>
              <h3>Résumé rapide</h3>
              <p>Points de contrôle importants pour le magasin.</p>
            </div>
          </div>
          <div className="dashboard-summary-list">
            <div>
              <strong>{ruptures}</strong>
              <span>pièces à réapprovisionner immédiatement</span>
            </div>
            <div>
              <strong>{low}</strong>
              <span>références à surveiller de près</span>
            </div>
            <div>
              <strong>{counts.devis}</strong>
              <span>devis disponibles à revoir ou imprimer</span>
            </div>
            <div>
              <strong>{counts.clients}</strong>
              <span>comptes clients à suivre</span>
            </div>
          </div>
        </div>

        <div className="panel premium-panel">
          <div className="panel-header">
            <div>
              <h3>Recettes et encaissements</h3>
              <p>Visibilité directe sur les flux enregistrés.</p>
            </div>
          </div>
          <div className="dashboard-money-cards">
            <div className="money-card money-card-blue">
              <span>Transactions finance</span>
              <strong>{formatCurrency(totalFinance)}</strong>
            </div>
            <div className="money-card money-card-gold">
              <span>Recettes journalières</span>
              <strong>{formatCurrency(totalReceipts)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel premium-panel">
        <div className="panel-header">
          <div>
            <h3>Historique des modifications</h3>
            <p>Dernières opérations réalisées dans l’application.</p>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Élément</th></tr></thead>
          <tbody>
            {auditLog.slice(0, 10).map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.date)}</td>
                <td>{log.user}</td>
                <td>{log.action}</td>
                <td>{log.entity}</td>
              </tr>
            ))}
            {!auditLog.length && <tr><td colSpan="4">Aucune modification enregistrée.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone = 'blue' }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStockStatus(quantity) {
  const qty = Number(quantity || 0);
  if (qty <= 0) return 'rupture';
  if (qty <= lowStockThreshold) return 'faible';
  return 'normal';
}

function StockModule({ products, setProducts, suppliers, globalSearch, setGlobalSearch, addAudit, quoteDraft, setQuoteDraft }) {
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedSubfamily, setSelectedSubfamily] = useState('Toutes');
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState('courant');
  const [form, setForm] = useState(emptyProduct());
  const [stockCart, setStockCart] = useState([]);

  const familyData = initialFamilies;
  const search = globalSearch.toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (product.archived) return false;
    const familyOk = selectedFamily ? product.family === selectedFamily.name : true;
    const subfamilyOk = selectedSubfamily === 'Toutes' ? true : product.subfamily === selectedSubfamily;
    const searchOk = search
      ? [product.name, product.internalReference, product.originalReference, product.family, product.subfamily].join(' ').toLowerCase().includes(search)
      : true;
    const status = getStockStatus(product.quantity);
    const statusOk = viewMode === 'courant' ? true : viewMode === 'rupture' ? status === 'rupture' : status === 'faible';
    return familyOk && subfamilyOk && searchOk && statusOk;
  });

  const lowStock = products.filter((p) => !p.archived && Number(p.quantity) > 0 && Number(p.quantity) <= lowStockThreshold);
  const outOfStock = products.filter((p) => !p.archived && Number(p.quantity) <= 0);
  const cartTotal = stockCart.filter((item) => item.selected).reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    if (editing) {
      setProducts((prev) => prev.map((p) => (p.id === editing ? { ...p, ...form } : p)));
      addAudit('Modification', `Produit ${form.name}`);
    } else {
      setProducts((prev) => [{ id: crypto.randomUUID(), ...form, archived: false }, ...prev]);
      addAudit('Ajout', `Produit ${form.name}`);
    }
    setForm(emptyProduct(selectedFamily?.name));
    setEditing(null);
  };

  const editProduct = (product) => {
    setEditing(product.id);
    setForm({ ...product });
  };

  const archiveProduct = (id) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, archived: true } : p)));
    addAudit('Archivage', 'Produit stock');
  };

  const addProductToCart = (product) => {
    setStockCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => item.productId === product.id
          ? { ...item, quantity: Math.min(Number(item.quantity || 0) + 1, Number(product.quantity || 0) || 1), selected: true }
          : item);
      }
      return [{
        saleId: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        internalReference: product.internalReference || '',
        family: product.family,
        subfamily: product.subfamily,
        quantity: 1,
        unitPrice: Number(product.privatePrice || 0),
        maxQuantity: Number(product.quantity || 0),
        selected: true,
      }, ...prev];
    });
  };

  const addProductToQuote = (product) => {
    const customerType = quoteDraft?.customerType || 'particulier';
    const unitTTC = customerType === 'professionnel' ? Number(product.proPrice || 0) : Number(product.privatePrice || 0);
    const tva = 20;
    const unitHT = unitTTC / (1 + tva / 100);
    setQuoteDraft((prev) => ({
      ...(prev || emptyQuote()),
      customerType,
      lines: [
        ...((prev?.lines) || []),
        {
          id: crypto.randomUUID(),
          source: 'stock',
          designation: product.name,
          internalReference: product.internalReference,
          originalReference: product.originalReference,
          family: product.family,
          subfamily: product.subfamily,
          quantity: 1,
          unitHT: Number(unitHT.toFixed(2)),
          unitTTC,
          tva,
          totalHT: Number(unitHT.toFixed(2)),
          totalTTC: Number(unitTTC.toFixed(2)),
        },
      ],
    }));
    addAudit('Préparation devis', `Pièce ajoutée au devis depuis le stock : ${product.name}`);
  };

  const updateCartItem = (saleId, patch) => {
    setStockCart((prev) => prev.map((item) => item.saleId === saleId ? { ...item, ...patch } : item));
  };

  const removeCartItem = (saleId) => {
    setStockCart((prev) => prev.filter((item) => item.saleId !== saleId));
  };

  const payCartSelection = () => {
    const selectedItems = stockCart.filter((item) => item.selected);
    if (!selectedItems.length) return;
    setProducts((prev) => prev.map((product) => {
      const cartItem = selectedItems.find((item) => item.productId === product.id);
      if (!cartItem) return product;
      const soldQty = Math.min(Number(cartItem.quantity || 0), Number(product.quantity || 0));
      const nextQty = Math.max(0, Number(product.quantity || 0) - soldQty);
      return {
        ...product,
        quantity: nextQty,
        comment: nextQty === 0 ? 'Pièce en rupture à recommander' : product.comment,
      };
    }));
    addAudit('Vente', `Sortie stock rapide (${selectedItems.length} pièce(s))`);
    setStockCart((prev) => prev.filter((item) => !item.selected));
  };

  const printRestock = () => {
    const rows = outOfStock.map((p) => `<tr><td>${p.name}</td><td>${p.internalReference || '-'}</td><td>${p.family}</td><td>${p.subfamily}</td><td>${p.quantity}</td></tr>`).join('');
    printHTML('Liste de réapprovisionnement', `<h1>${company.name}</h1><h2>Pièces en rupture à réapprovisionner</h2><table><thead><tr><th>Produit</th><th>Référence interne</th><th>Famille</th><th>Sous-famille</th><th>Qté</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Aucune pièce en rupture.</td></tr>"}</tbody></table>`);
  };

  return (
    <div className="grid gap-16">
      <section className="panel premium-panel stock-hero-panel">
        <div className="stock-hero-grid">
          <div>
            <div className="stock-kicker">Module stock</div>
            <h3 className="stock-hero-title">Recherche rapide et navigation propre par familles</h3>
            <p className="stock-hero-text">Retrouve une pièce plus vite, ajoute-la au devis en cours ou à la sélection client, sans modifier le stock.</p>
            <div className="stock-hero-actions">
              <button className="secondary-btn" onClick={() => { setSelectedFamily(null); setSelectedSubfamily('Toutes'); setViewMode('courant'); }}>Voir toutes les familles</button>
              <button className="secondary-btn" onClick={printRestock}>Imprimer réappro</button>
            </div>
          </div>
          <div className="stock-search-card">
            <label>Recherche pièce / référence / famille</label>
            <input
              className="stock-search-input"
              placeholder="Exemple : disque, plaquette, DF-9081"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            <div className="stock-search-meta">
              <span>{filteredProducts.length} résultat(s)</span>
              <span>{selectedFamily ? selectedFamily.name : 'Toutes les familles'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel premium-panel">
        <div className="panel-header space-between">
          <div>
            <h3>Organisation du stock</h3>
            <p>Navigation par familles principales puis sous-familles, avec une zone de sélection rapide client.</p>
          </div>
        </div>

        <div className="status-cards-grid">
          <button className={`status-card ${viewMode === 'courant' ? 'selected' : ''}`} onClick={() => setViewMode('courant')}>
            <span>Produits visibles</span><strong>{filteredProducts.length}</strong>
          </button>
          <button className={`status-card danger ${viewMode === 'rupture' ? 'selected' : ''}`} onClick={() => setViewMode('rupture')}>
            <span>Pièces en rupture</span><strong>{outOfStock.length}</strong>
          </button>
          <button className={`status-card warning ${viewMode === 'faible' ? 'selected' : ''}`} onClick={() => setViewMode('faible')}>
            <span>Stock faible</span><strong>{lowStock.length}</strong>
          </button>
        </div>

        {!selectedFamily ? (
          <div className="cards-grid stock-family-grid">
            {familyData.map((family) => (
              <button key={family.id} className="family-card pro stock-family-card" onClick={() => { setSelectedFamily(family); setSelectedSubfamily('Toutes'); setForm((prev) => ({ ...prev, family: family.name, subfamily: family.subfamilies[0] })); }}>
                <span className="stock-family-badge">Famille</span>
                <strong>{family.name}</strong>
                <span>{family.subfamilies.length} sous-familles</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="breadcrumbs">Stock / {selectedFamily.name}</div>
            <div className="subfamily-tabs">
              <button className={selectedSubfamily === 'Toutes' ? 'chip active' : 'chip'} onClick={() => setSelectedSubfamily('Toutes')}>Toutes</button>
              {selectedFamily.subfamilies.map((sub) => (
                <button key={sub} className={selectedSubfamily === sub ? 'chip active' : 'chip'} onClick={() => setSelectedSubfamily(sub)}>{sub}</button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="two-cols stock-layout">
        <form className="panel premium-panel" onSubmit={submit}>
          <div className="panel-header"><h3>{editing ? 'Modifier un produit' : 'Ajouter un produit'}</h3></div>
          <div className="form-grid">
            <input placeholder="Nom du produit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select value={form.family} onChange={(e) => {
              const family = familyData.find((f) => f.name === e.target.value);
              setForm({ ...form, family: e.target.value, subfamily: family?.subfamilies?.[0] || '' });
            }}>
              <option value="">Famille principale</option>
              {familyData.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
            <select value={form.subfamily} onChange={(e) => setForm({ ...form, subfamily: e.target.value })}>
              <option value="">Famille secondaire</option>
              {(familyData.find((f) => f.name === form.family)?.subfamilies || []).map((s) => <option key={s}>{s}</option>)}
            </select>
            <input placeholder="Référence d’origine" value={form.originalReference} onChange={(e) => setForm({ ...form, originalReference: e.target.value })} />
            <input placeholder="Référence interne" value={form.internalReference} onChange={(e) => setForm({ ...form, internalReference: e.target.value })} />
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Fournisseur</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Quantité en stock" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            <input type="number" step="0.01" placeholder="Prix client particulier" value={form.privatePrice} onChange={(e) => setForm({ ...form, privatePrice: Number(e.target.value) })} />
            <input type="number" step="0.01" placeholder="Prix client professionnel" value={form.proPrice} onChange={(e) => setForm({ ...form, proPrice: Number(e.target.value) })} />
            <textarea placeholder="Remarque / commentaire" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          </div>
          <div className="inline-actions">
            <button className="primary-btn">{editing ? 'Enregistrer' : 'Ajouter'}</button>
            <button type="button" className="secondary-btn" onClick={() => { setForm(emptyProduct(selectedFamily?.name)); setEditing(null); }}>Réinitialiser</button>
          </div>
        </form>

        <div className="grid gap-16">
          <section className="panel premium-panel stock-results-panel">
            <div className="panel-header"><div><h3>Résultats du stock</h3><p>Affichage propre des pièces disponibles dans la vue choisie.</p></div><span className="hint">Devis en cours : {(quoteDraft?.lines || []).length} pièce(s)</span></div>
            <div className="table-shell"><table>
              <thead><tr><th>Produit</th><th>Famille</th><th>Sous-famille</th><th>Qté</th><th>Statut</th><th>P. part.</th><th>P. pro</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.quantity);
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <div className="muted-line">{product.internalReference}</div>
                      </td>
                      <td>{product.family}</td>
                      <td>{product.subfamily}</td>
                      <td className={status === 'rupture' ? 'danger-text' : status === 'faible' ? 'warning-text' : ''}>{product.quantity}</td>
                      <td><span className={`badge ${status}`}>{status === 'rupture' ? 'Rupture' : status === 'faible' ? 'Stock faible' : 'Normal'}</span></td>
                      <td>{formatCurrency(product.privatePrice)}</td>
                      <td>{formatCurrency(product.proPrice)}</td>
                      <td className="actions-cell">
                        <button className="link-btn success-text" onClick={() => addProductToCart(product)}>Ajouter</button>
                        <button className="link-btn" type="button" onClick={() => addProductToQuote(product)}>Ajouter au devis</button>
                        <button className="link-btn" onClick={() => editProduct(product)}>Modifier</button>
                        <button className="link-btn danger-text" onClick={() => archiveProduct(product.id)}>Supprimer</button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredProducts.length && <tr><td colSpan="8">Aucun produit pour ce filtre.</td></tr>}
              </tbody>
            </table></div>
          </section>

          <section className="panel premium-panel stock-selection-panel">
            <div className="panel-header space-between">
              <div>
                <h3>Sélection client</h3>
                <p>Ajoute plusieurs pièces trouvées, ajuste le prix si besoin, puis valide uniquement celles que le client prend.</p>
              </div>
              <div className="inline-actions">
                <div className="total-chip">Total sélectionné : {formatCurrency(cartTotal)}</div>
                <button className="primary-btn" type="button" onClick={payCartSelection}>Payé</button>
              </div>
            </div>
            <div className="table-shell"><table>
              <thead><tr><th></th><th>Pièce</th><th>Réf</th><th>Qté</th><th>Prix</th><th>Total</th><th>Actions</th></tr></thead>
              <tbody>
                {stockCart.map((item) => (
                  <tr key={item.saleId}>
                    <td><input type="checkbox" checked={item.selected} onChange={(e) => updateCartItem(item.saleId, { selected: e.target.checked })} /></td>
                    <td><strong>{item.name}</strong><div className="muted-line">{item.family} / {item.subfamily}</div></td>
                    <td>{item.internalReference || '-'}</td>
                    <td><input type="number" min="1" max={item.maxQuantity || 1} value={item.quantity} onChange={(e) => updateCartItem(item.saleId, { quantity: Math.max(1, Math.min(Number(e.target.value) || 1, item.maxQuantity || 1)) })} /></td>
                    <td><input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => updateCartItem(item.saleId, { unitPrice: Number(e.target.value) || 0 })} /></td>
                    <td>{formatCurrency(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</td>
                    <td className="actions-cell"><button className="link-btn danger-text" type="button" onClick={() => removeCartItem(item.saleId)}>Retirer</button></td>
                  </tr>
                ))}
                {!stockCart.length && <tr><td colSpan="7">Aucune pièce ajoutée pour le client pour le moment.</td></tr>}
              </tbody>
            </table></div>
          </section>
        </div>
      </section>
    </div>
  );
}

function QuotesModule({ quotes, setQuotes, products, clients, globalSearch, addAudit, quoteDraft, setQuoteDraft }) {
  const quote = quoteDraft || emptyQuote();
  const customerType = quote.customerType || 'particulier';
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [manualLine, setManualLine] = useState({ designation: '', internalReference: '', quantity: 1, unitTTC: 0, tva: 20 });

  const searchedQuotes = quotes.filter((q) => [q.number, q.clientName, q.vehicleBrand].join(' ').toLowerCase().includes(globalSearch.toLowerCase()));

  const setQuote = (updater) => {
    setQuoteDraft((prev) => (typeof updater === 'function' ? updater(prev || emptyQuote()) : updater));
  };

  const addManualLine = () => {
    if (!manualLine.designation.trim()) return;
    const unitTTC = Number(manualLine.unitTTC || 0);
    const tva = Number(manualLine.tva || 20);
    const unitHT = unitTTC / (1 + tva / 100);
    const quantity = Number(manualLine.quantity || 1);
    setQuote((prev) => ({
      ...prev,
      customerType,
      lines: [
        ...prev.lines,
        {
          id: crypto.randomUUID(),
          source: 'manuel',
          designation: manualLine.designation,
          internalReference: manualLine.internalReference,
          originalReference: '',
          quantity,
          tva,
          unitHT: Number(unitHT.toFixed(2)),
          unitTTC,
          totalHT: Number((unitHT * quantity).toFixed(2)),
          totalTTC: Number((unitTTC * quantity).toFixed(2)),
        },
      ],
    }));
    setManualLine({ designation: '', internalReference: '', quantity: 1, unitTTC: 0, tva: 20 });
  };

  const totals = useMemo(() => {
    const totalHT = quote.lines.reduce((sum, line) => sum + Number(line.totalHT || 0), 0);
    const totalTTC = quote.lines.reduce((sum, line) => sum + Number(line.totalTTC || 0), 0);
    return { totalHT, totalTTC };
  }, [quote.lines]);

  const resetQuote = () => {
    setQuoteDraft(emptyQuote());
    setEditingQuoteId(null);
  };

  const saveQuote = () => {
    if (editingQuoteId) {
      setQuotes((prev) => prev.map((item) => item.id === editingQuoteId ? { ...quote, id: editingQuoteId, number: item.number, totalHT: totals.totalHT, totalTTC: totals.totalTTC } : item));
      addAudit('Modification', `Devis modifié`);
    } else {
      const item = { ...quote, id: crypto.randomUUID(), number: `DV-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(4, '0')}`, totalHT: totals.totalHT, totalTTC: totals.totalTTC };
      setQuotes((prev) => [item, ...prev]);
      addAudit('Création', `Devis ${item.number}`);
    }
    resetQuote();
  };

  const openQuote = (savedQuote) => {
    setEditingQuoteId(savedQuote.id);
    setQuoteDraft({ ...savedQuote, lines: savedQuote.lines || [] });
  };

  const deleteQuote = (id) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    addAudit('Suppression', 'Devis');
    if (editingQuoteId === id) resetQuote();
  };

  const printQuote = (q) => {
    const rows = q.lines.map((line, index) => `
      <tr>
        <td style="border:1px solid #151515;padding:10px 12px;text-align:center;font-size:13px;">${index + 1}</td>
        <td style="border:1px solid #151515;padding:10px 12px;font-size:13px;">${line.designation}</td>
        <td style="border:1px solid #151515;padding:10px 12px;text-align:center;font-size:13px;">${line.quantity}</td>
        <td style="border:1px solid #151515;padding:10px 12px;text-align:right;font-size:13px;">${formatCurrency(line.unitHT)}</td>
        <td style="border:1px solid #151515;padding:10px 12px;text-align:right;font-size:13px;">${formatCurrency(line.unitTTC)}</td>
        <td style="border:1px solid #151515;padding:10px 12px;text-align:right;font-size:13px;">${formatCurrency(line.totalTTC)}</td>
      </tr>
    `).join('');
    const totalTVA = Number(q.totalTTC || 0) - Number(q.totalHT || 0);

    printHTML(
      `Devis ${q.number}`,
      `
        <div style="font-family:Arial,sans-serif;color:#111;background:#fff;max-width:820px;margin:0 auto;padding:4px 8px;">
          <div style="text-align:center;margin-bottom:8px;">
            <img src="/logo-luxe.jpeg" alt="THE KING PIÈCES AUTOS" style="width:140px;height:140px;object-fit:contain;display:block;margin:0 auto 8px auto;" />
            <div style="font-size:32px;font-weight:700;letter-spacing:4px;line-height:1.05;">THE KING</div>
            <div style="font-size:32px;font-weight:700;letter-spacing:8px;line-height:1.05;margin-top:2px;">PIECES AUTO</div>
            <div style="font-size:13px;letter-spacing:4px;font-weight:700;margin-top:6px;">BY MAFYNA</div>
          </div>

          <div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-top:2px solid #d4a62a;border-bottom:2px solid #d4a62a;padding:14px 0 12px 0;margin-bottom:16px;">
            <div style="width:50%;font-size:13px;line-height:1.7;text-align:left;">
              <div><strong>01 84 74 15 00</strong></div>
              <div><strong>06 50 05 89 45</strong></div>
              <div>thekingpiecesautos@gmail.com</div>
              <div>32 AV MARCEL CACHIN, 93240 STAINS</div>
            </div>
            <div style="width:50%;text-align:right;">
              <div style="font-weight:900;font-size:28px;letter-spacing:1px;margin-bottom:8px;">DEVIS</div>
              <div style="font-size:13px;line-height:1.8;">
                <div><strong>N° :</strong> ${q.number || ''}</div>
                <div><strong>Date :</strong> ${formatDate(q.date)}</div>
                <div><strong>Validité :</strong> ${q.validity || '30 jours'}</div>
              </div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:14px;">
            <tr>
              <td style="width:50%;border:1px solid #151515;padding:12px 14px;vertical-align:top;">
                <div style="font-weight:900;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.6px;">INFORMATIONS CLIENT</div>
                <div><strong>Nom :</strong> ${q.clientName || '____________________'}</div>
              </td>
              <td style="width:50%;border:1px solid #151515;padding:12px 14px;vertical-align:top;">
                <div style="font-weight:900;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.6px;">VÉHICULE</div>
                <div><strong>Immatriculation :</strong> ${q.plate || '____________'}</div>
              </td>
            </tr>
          </table>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr>
                <th style="border:1px solid #151515;padding:10px 12px;text-align:center;background:#f7f7f7;">#</th>
                <th style="border:1px solid #151515;padding:10px 12px;text-align:left;background:#f7f7f7;">Désignation</th>
                <th style="border:1px solid #151515;padding:10px 12px;text-align:center;background:#f7f7f7;">Qté</th>
                <th style="border:1px solid #151515;padding:10px 12px;text-align:right;background:#f7f7f7;">PU HT</th>
                <th style="border:1px solid #151515;padding:10px 12px;text-align:right;background:#f7f7f7;">PU TTC</th>
                <th style="border:1px solid #151515;padding:10px 12px;text-align:right;background:#f7f7f7;">Montant TTC</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="6" style="border:1px solid #151515;padding:12px;text-align:center;">Aucune ligne</td></tr>`}</tbody>
          </table>

          <div style="width:300px;margin-left:auto;margin-top:16px;font-size:14px;line-height:2.0;">
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #ddd;"><strong>Total HT</strong><span>${formatCurrency(q.totalHT)}</span></div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid #ddd;"><strong>TVA</strong><span>${formatCurrency(totalTVA)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;padding:10px 12px;border:2px solid #151515;background:#fbfbfb;font-weight:900;font-size:24px;color:#000;">
              <span>TOTAL TTC</span><span>${formatCurrency(q.totalTTC)}</span>
            </div>
          </div>

          <div style="margin-top:24px;padding-top:12px;border-top:1px solid #151515;font-size:12px;text-align:center;font-weight:700;letter-spacing:0.2px;">
            SIRET : 977 631 530 00010 | TVA : FR80 977 631 530
          </div>
        </div>
      `,
      { includeShopHeader: false, includeFooter: false }
    );
  };

  return (
    <div className="grid gap-16">
      <section className="panel premium-panel">
        <div className="panel-header space-between"><h3>{editingQuoteId ? 'Modifier le devis' : 'Nouveau devis'}</h3><span className="hint">Ajout depuis le stock ou manuel, sans modifier le stock.</span></div>
        <div className="devis-layout-cards">
          <div className="panel soft-panel">
            <div className="panel-header"><h3>Informations client</h3></div>
            <div className="form-grid">
              <input placeholder="Nom du client" list="clients-list" value={quote.clientName} onChange={(e) => setQuote({ ...quote, clientName: e.target.value })} />
              <select value={customerType} onChange={(e) => setQuote({ ...quote, customerType: e.target.value })}>
                <option value="particulier">Particulier</option>
                <option value="professionnel">Professionnel</option>
              </select>
              <input placeholder="Adresse client" value={quote.clientAddress} onChange={(e) => setQuote({ ...quote, clientAddress: e.target.value })} />
              <input type="date" value={quote.date} onChange={(e) => setQuote({ ...quote, date: e.target.value })} />
              <input placeholder="Validité" value={quote.validity} onChange={(e) => setQuote({ ...quote, validity: e.target.value })} />
            </div>
            <datalist id="clients-list">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </div>
          <div className="panel soft-panel">
            <div className="panel-header"><h3>Véhicule</h3></div>
            <div className="form-grid">
              <input placeholder="Marque" value={quote.vehicleBrand} onChange={(e) => setQuote({ ...quote, vehicleBrand: e.target.value })} />
              <input placeholder="Modèle" value={quote.vehicleModel || ''} onChange={(e) => setQuote({ ...quote, vehicleModel: e.target.value })} />
              <input placeholder="Immatriculation" value={quote.plate} onChange={(e) => setQuote({ ...quote, plate: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="box-panel premium-panel">
          <div className="panel-header space-between">
            <div>
              <h4>Pièces ajoutées depuis le stock</h4>
              <p>Depuis le module Stock, utilise le bouton <strong>Ajouter au devis</strong>. Ensuite reviens ici pour compléter le devis manuellement.</p>
            </div>
            <div className="selection-box">{quote.lines.filter((line) => line.source === 'stock').length} pièce(s) depuis le stock</div>
          </div>
          <div className="alert info">La partie <strong>Ajouter depuis le stock</strong> a été retirée du devis. Les pièces viennent maintenant directement du module Stock.</div>
        </div>

        <div className="box-panel premium-panel">
          <h4>Ajouter manuellement</h4>
          <div className="form-grid compact-grid">
            <input placeholder="Désignation" value={manualLine.designation} onChange={(e) => setManualLine({ ...manualLine, designation: e.target.value })} />
            <input placeholder="Référence interne" value={manualLine.internalReference} onChange={(e) => setManualLine({ ...manualLine, internalReference: e.target.value })} />
            <input type="number" placeholder="Quantité" value={manualLine.quantity} onChange={(e) => setManualLine({ ...manualLine, quantity: Number(e.target.value) })} />
            <input type="number" step="0.01" placeholder="Prix TTC" value={manualLine.unitTTC} onChange={(e) => setManualLine({ ...manualLine, unitTTC: Number(e.target.value) })} />
            <input type="number" step="0.01" placeholder="TVA %" value={manualLine.tva} onChange={(e) => setManualLine({ ...manualLine, tva: Number(e.target.value) })} />
          </div>
          <button className="secondary-btn" onClick={addManualLine}>Ajouter manuellement</button>
        </div>
      </section>

      <section className="panel premium-panel">
        <div className="panel-header"><h3>Lignes du devis</h3><span className="hint">Les références restent internes.</span></div>
        <table>
          <thead><tr><th>Désignation</th><th>Réf interne</th><th>Réf origine</th><th>Source</th><th>Qté</th><th>Prix HT</th><th>Prix TTC</th><th>TVA</th><th>Total TTC</th><th>Actions</th></tr></thead>
          <tbody>
            {quote.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.designation}</td>
                <td>{line.internalReference}</td>
                <td>{line.originalReference || '-'}</td>
                <td>{line.source}</td>
                <td>{line.quantity}</td>
                <td>{formatCurrency(line.unitHT)}</td>
                <td>{formatCurrency(line.unitTTC)}</td>
                <td>{line.tva || 20}%</td>
                <td>{formatCurrency(line.totalTTC)}</td>
                <td><button className="link-btn danger-text" onClick={() => setQuote((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== line.id) }))}>Supprimer</button></td>
              </tr>
            ))}
            {!quote.lines.length && <tr><td colSpan="10">Aucune ligne.</td></tr>}
          </tbody>
        </table>
        <div className="totals-row"><strong>Total HT : {formatCurrency(totals.totalHT)}</strong><strong>Total TTC : {formatCurrency(totals.totalTTC)}</strong></div>
        <div className="inline-actions">
          <button className="primary-btn" onClick={saveQuote}>{editingQuoteId ? 'Modifier le devis' : 'Valider le devis'}</button>
          <button className="secondary-btn" onClick={resetQuote}>Nouveau</button>
        </div>
      </section>

      <section className="panel premium-panel">
        <div className="panel-header"><h3>Historique des devis</h3></div>
        <table>
          <thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Véhicule</th><th>Total TTC</th><th>Actions</th></tr></thead>
          <tbody>
            {searchedQuotes.map((q) => (
              <tr key={q.id}>
                <td>{q.number}</td><td>{formatDate(q.date)}</td><td>{q.clientName}</td><td>{q.vehicleBrand}</td><td>{formatCurrency(q.totalTTC)}</td>
                <td className="actions-cell">
                  <button className="link-btn" onClick={() => openQuote(q)}>Ouvrir</button>
                  <button className="link-btn" onClick={() => printQuote(q)}>Imprimer</button>
                  <button className="link-btn danger-text" onClick={() => deleteQuote(q.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {!searchedQuotes.length && <tr><td colSpan="6">Aucun devis.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ClientsModule({ clients, setClients, globalSearch, addAudit }) {
  const emptyClientForm = () => ({ name: '', phone: '', address: '', email: '' });
  const emptyPurchaseForm = () => ({ date: today(), designation: '', quantity: 1, price: 0 });
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || null);
  const [clientForm, setClientForm] = useState(emptyClientForm());
  const [editingClientId, setEditingClientId] = useState(null);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm());
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ date: today(), amount: 0, mode: 'espèces', note: '', reference: '' });
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState([]);
  const [openedPaymentId, setOpenedPaymentId] = useState(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [periodFilter, setPeriodFilter] = useState({ day: today(), month: today().slice(0, 7), year: today().slice(0, 4) });

  const filteredClients = clients.filter((c) => !c.archived && [c.name, c.phone, c.email].join(' ').toLowerCase().includes(globalSearch.toLowerCase()));
  const selected = clients.find((c) => c.id === selectedClientId) || filteredClients[0];
  const openedPayment = selected?.payments?.find((payment) => payment.id === openedPaymentId) || null;

  useEffect(() => {
    if (!selected) {
      setSelectedPurchaseIds([]);
      return;
    }
    let remaining = Number(paymentForm.amount || 0);
    if (remaining <= 0) {
      setSelectedPurchaseIds([]);
      return;
    }
    const ids = [];
    for (const purchase of selected.purchases || []) {
      const lineTotal = Number((purchase.total ?? (Number(purchase.quantity || 0) * Number(purchase.price || 0))) || 0);
      if (lineTotal <= 0) continue;
      if (remaining > 0) {
        ids.push(purchase.id);
        remaining = Number((remaining - lineTotal).toFixed(2));
      }
    }
    setSelectedPurchaseIds(ids);
  }, [selected?.id, selected?.purchases, paymentForm.amount]);

  useEffect(() => {
    setSelectedPaymentIds([]);
    setOpenedPaymentId(null);
    setEditingPurchaseId(null);
    setPurchaseForm(emptyPurchaseForm());
  }, [selected?.id]);

  const getPurchaseAmount = (purchase) => Number((purchase.total ?? (Number(purchase.quantity || 0) * Number(purchase.price || 0))) || 0);

  const startEditClient = (client) => {
    if (!client) return;
    setEditingClientId(client.id);
    setClientForm({
      name: client.name || '',
      phone: client.phone || '',
      address: client.address || '',
      email: client.email || '',
    });
  };

  const cancelClientEdition = () => {
    setEditingClientId(null);
    setClientForm(emptyClientForm());
  };


  const startEditPurchase = (purchase) => {
    if (!purchase) return;
    setEditingPurchaseId(purchase.id);
    setPurchaseForm({
      date: purchase.date || today(),
      designation: purchase.designation || '',
      quantity: Math.max(1, Number(purchase.quantity || 1)),
      price: Number(purchase.price || 0),
    });
  };

  const cancelPurchaseEdition = () => {
    setEditingPurchaseId(null);
    setPurchaseForm(emptyPurchaseForm());
  };

  const saveClient = (e) => {
    e.preventDefault();
    const payload = {
      name: clientForm.name?.trim() || '',
      phone: clientForm.phone?.trim() || '',
      address: clientForm.address?.trim() || '',
      email: clientForm.email?.trim() || '',
    };
    if (!payload.name) return;

    if (editingClientId) {
      setClients((prev) => prev.map((client) => client.id === editingClientId ? { ...client, ...payload } : client));
      setSelectedClientId(editingClientId);
      addAudit('Modification', `Client ${payload.name}`);
    } else {
      const newClient = { id: crypto.randomUUID(), ...payload, purchases: [], payments: [], archived: false };
      setClients((prev) => [newClient, ...prev]);
      setSelectedClientId(newClient.id);
      addAudit('Ajout', `Client ${newClient.name}`);
    }

    setEditingClientId(null);
    setClientForm(emptyClientForm());
  };

  const deleteClient = (client) => {
    if (!client) return;
    const hasHistory = Boolean((client.purchases || []).length || (client.payments || []).length);
    const message = hasHistory
      ? `Supprimer définitivement le client ${client.name} avec tous ses achats et paiements ?`
      : `Supprimer le client ${client.name} ?`;
    if (!window.confirm(message)) return;

    const remainingClients = clients.filter((item) => item.id !== client.id);
    setClients(remainingClients);
    if (editingClientId === client.id) setClientForm(emptyClientForm());
    setEditingClientId((current) => current === client.id ? null : current);
    setSelectedPurchaseIds([]);
    setSelectedPaymentIds([]);
    setOpenedPaymentId(null);
    setSelectedClientId(remainingClients[0]?.id || null);
    addAudit('Suppression', `Client ${client.name}`);
  };

  const savePurchase = () => {
    if (!selected) return;
    const designation = purchaseForm.designation?.trim() || '';
    if (!designation) return;
    const quantity = Math.max(1, Number(purchaseForm.quantity || 1));
    const price = Number(purchaseForm.price || 0);
    const total = quantity * price;

    if (editingPurchaseId) {
      setClients((prev) => prev.map((c) => {
        if (c.id !== selected.id) return c;
        return {
          ...c,
          purchases: (c.purchases || []).map((purchase) => {
            if (purchase.id !== editingPurchaseId) return purchase;
            return {
              ...purchase,
              date: purchaseForm.date,
              designation,
              quantity,
              price,
              total,
              status: formatClientPurchaseStatus({ ...purchase, quantity, remainingQuantity: purchase.remainingQuantity, price }),
            };
          }),
        };
      }));
      addAudit('Modification', `Achat client ${selected.name}`);
    } else {
      const purchase = {
        id: crypto.randomUUID(),
        date: purchaseForm.date,
        designation,
        quantity,
        originalQuantity: quantity,
        price,
        total,
        originalTotal: total,
        status: 'non payé',
      };
      setClients((prev) => prev.map((c) => c.id === selected.id ? { ...c, purchases: [purchase, ...(c.purchases || [])] } : c));
      addAudit('Ajout', `Achat client ${selected.name}`);
    }

    setEditingPurchaseId(null);
    setPurchaseForm(emptyPurchaseForm());
  };

  const deletePurchase = (purchaseId) => {
    if (!selected || !purchaseId) return;
    const purchase = (selected.purchases || []).find((item) => item.id === purchaseId);
    if (!purchase) return;
    if (!window.confirm(`Supprimer l'achat "${purchase.designation}" du client ${selected.name} ?`)) return;

    setClients((prev) => prev.map((c) => {
      if (c.id !== selected.id) return c;
      return {
        ...c,
        purchases: (c.purchases || []).filter((item) => item.id !== purchaseId),
      };
    }));
    setSelectedPurchaseIds((prev) => prev.filter((id) => id !== purchaseId));
    if (editingPurchaseId === purchaseId) {
      setEditingPurchaseId(null);
      setPurchaseForm(emptyPurchaseForm());
    }
    addAudit('Suppression', `Achat client ${selected.name}`);
  };

  const updatePurchaseField = (purchaseId, field, value) => {
    if (!selected) return;
    setClients((prev) => prev.map((c) => {
      if (c.id !== selected.id) return c;
      return {
        ...c,
        purchases: c.purchases.map((purchase) => {
          if (purchase.id !== purchaseId) return purchase;
          const next = { ...purchase, [field]: value };
          const quantity = Math.max(1, Number(next.quantity || 1));
          const price = Number(next.price || 0);
          next.quantity = quantity;
          next.total = quantity * price;
          next.status = 'non payé';
          return next;
        }),
      };
    }));
    addAudit('Modification', `Prix/qté achat client ${selected.name}`);
  };

  const togglePurchaseSelection = (purchaseId) => setSelectedPurchaseIds((prev) => prev.includes(purchaseId) ? prev.filter((id) => id !== purchaseId) : [...prev, purchaseId]);

  const addPayment = () => {
    if (!selected) return;
    let remainingAmount = Number(paymentForm.amount || 0);
    if (remainingAmount <= 0 || !selectedPurchaseIds.length) return;

    const archivedItems = [];
    const updatedPurchases = [];

    for (const purchase of selected.purchases || []) {
      const lineTotal = getPurchaseAmount(purchase);
      const quantity = Math.max(1, Number(purchase.quantity || 1));
      const isSelected = selectedPurchaseIds.includes(purchase.id);

      if (!isSelected) {
        updatedPurchases.push(purchase);
        continue;
      }

      if (remainingAmount <= 0) {
        updatedPurchases.push(purchase);
        continue;
      }

      const applied = Math.min(lineTotal, remainingAmount);
      if (applied > 0) {
        archivedItems.push({
          purchaseId: purchase.id,
          designation: purchase.designation,
          quantity,
          unitPrice: applied / quantity,
          total: applied,
          originalLineTotal: lineTotal,
          sourceDate: purchase.date,
        });
      }

      const remainingLine = Number((lineTotal - applied).toFixed(2));
      remainingAmount = Number((remainingAmount - applied).toFixed(2));

      if (remainingLine > 0.0001) {
        updatedPurchases.push({
          ...purchase,
          price: Number((remainingLine / quantity).toFixed(2)),
          total: remainingLine,
          status: 'partiellement payé',
        });
      }
    }

    const appliedAmount = archivedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const payment = {
      id: crypto.randomUUID(),
      ...paymentForm,
      amount: Number(paymentForm.amount || 0),
      appliedAmount,
      unappliedAmount: Number(((Number(paymentForm.amount || 0)) - appliedAmount).toFixed(2)),
      archivedItems,
    };

    setClients((prev) => prev.map((c) => c.id === selected.id ? { ...c, purchases: updatedPurchases, payments: [payment, ...(c.payments || [])] } : c));
    setPaymentForm({ date: today(), amount: 0, mode: 'espèces', note: '', reference: '' });
    setSelectedPurchaseIds([]);
    setOpenedPaymentId(payment.id);
    addAudit('Ajout', `Paiement client ${selected.name}`);
  };

  const printClientPayment = (payment) => {
    const rows = (payment.archivedItems || []).map((item) => `<tr><td>${item.designation}</td><td>${item.quantity}</td><td>${formatCurrency(item.unitPrice)}</td><td>${formatCurrency(item.total)}</td></tr>`).join('');
    printHTML(`Paiement client ${selected?.name || ''}`, `<h2>Paiement client - ${selected?.name || ''}</h2><table><tbody><tr><th>Date</th><td>${formatDate(payment.date)}</td><th>Mode</th><td>${payment.mode}</td></tr><tr><th>Montant versé</th><td>${formatCurrency(payment.amount)}</td><th>Montant affecté</th><td>${formatCurrency(payment.appliedAmount || 0)}</td></tr><tr><th>Référence</th><td>${payment.reference || '-'}</td><th>Remarque</th><td>${payment.note || '-'}</td></tr></tbody></table><h3>Pièces archivées avec ce paiement</h3><table><thead><tr><th>Désignation</th><th>Qté</th><th>Prix payé</th><th>Total payé</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>Aucune pièce couverte.</td></tr>"}</tbody></table>`);
  };

  const togglePaymentSelection = (paymentId) => setSelectedPaymentIds((prev) => prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]);

  const deletePaymentHistory = (paymentIds) => {
    if (!selected || !paymentIds.length) return;
    setClients((prev) => prev.map((c) => c.id === selected.id ? { ...c, payments: (c.payments || []).filter((payment) => !paymentIds.includes(payment.id)) } : c));
    setSelectedPaymentIds((prev) => prev.filter((id) => !paymentIds.includes(id)));
    if (paymentIds.includes(openedPaymentId)) setOpenedPaymentId(null);
    addAudit('Suppression', `Historique paiement client ${selected.name}`);
  };

  const printClientPayments = (paymentsToPrint, titleSuffix) => {
    if (!selected) return;
    const blocks = (paymentsToPrint || []).map((payment) => {
      const rows = (payment.archivedItems || []).map((item) => `<tr><td>${item.designation}</td><td>${item.quantity}</td><td>${formatCurrency(item.unitPrice)}</td><td>${formatCurrency(item.total)}</td></tr>`).join('');
      return `
        <div class="box" style="margin-bottom:18px">
          <h3>Paiement du ${formatDate(payment.date)}</h3>
          <table><tbody>
            <tr><th>Montant versé</th><td>${formatCurrency(payment.amount)}</td><th>Montant affecté</th><td>${formatCurrency(payment.appliedAmount || 0)}</td></tr>
            <tr><th>Mode</th><td>${payment.mode}</td><th>Référence</th><td>${payment.reference || '-'}</td></tr>
            <tr><th>Remarque</th><td colspan="3">${payment.note || '-'}</td></tr>
          </tbody></table>
          <table><thead><tr><th>Pièce</th><th>Qté</th><th>Prix payé par pièce</th><th>Total payé</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>Aucune pièce.</td></tr>"}</tbody></table>
        </div>`;
    }).join('');
    printHTML(`Paiements client ${selected.name}`, `<h2>Historique paiements - ${selected.name}</h2><div class="muted">${titleSuffix}</div>${blocks || '<p>Aucun paiement.</p>'}`);
  };

  const printSelectedPayments = () => {
    if (!selected) return;
    const payments = (selected.payments || []).filter((payment) => selectedPaymentIds.includes(payment.id));
    printClientPayments(payments, 'Impression de la sélection');
  };

  const printPaymentsByPeriod = (period) => {
    if (!selected) return;
    const list = (selected.payments || []).filter((payment) => {
      const dateValue = payment.date || '';
      if (period === 'day') return dateValue === periodFilter.day;
      if (period === 'month') return dateValue.slice(0, 7) === periodFilter.month;
      if (period === 'year') return dateValue.slice(0, 4) === periodFilter.year;
      return false;
    });
    const label = period === 'day' ? `Journée du ${formatDate(periodFilter.day)}` : period === 'month' ? `Mois ${periodFilter.month}` : `Année ${periodFilter.year}`;
    printClientPayments(list, label);
  };

  const due = selected ? selected.purchases.reduce((s, p) => s + getPurchaseAmount(p), 0) : 0;
  const archivedTotal = selected ? selected.payments.reduce((sum, payment) => sum + Number(payment.appliedAmount || 0), 0) : 0;
  const selectedPiecesTotal = selected ? selected.purchases.filter((p) => selectedPurchaseIds.includes(p.id)).reduce((sum, p) => sum + getPurchaseAmount(p), 0) : 0;

  return (
    <div className="two-cols">
      <div className="grid gap-16">
        <form className="panel" onSubmit={saveClient}>
          <div className="panel-header"><h3>{editingClientId ? 'Modifier la fiche client' : 'Nouvelle fiche client'}</h3></div>
          <div className="form-grid">
            <input placeholder="Nom du client / entreprise" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required />
            <input placeholder="Téléphone" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
            <input placeholder="Adresse" value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} />
            <input placeholder="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
          </div>
          <div className="inline-actions wrap-actions">
            <button className="primary-btn">{editingClientId ? 'Enregistrer les modifications' : 'Ajouter le client'}</button>
            {editingClientId && <button type="button" className="secondary-btn" onClick={cancelClientEdition}>Annuler</button>}
          </div>
        </form>
        <section className="panel">
          <div className="panel-header"><h3>Liste des clients</h3></div>
          <div className="list-stack">
            {filteredClients.map((client) => (
              <button key={client.id} className={`list-item ${selected?.id === client.id ? 'selected' : ''}`} onClick={() => { setSelectedClientId(client.id); setSelectedPurchaseIds([]); setOpenedPaymentId(null); setSelectedPaymentIds([]); }}>
                <strong>{client.name}</strong>
                <span>{client.phone}</span>
              </button>
            ))}
            {!filteredClients.length && <div>Aucun client.</div>}
          </div>
        </section>
      </div>
      <div className="grid gap-16">
        <section className="panel">
          <div className="panel-header"><h3>Fiche de compte client</h3></div>
          {selected ? (
            <>
              <div className="info-grid">
                <div><strong>Nom</strong><span>{selected.name}</span></div>
                <div><strong>Téléphone</strong><span>{selected.phone}</span></div>
                <div><strong>Adresse</strong><span>{selected.address}</span></div>
                <div><strong>Email</strong><span>{selected.email}</span></div>
                <div><strong>Montant dû</strong><span>{formatCurrency(due)}</span></div>
                <div><strong>Total archivé payé</strong><span>{formatCurrency(archivedTotal)}</span></div><div><strong>Total sélectionné</strong><span>{formatCurrency(selectedPiecesTotal)}</span></div>
              </div>
              <div className="inline-actions wrap-actions" style={{ marginBottom: 16 }}>
                <button type="button" className="secondary-btn" onClick={() => startEditClient(selected)}>Modifier le client</button>
                <button type="button" className="secondary-btn danger-btn" onClick={() => deleteClient(selected)}>Supprimer le client</button>
              </div>
              <div className="two-cols narrow-gap">
                <div className="box-panel">
                  <h4>Achats / Dettes</h4>
                  <div className="form-grid compact-grid">
                    <input type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
                    <input placeholder="Pièce vendue" value={purchaseForm.designation} onChange={(e) => setPurchaseForm({ ...purchaseForm, designation: e.target.value })} />
                    <input type="number" placeholder="Qté" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })} />
                    <input type="number" step="0.01" placeholder="Prix" value={purchaseForm.price} onChange={(e) => setPurchaseForm({ ...purchaseForm, price: Number(e.target.value) })} />
                  </div>
                  <div className="inline-actions wrap-actions">
                    <button className="secondary-btn" onClick={savePurchase}>{editingPurchaseId ? 'Enregistrer modification' : 'Ajouter achat'}</button>
                    {editingPurchaseId && <button type="button" className="secondary-btn" onClick={cancelPurchaseEdition}>Annuler</button>}
                  </div>
                </div>
                <div className="box-panel">
                  <h4>Paiements</h4>
                  <div className="form-grid compact-grid">
                    <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                    <input type="number" step="0.01" placeholder="Montant payé" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
                    <select value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}><option>espèces</option><option>carte</option><option>chèque</option><option>virement</option></select>
                    <input placeholder="Référence" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                    <input placeholder="Remarque" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                  </div>
                  <div className="hint">La sélection des pièces se fait automatiquement selon le montant payé. La dernière pièce peut être coupée : la partie payée va en archive et le reste reste en impayé.</div><div className="hint">Pièces auto-sélectionnées : {selectedPurchaseIds.length}</div><button className="secondary-btn" onClick={addPayment}>Enregistrer paiement</button>
                </div>
              </div>
              <h4>Pièces impayées / en cours</h4>
              <table>
                <thead><tr><th></th><th>Date</th><th>Désignation</th><th>Qté</th><th>Prix unitaire actuel</th><th>Reste à payer</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>{selected.purchases.map((p) => <tr key={p.id}><td><input type="checkbox" checked={selectedPurchaseIds.includes(p.id)} onChange={() => togglePurchaseSelection(p.id)} /></td><td>{formatDate(p.date)}</td><td>{p.designation}</td><td><input type="number" value={p.quantity} onChange={(e) => updatePurchaseField(p.id, 'quantity', Number(e.target.value))} /></td><td><input type="number" step="0.01" value={p.price} onChange={(e) => updatePurchaseField(p.id, 'price', Number(e.target.value))} /></td><td>{formatCurrency(getPurchaseAmount(p))}</td><td>{p.status}</td><td><div className="inline-actions wrap-actions"><button type="button" className="link-btn" onClick={() => startEditPurchase(p)}>Modifier</button><button type="button" className="link-btn danger-text" onClick={() => deletePurchase(p.id)}>Supprimer</button></div></td></tr>)}{!selected.purchases.length && <tr><td colSpan="8">Aucun achat.</td></tr>}</tbody>
              </table>
              <h4>Historique des paiements archivés</h4>
              <div className="inline-actions wrap-actions period-toolbar">
                <button className="secondary-btn" onClick={printSelectedPayments}>Imprimer sélection</button>
                <button className="secondary-btn danger-btn" onClick={() => deletePaymentHistory(selectedPaymentIds)}>Supprimer sélection</button>
                <div className="period-print-row">
                  <div className="period-print-item">
                    <input type="date" value={periodFilter.day} onChange={(e) => setPeriodFilter((prev) => ({ ...prev, day: e.target.value }))} />
                    <button className="secondary-btn" onClick={() => printPaymentsByPeriod('day')}>Imprimer jour</button>
                  </div>
                  <div className="period-print-item">
                    <input type="month" value={periodFilter.month} onChange={(e) => setPeriodFilter((prev) => ({ ...prev, month: e.target.value }))} />
                    <button className="secondary-btn" onClick={() => printPaymentsByPeriod('month')}>Imprimer mois</button>
                  </div>
                  <div className="period-print-item">
                    <input type="number" min="2000" max="2100" value={periodFilter.year} onChange={(e) => setPeriodFilter((prev) => ({ ...prev, year: e.target.value }))} />
                    <button className="secondary-btn" onClick={() => printPaymentsByPeriod('year')}>Imprimer année</button>
                  </div>
                </div>
              </div>
              <table>
                <thead><tr><th></th><th>Date</th><th>Montant versé</th><th>Montant affecté</th><th>Mode</th><th>Référence</th><th>Pièces archivées</th><th>Actions</th></tr></thead>
                <tbody>{selected.payments.map((p) => <tr key={p.id} className={openedPaymentId === p.id ? 'selected-row' : ''}><td><input type="checkbox" checked={selectedPaymentIds.includes(p.id)} onChange={() => togglePaymentSelection(p.id)} /></td><td>{formatDate(p.date)}</td><td>{formatCurrency(p.amount)}</td><td>{formatCurrency(p.appliedAmount || 0)}</td><td>{p.mode}</td><td>{p.reference}</td><td>{(p.archivedItems || []).map((item) => `${item.designation} - ${formatCurrency(item.total)}`).join(', ') || '-'}</td><td><button className="link-btn" onClick={() => setOpenedPaymentId(p.id)}>Ouvrir</button><button className="link-btn" onClick={() => printClientPayment(p)}>Imprimer</button><button className="link-btn danger-text" onClick={() => deletePaymentHistory([p.id])}>Supprimer</button></td></tr>)}{!selected.payments.length && <tr><td colSpan="8">Aucun paiement.</td></tr>}</tbody>
              </table>
              {openedPayment && <div className="box-panel"><h4>Détail du paiement archivé</h4><div className="info-grid"><div><strong>Date du paiement</strong><span>{formatDate(openedPayment.date)}</span></div><div><strong>Montant payé</strong><span>{formatCurrency(openedPayment.amount)}</span></div><div><strong>Montant affecté</strong><span>{formatCurrency(openedPayment.appliedAmount || 0)}</span></div><div><strong>Mode</strong><span>{openedPayment.mode}</span></div></div><table><thead><tr><th>Pièce</th><th>Qté</th><th>Prix payé par pièce</th><th>Montant payé</th></tr></thead><tbody>{(openedPayment.archivedItems || []).map((item, index) => <tr key={`${openedPayment.id}-${index}`}><td>{item.designation}</td><td>{item.quantity}</td><td>{formatCurrency(item.unitPrice)}</td><td>{formatCurrency(item.total)}</td></tr>)}{!(openedPayment.archivedItems || []).length && <tr><td colSpan="4">Aucune pièce archivée.</td></tr>}</tbody></table></div>}            </>
          ) : <div>Sélectionne un client.</div>}
        </section>
      </div>
    </div>
  );
}




function SuppliersModule({ suppliers, setSuppliers, products, setProducts, clients, quotes, globalSearch, addAudit }) {
  const createSupplierShape = (supplier = {}) => ({
    ...supplier,
    invoices: Array.isArray(supplier.invoices) ? supplier.invoices : [],
    credits: Array.isArray(supplier.credits) ? supplier.credits : [],
    paymentArchive: Array.isArray(supplier.paymentArchive) ? supplier.paymentArchive : [],
    documents: Array.isArray(supplier.documents) ? supplier.documents : [],
  });

  const emptyInvoiceForm = () => ({
    number: '',
    date: today(),
    amount: 0,
    dueDate: today(),
    pdfName: '',
    paymentMode: 'virement',
  });

  const [selectedId, setSelectedId] = useState(suppliers[0]?.id || null);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingCreditId, setEditingCreditId] = useState(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    billingType: 'par achat',
    paymentCycle: 'à échéance',
    defaultPaymentMode: 'virement',
    alertDays: 3,
  });
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm());
  const [creditForm, setCreditForm] = useState(emptyInvoiceForm());
  const [paymentForm, setPaymentForm] = useState({
    date: today(),
    amount: 0,
    mode: 'virement',
    note: '',
    reference: '',
  });
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [selectedCreditIds, setSelectedCreditIds] = useState([]);

  const filtered = suppliers.filter((s) => [s.name, s.contact, s.billingType, s.paymentCycle, s.defaultPaymentMode].join(' ').toLowerCase().includes(globalSearch.toLowerCase()));
  const selected = createSupplierShape(suppliers.find((s) => s.id === selectedId) || filtered[0] || null);

  useEffect(() => {
    if (!selected?.id && suppliers[0]?.id) setSelectedId(suppliers[0].id);
  }, [selected?.id, suppliers]);

  useEffect(() => {
    setSelectedInvoiceIds((prev) => prev.filter((id) => selected?.invoices?.some((invoice) => invoice.id === id)));
    setSelectedCreditIds((prev) => prev.filter((id) => selected?.credits?.some((credit) => credit.id === id)));
  }, [selected?.id, selected?.invoices, selected?.credits]);

  const resetSupplierForm = () => {
    setSupplierForm({ name: '', contact: '', billingType: 'par achat', paymentCycle: 'à échéance', defaultPaymentMode: 'virement', alertDays: 3 });
    setEditingSupplierId(null);
  };

  const resetInvoiceForm = () => {
    setInvoiceForm(emptyInvoiceForm());
    setEditingInvoiceId(null);
  };

  const resetCreditForm = () => {
    setCreditForm(emptyInvoiceForm());
    setEditingCreditId(null);
  };

  const saveSupplier = (e) => {
    e.preventDefault();
    const payload = {
      ...supplierForm,
      alertDays: Number(supplierForm.alertDays || 0),
    };

    if (editingSupplierId) {
      setSuppliers((prev) => prev.map((supplier) => supplier.id === editingSupplierId ? {
        ...createSupplierShape(supplier),
        ...payload,
      } : supplier));
      addAudit('Modification', `Fournisseur ${payload.name}`);
    } else {
      const supplier = {
        id: crypto.randomUUID(),
        ...payload,
        invoices: [],
        credits: [],
        paymentArchive: [],
        documents: [],
      };
      setSuppliers((prev) => [supplier, ...prev]);
      setSelectedId(supplier.id);
      addAudit('Ajout', `Fournisseur ${supplier.name}`);
    }

    resetSupplierForm();
  };

  const loadSupplierForEdit = (supplier) => {
    const safe = createSupplierShape(supplier);
    setEditingSupplierId(safe.id);
    setSupplierForm({
      name: safe.name || '',
      contact: safe.contact || '',
      billingType: safe.billingType || 'par achat',
      paymentCycle: safe.paymentCycle || 'à échéance',
      defaultPaymentMode: safe.defaultPaymentMode || 'virement',
      alertDays: Number(safe.alertDays || 0),
    });
  };

  const deleteSupplier = (supplierId) => {
    setSuppliers((prev) => prev.filter((supplier) => supplier.id !== supplierId));
    if (selectedId === supplierId) setSelectedId(suppliers.find((supplier) => supplier.id !== supplierId)?.id || null);
    if (editingSupplierId === supplierId) resetSupplierForm();
    addAudit('Suppression', 'Fournisseur');
  };

  const saveInvoice = () => {
    if (!selected?.id) return;
    const invoicePayload = {
      number: invoiceForm.number || `FAC-${new Date().getTime()}`,
      date: invoiceForm.date || today(),
      amount: round2(invoiceForm.amount),
      dueDate: invoiceForm.dueDate || today(),
      pdfName: invoiceForm.pdfName || '',
      paymentMode: invoiceForm.paymentMode || selected.defaultPaymentMode || 'virement',
      status: 'non payée',
    };
    if (invoicePayload.amount <= 0) return;

    if (editingInvoiceId) {
      setSuppliers((prev) => prev.map((supplier) => {
        if (supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return {
          ...safe,
          invoices: safe.invoices.map((invoice) => invoice.id === editingInvoiceId ? { ...invoice, ...invoicePayload } : invoice),
        };
      }));
      addAudit('Modification', `Facture fournisseur ${invoicePayload.number}`);
    } else {
      const invoice = {
        id: crypto.randomUUID(),
        ...invoicePayload,
      };
      setSuppliers((prev) => prev.map((supplier) => {
        if (supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return { ...safe, invoices: [invoice, ...safe.invoices] };
      }));
      addAudit('Ajout', `Facture fournisseur ${invoice.number}`);
    }
    resetInvoiceForm();
  };

  const loadInvoiceForEdit = (invoice) => {
    setEditingInvoiceId(invoice.id);
    setInvoiceForm({
      number: invoice.number || '',
      date: invoice.date || today(),
      amount: Number(invoice.amount || 0),
      dueDate: invoice.dueDate || today(),
      pdfName: invoice.pdfName || '',
      paymentMode: invoice.paymentMode || selected?.defaultPaymentMode || 'virement',
    });
  };

  const deleteInvoice = (invoiceId) => {
    if (!selected?.id) return;
    setSuppliers((prev) => prev.map((supplier) => {
      if (supplier.id !== selected.id) return supplier;
      const safe = createSupplierShape(supplier);
      return { ...safe, invoices: safe.invoices.filter((invoice) => invoice.id !== invoiceId) };
    }));
    setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoiceId));
    if (editingInvoiceId === invoiceId) resetInvoiceForm();
    addAudit('Suppression', 'Facture fournisseur');
  };

  const saveCredit = () => {
    if (!selected?.id) return;
    const creditPayload = {
      number: creditForm.number || `AV-${new Date().getTime()}`,
      date: creditForm.date || today(),
      amount: round2(creditForm.amount),
      dueDate: creditForm.dueDate || today(),
      pdfName: creditForm.pdfName || '',
      paymentMode: creditForm.paymentMode || selected.defaultPaymentMode || 'virement',
    };
    if (creditPayload.amount <= 0) return;

    if (editingCreditId) {
      setSuppliers((prev) => prev.map((supplier) => {
        if (supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return {
          ...safe,
          credits: safe.credits.map((credit) => credit.id === editingCreditId ? { ...credit, ...creditPayload } : credit),
        };
      }));
      addAudit('Modification', `Avoir fournisseur ${creditPayload.number}`);
    } else {
      const credit = {
        id: crypto.randomUUID(),
        ...creditPayload,
      };
      setSuppliers((prev) => prev.map((supplier) => {
        if (supplier.id !== selected.id) return supplier;
        const safe = createSupplierShape(supplier);
        return { ...safe, credits: [credit, ...safe.credits] };
      }));
      addAudit('Ajout', `Avoir fournisseur ${credit.number}`);
    }
    resetCreditForm();
  };

  const loadCreditForEdit = (credit) => {
    setEditingCreditId(credit.id);
    setCreditForm({
      number: credit.number || '',
      date: credit.date || today(),
      amount: Number(credit.amount || 0),
      dueDate: credit.dueDate || today(),
      pdfName: credit.pdfName || '',
      paymentMode: credit.paymentMode || selected?.defaultPaymentMode || 'virement',
    });
  };

  const deleteCredit = (creditId) => {
    if (!selected?.id) return;
    setSuppliers((prev) => prev.map((supplier) => {
      if (supplier.id !== selected.id) return supplier;
      const safe = createSupplierShape(supplier);
      return { ...safe, credits: safe.credits.filter((credit) => credit.id !== creditId) };
    }));
    setSelectedCreditIds((prev) => prev.filter((id) => id !== creditId));
    if (editingCreditId === creditId) resetCreditForm();
    addAudit('Suppression', 'Avoir fournisseur');
  };

  const toggleInvoiceSelection = (invoiceId) => setSelectedInvoiceIds((prev) => prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]);
  const toggleCreditSelection = (creditId) => setSelectedCreditIds((prev) => prev.includes(creditId) ? prev.filter((id) => id !== creditId) : [...prev, creditId]);

  const selectedInvoices = useMemo(() => (selected?.invoices || []).filter((invoice) => selectedInvoiceIds.includes(invoice.id)), [selected?.invoices, selectedInvoiceIds]);
  const selectedCredits = useMemo(() => (selected?.credits || []).filter((credit) => selectedCreditIds.includes(credit.id)), [selected?.credits, selectedCreditIds]);

  const selectionSummary = useMemo(() => {
    const totalInvoices = round2(selectedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
    const totalCredits = round2(selectedCredits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0));
    const netToPay = round2(Math.max(0, totalInvoices - totalCredits));
    return { totalInvoices, totalCredits, netToPay };
  }, [selectedInvoices, selectedCredits]);

  const supplierTotals = useMemo(() => {
    if (!selected?.id) return { totalFactured: 0, totalCredits: 0, totalRemaining: 0, nextDueDate: '', nextDueAmount: 0, totalArchivedPaid: 0 };
    const totalFactured = round2((selected.invoices || []).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0));
    const totalCredits = round2((selected.credits || []).reduce((sum, credit) => sum + Number(credit.amount || 0), 0));
    const totalRemaining = round2(Math.max(0, totalFactured - totalCredits));
    const totalArchivedPaid = round2((selected.paymentArchive || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    const sortedInvoices = [...(selected.invoices || [])].sort((a, b) => new Date(a.dueDate || a.date || 0) - new Date(b.dueDate || b.date || 0));
    const nextDue = sortedInvoices[0] || null;
    return {
      totalFactured,
      totalCredits,
      totalRemaining,
      totalArchivedPaid,
      nextDueDate: nextDue?.dueDate || '',
      nextDueAmount: Number(nextDue?.amount || 0),
    };
  }, [selected]);

  const supplierPayments = useMemo(() => [ ...(selected?.paymentArchive || []) ].sort((a, b) => new Date(b.date) - new Date(a.date)), [selected]);

  const alerts = useMemo(() => {
    if (!selected?.id) return [];
    const maxDays = Number(selected.alertDays || 0);
    const todayDate = new Date(today());
    return (selected.invoices || [])
      .map((invoice) => {
        const due = new Date(invoice.dueDate || invoice.date || today());
        const diffDays = Math.ceil((due - todayDate) / 86400000);
        return { ...invoice, diffDays };
      })
      .filter((invoice) => invoice.diffDays <= maxDays)
      .sort((a, b) => new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date));
  }, [selected]);

  const printInvoiceList = (selectedOnly = false) => {
    if (!selected?.id) return;
    const invoicesToPrint = selectedOnly ? selectedInvoices : (selected.invoices || []);
    const rows = invoicesToPrint.map((invoice) => `
      <tr>
        <td>${invoice.number}</td>
        <td>${formatDate(invoice.date)}</td>
        <td>${formatDate(invoice.dueDate)}</td>
        <td>${invoice.paymentMode || '-'}</td>
        <td>${formatCurrency(invoice.amount)}</td>
      </tr>
    `).join('');
    printHTML(`Factures ${selected.name}`, `<h2>Factures fournisseur - ${selected.name}</h2><table><thead><tr><th>Facture</th><th>Date</th><th>Échéance</th><th>Mode</th><th>Montant</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Aucune facture.</td></tr>"}</tbody></table>`);
  };

  const printCreditsList = (selectedOnly = false) => {
    if (!selected?.id) return;
    const creditsToPrint = selectedOnly ? selectedCredits : (selected.credits || []);
    const rows = creditsToPrint.map((credit) => `
      <tr>
        <td>${credit.number}</td>
        <td>${formatDate(credit.date)}</td>
        <td>${formatDate(credit.dueDate)}</td>
        <td>${credit.pdfName || '-'}</td>
        <td>${formatCurrency(credit.amount)}</td>
      </tr>
    `).join('');
    printHTML(`Avoirs ${selected.name}`, `<h2>Avoirs fournisseur - ${selected.name}</h2><table><thead><tr><th>Avoir</th><th>Date</th><th>Date doc</th><th>PDF</th><th>Montant</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Aucun avoir.</td></tr>"}</tbody></table>`);
  };

  const printSupplierPaymentDetail = (payment) => {
    if (!selected?.id) return;
    const creditsRows = (payment.creditsApplied || []).map((credit) => `<tr><td>${credit.number || '-'}</td><td>${formatDate(credit.date)}</td><td>${formatCurrency(credit.usedAmount || 0)}</td></tr>`).join('');
    const invoicesRows = (payment.batchInvoices || []).map((invoice) => `<tr><td>${invoice.number}</td><td>${formatCurrency(invoice.invoiceAmountBefore || 0)}</td><td>${formatCurrency(invoice.creditUsed || 0)}</td><td>${formatCurrency(invoice.amountPaid || 0)}</td><td>${formatCurrency(invoice.remainingAfter || 0)}</td></tr>`).join('');
    printHTML(
      `Paiement ${payment.batchReference || payment.invoiceNumber || selected.name}`,
      `<h2>Paiement fournisseur - ${selected.name}</h2>
      <div class='info-grid'>
        <div><strong>Date</strong><span>${formatDate(payment.date)}</span></div>
        <div><strong>Mode</strong><span>${payment.paymentMode || '-'}</span></div>
        <div><strong>Référence</strong><span>${payment.reference || payment.note || '-'}</span></div>
        <div><strong>Montant payé</strong><span>${formatCurrency(payment.amount || 0)}</span></div>
        <div><strong>Avoir utilisé</strong><span>${formatCurrency(payment.creditUsed || 0)}</span></div>
        <div><strong>Total réglé</strong><span>${formatCurrency((payment.amount || 0) + (payment.creditUsed || 0))}</span></div>
      </div>
      <h3>Factures incluses</h3>
      <table><thead><tr><th>Facture</th><th>Avant règlement</th><th>Avoir utilisé</th><th>Payé</th><th>Reste</th></tr></thead><tbody>${invoicesRows || "<tr><td colspan='5'>Aucune facture.</td></tr>"}</tbody></table>
      <h3>Avoirs utilisés</h3>
      <table><thead><tr><th>Avoir</th><th>Date</th><th>Montant utilisé</th></tr></thead><tbody>${creditsRows || "<tr><td colspan='3'>Aucun avoir utilisé.</td></tr>"}</tbody></table>`
    );
  };

  const paySelection = () => {
    if (!selected?.id || !selectedInvoices.length) return;

    const cashBudgetStart = round2(Math.max(0, Number(paymentForm.amount || 0)));
    let cashBudget = cashBudgetStart;
    let creditBudget = round2(selectedCredits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0));
    let totalCashUsed = 0;
    let totalCreditUsed = 0;
    const creditsAppliedList = [];
    const updatedInvoices = [];
    const archivedBatchInvoices = [];
    const usedCreditMap = new Map();

    const sortedInvoices = [...(selected.invoices || [])].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const selectedInvoiceSet = new Set(selectedInvoiceIds);

    for (const invoice of sortedInvoices) {
      if (!selectedInvoiceSet.has(invoice.id)) {
        updatedInvoices.push(invoice);
        continue;
      }

      const invoiceBefore = round2(invoice.amount);
      if (invoiceBefore <= 0) continue;

      const creditUsed = round2(Math.min(invoiceBefore, creditBudget));
      creditBudget = round2(creditBudget - creditUsed);
      const afterCredit = round2(invoiceBefore - creditUsed);
      const cashUsed = round2(Math.min(afterCredit, cashBudget));
      cashBudget = round2(cashBudget - cashUsed);
      const remainingAfter = round2(invoiceBefore - creditUsed - cashUsed);

      totalCashUsed = round2(totalCashUsed + cashUsed);
      totalCreditUsed = round2(totalCreditUsed + creditUsed);

      archivedBatchInvoices.push({
        id: invoice.id,
        number: invoice.number,
        invoiceAmountBefore: invoiceBefore,
        amountPaid: cashUsed,
        creditUsed,
        remainingAfter,
        invoiceDate: invoice.date,
      });

      if (remainingAfter > 0) {
        updatedInvoices.push({
          ...invoice,
          amount: remainingAfter,
          status: 'non payée',
        });
      }
    }

    let creditRemainingToAssign = totalCreditUsed;
    const nextCredits = [];
    for (const credit of (selected.credits || [])) {
      if (!selectedCreditIds.includes(credit.id)) {
        nextCredits.push(credit);
        continue;
      }
      const available = round2(credit.amount);
      const usedAmount = round2(Math.min(available, creditRemainingToAssign));
      creditRemainingToAssign = round2(creditRemainingToAssign - usedAmount);
      if (usedAmount > 0) {
        usedCreditMap.set(credit.id, usedAmount);
        creditsAppliedList.push({ id: credit.id, number: credit.number, date: credit.date, usedAmount });
      }
      const remaining = round2(available - usedAmount);
      if (remaining > 0) nextCredits.push({ ...credit, amount: remaining });
    }

    if (totalCashUsed <= 0 && totalCreditUsed <= 0) return;

    const batchReference = paymentForm.reference || paymentForm.note || `LOT-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const primaryInvoice = archivedBatchInvoices[0] || null;
    const archiveEntry = {
      id: crypto.randomUUID(),
      supplierName: selected.name,
      invoiceId: primaryInvoice?.id || '',
      invoiceNumber: primaryInvoice?.number || 'Paiement global',
      invoiceDate: primaryInvoice?.invoiceDate || paymentForm.date,
      date: paymentForm.date || today(),
      amount: totalCashUsed,
      creditUsed: totalCreditUsed,
      creditsApplied: creditsAppliedList,
      paymentMode: paymentForm.mode || selected.defaultPaymentMode || 'virement',
      note: paymentForm.note || 'Paiement global fournisseur',
      reference: paymentForm.reference || '',
      batchReference,
      batchInvoices: archivedBatchInvoices,
      invoiceAmountBefore: round2(archivedBatchInvoices.reduce((sum, item) => sum + Number(item.invoiceAmountBefore || 0), 0)),
      remainingAfter: round2(archivedBatchInvoices.reduce((sum, item) => sum + Number(item.remainingAfter || 0), 0)),
    };

    setSuppliers((prev) => prev.map((supplier) => {
      if (supplier.id !== selected.id) return supplier;
      const safe = createSupplierShape(supplier);
      return {
        ...safe,
        invoices: updatedInvoices,
        credits: nextCredits,
        paymentArchive: [archiveEntry, ...safe.paymentArchive],
      };
    }));

    setSelectedInvoiceIds([]);
    setSelectedCreditIds([]);
    setPaymentForm({ date: today(), amount: 0, mode: selected.defaultPaymentMode || 'virement', note: '', reference: '' });
    addAudit('Paiement', `Paiement global fournisseur ${selected.name}`);
  };

  return (
    <div className="two-cols suppliers-layout">
      <div className="grid gap-16">
        <form className="panel premium-panel" onSubmit={saveSupplier}>
          <div className="panel-header"><div><h3>{editingSupplierId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3><p>Ajoute ou modifie les informations générales du fournisseur.</p></div></div>
          <div className="form-grid suppliers-form-grid">
            <input placeholder="Nom du fournisseur" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
            <input placeholder="Coordonnées / téléphone / email" value={supplierForm.contact} onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })} />
            <select value={supplierForm.billingType} onChange={(e) => setSupplierForm({ ...supplierForm, billingType: e.target.value })}>
              <option value="par achat">Type de facturation : par achat</option>
              <option value="journalier">Type de facturation : journalier</option>
              <option value="mensuel">Type de facturation : mensuel</option>
            </select>
            <select value={supplierForm.paymentCycle} onChange={(e) => setSupplierForm({ ...supplierForm, paymentCycle: e.target.value })}>
              <option value="à échéance">Périodicité : à échéance</option>
              <option value="chaque semaine">Périodicité : chaque semaine</option>
              <option value="tous les 14 jours">Périodicité : tous les 14 jours</option>
              <option value="mensuel">Périodicité : mensuel</option>
              <option value="personnalisé">Périodicité : personnalisé</option>
            </select>
            <select value={supplierForm.defaultPaymentMode} onChange={(e) => setSupplierForm({ ...supplierForm, defaultPaymentMode: e.target.value })}>
              <option value="virement">Mode par défaut : virement</option>
              <option value="prélèvement">Mode par défaut : prélèvement</option>
              <option value="chèque">Mode par défaut : chèque</option>
              <option value="espèces">Mode par défaut : espèces</option>
            </select>
            <input type="number" min="0" placeholder="Alerte avant paiement (jours)" value={supplierForm.alertDays} onChange={(e) => setSupplierForm({ ...supplierForm, alertDays: Number(e.target.value) })} />
          </div>
          <div className="inline-actions wrap-actions">
            <button className="primary-btn">{editingSupplierId ? 'Enregistrer les modifications' : 'Ajouter le fournisseur'}</button>
            {editingSupplierId && <button type="button" className="secondary-btn" onClick={resetSupplierForm}>Annuler</button>}
          </div>
        </form>

        <section className="panel premium-panel">
          <div className="panel-header"><div><h3>Liste des fournisseurs</h3><p>Sélectionne un fournisseur pour voir ses factures, avoirs et paiements archivés.</p></div></div>
          <div className="list-stack suppliers-list">
            {filtered.map((supplier) => (
              <div key={supplier.id} className={`list-item supplier-list-item ${selected?.id === supplier.id ? 'selected' : ''}`}>
                <button className="supplier-select-btn" onClick={() => { setSelectedId(supplier.id); setSelectedInvoiceIds([]); setSelectedCreditIds([]); }}>
                  {supplier.name}
                  <span>{supplier.contact}</span>
                </button>
                <div className="actions-cell compact-actions">
                  <button className="link-btn" onClick={() => loadSupplierForEdit(supplier)}>Modifier</button>
                  <button className="link-btn danger-text" onClick={() => deleteSupplier(supplier.id)}>Supprimer</button>
                </div>
              </div>
            ))}
            {!filtered.length && <div className="muted-line">Aucun fournisseur.</div>}
          </div>
        </section>
      </div>

      <div className="grid gap-16">
        <section className="panel premium-panel">
          <div className="panel-header space-between"><div><h3>Fiche fournisseur</h3><p>Logique corrigée : sélection de plusieurs factures + plusieurs avoirs + paiement global + archivage.</p></div><div className="inline-actions"><button className="secondary-btn" onClick={() => printInvoiceList(false)}>Imprimer tout</button><button className="secondary-btn" onClick={() => printInvoiceList(true)}>Imprimer sélection</button></div></div>
          {selected?.id ? (
            <>
              <div className="stats-grid four-cols suppliers-kpi-grid">
                <div className="stat-card"><span>Total factures ouvertes</span><strong>{formatCurrency(supplierTotals.totalFactured)}</strong></div>
                <div className="stat-card"><span>Total avoirs ouverts</span><strong>{formatCurrency(supplierTotals.totalCredits)}</strong></div>
                <div className="stat-card"><span>Reste ouvert</span><strong>{formatCurrency(supplierTotals.totalRemaining)}</strong></div>
                <div className="stat-card"><span>Déjà payé / archivé</span><strong>{formatCurrency(supplierTotals.totalArchivedPaid)}</strong></div>
                <div className="stat-card"><span>Prochaine échéance</span><strong>{supplierTotals.nextDueDate ? formatDate(supplierTotals.nextDueDate) : 'Aucune'}</strong><span>{supplierTotals.nextDueDate ? formatCurrency(supplierTotals.nextDueAmount) : 'Aucun montant'}</span></div>
              </div>

              <div className="info-grid suppliers-summary-grid">
                <div><strong>Nom du fournisseur</strong><span>{selected.name}</span></div>
                <div><strong>Coordonnées</strong><span>{selected.contact || 'Non renseigné'}</span></div>
                <div><strong>Type de facturation</strong><span>{selected.billingType}</span></div>
                <div><strong>Périodicité</strong><span>{selected.paymentCycle || 'à échéance'}</span></div>
                <div><strong>Mode par défaut</strong><span>{selected.defaultPaymentMode || 'virement'}</span></div>
                <div><strong>Alerte</strong><span>{selected.alertDays || 0} jour(s)</span></div>
              </div>

              <div className="box-panel warning-panel suppliers-alert-box">
                <div className="panel-header"><div><h4>Alertes paiement</h4><p>Cette zone indique les factures à surveiller en priorité.</p></div></div>
                {!!alerts.length ? (
                  <div className="list-stack compact-list">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="list-item static-item">
                        <strong>{alert.number}</strong>
                        <span>Échéance {formatDate(alert.dueDate)} • {formatCurrency(alert.amount)} • {alert.diffDays < 0 ? 'en retard' : `${alert.diffDays} jour(s)`}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="muted-line">Aucune alerte.</div>}
              </div>

              <div className="grid gap-16 suppliers-blocks-grid">
                <div className="box-panel soft-panel suppliers-form-box">
                  <div className="panel-header"><div><h4>{editingInvoiceId ? 'Modifier la facture' : 'Nouvelle facture'}</h4><p>Ajoute les factures ouvertes du fournisseur.</p></div></div>
                  <div className="form-grid suppliers-form-grid">
                    <input placeholder="Numéro de facture" value={invoiceForm.number} onChange={(e) => setInvoiceForm({ ...invoiceForm, number: e.target.value })} />
                    <input type="date" value={invoiceForm.date} onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })} />
                    <input type="number" step="0.01" placeholder="Montant total" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} />
                    <input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                    <select value={invoiceForm.paymentMode} onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value })}>
                      <option value="virement">Mode : virement</option>
                      <option value="prélèvement">Mode : prélèvement</option>
                      <option value="chèque">Mode : chèque</option>
                      <option value="espèces">Mode : espèces</option>
                    </select>
                    <div className="file-field suppliers-file-field"><label className="secondary-btn">Joindre la facture PDF<input type="file" accept="application/pdf" hidden onChange={(e) => setInvoiceForm({ ...invoiceForm, pdfName: e.target.files?.[0]?.name || '' })} /></label><span className="muted-line">{invoiceForm.pdfName || 'Aucun PDF joint'}</span></div>
                  </div>
                  <div className="inline-actions wrap-actions">
                    <button type="button" className="primary-btn" onClick={saveInvoice}>{editingInvoiceId ? 'Enregistrer les modifications' : 'Ajouter facture'}</button>
                    {editingInvoiceId && <button type="button" className="secondary-btn" onClick={resetInvoiceForm}>Annuler</button>}
                  </div>
                </div>

                <div className="box-panel soft-panel suppliers-form-box">
                  <div className="panel-header"><div><h4>{editingCreditId ? 'Modifier l\'avoir' : 'Nouvel avoir'}</h4><p>Ajoute les avoirs ouverts qui doivent être déduits automatiquement.</p></div></div>
                  <div className="form-grid suppliers-form-grid">
                    <input placeholder="Numéro d'avoir" value={creditForm.number} onChange={(e) => setCreditForm({ ...creditForm, number: e.target.value })} />
                    <input type="date" value={creditForm.date} onChange={(e) => setCreditForm({ ...creditForm, date: e.target.value })} />
                    <input type="number" step="0.01" placeholder="Montant total avoir" value={creditForm.amount} onChange={(e) => setCreditForm({ ...creditForm, amount: Number(e.target.value) })} />
                    <input type="date" value={creditForm.dueDate} onChange={(e) => setCreditForm({ ...creditForm, dueDate: e.target.value })} />
                    <select value={creditForm.paymentMode} onChange={(e) => setCreditForm({ ...creditForm, paymentMode: e.target.value })}>
                      <option value="virement">Mode : virement</option>
                      <option value="prélèvement">Mode : prélèvement</option>
                      <option value="chèque">Mode : chèque</option>
                      <option value="espèces">Mode : espèces</option>
                    </select>
                    <div className="file-field suppliers-file-field"><label className="secondary-btn">Joindre l'avoir PDF<input type="file" accept="application/pdf" hidden onChange={(e) => setCreditForm({ ...creditForm, pdfName: e.target.files?.[0]?.name || '' })} /></label><span className="muted-line">{creditForm.pdfName || 'Aucun PDF joint'}</span></div>
                  </div>
                  <div className="inline-actions wrap-actions">
                    <button type="button" className="primary-btn" onClick={saveCredit}>{editingCreditId ? 'Enregistrer les modifications' : 'Ajouter avoir'}</button>
                    {editingCreditId && <button type="button" className="secondary-btn" onClick={resetCreditForm}>Annuler</button>}
                  </div>
                </div>
              </div>

              <div className="box-panel soft-panel suppliers-table-box">
                <div className="panel-header space-between"><div><h4>Factures du fournisseur</h4><p>Coche une ou plusieurs factures à inclure dans le paiement global.</p></div></div>
                <table>
                  <thead><tr><th></th><th>Facture</th><th>Date facture</th><th>Échéance</th><th>Mode</th><th>Montant ouvert</th><th>Actions</th></tr></thead>
                  <tbody>
                    {(selected.invoices || []).map((invoice) => (
                      <tr key={invoice.id}>
                        <td><input type="checkbox" checked={selectedInvoiceIds.includes(invoice.id)} onChange={() => toggleInvoiceSelection(invoice.id)} /></td>
                        <td>{invoice.number}<div className="muted-line">{invoice.pdfName || 'Sans PDF'}</div></td>
                        <td>{formatDate(invoice.date)}</td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>{invoice.paymentMode || '-'}</td>
                        <td>{formatCurrency(invoice.amount)}</td>
                        <td className="actions-cell suppliers-actions-cell"><button className="link-btn" onClick={() => loadInvoiceForEdit(invoice)}>Modifier</button><button className="link-btn danger-text" onClick={() => deleteInvoice(invoice.id)}>Supprimer</button></td>
                      </tr>
                    ))}
                    {!(selected.invoices || []).length && <tr><td colSpan="7">Aucune facture.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="box-panel soft-panel suppliers-table-box">
                <div className="panel-header space-between"><div><h4>Avoirs du fournisseur</h4><p>Coche un ou plusieurs avoirs. Ils seront déduits automatiquement lors du paiement.</p></div><div className="inline-actions"><button className="secondary-btn" onClick={() => printCreditsList(false)}>Imprimer tout</button><button className="secondary-btn" onClick={() => printCreditsList(true)}>Imprimer sélection</button></div></div>
                <table>
                  <thead><tr><th></th><th>Avoir</th><th>Date</th><th>Date doc</th><th>PDF</th><th>Montant ouvert</th><th>Actions</th></tr></thead>
                  <tbody>
                    {(selected.credits || []).map((credit) => (
                      <tr key={credit.id}>
                        <td><input type="checkbox" checked={selectedCreditIds.includes(credit.id)} onChange={() => toggleCreditSelection(credit.id)} /></td>
                        <td>{credit.number}</td>
                        <td>{formatDate(credit.date)}</td>
                        <td>{formatDate(credit.dueDate)}</td>
                        <td>{credit.pdfName || 'Sans PDF'}</td>
                        <td>{formatCurrency(credit.amount)}</td>
                        <td className="actions-cell suppliers-actions-cell"><button className="link-btn" onClick={() => loadCreditForEdit(credit)}>Modifier</button><button className="link-btn danger-text" onClick={() => deleteCredit(credit.id)}>Supprimer</button></td>
                      </tr>
                    ))}
                    {!(selected.credits || []).length && <tr><td colSpan="7">Aucun avoir.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="box-panel soft-panel suppliers-payment-panel">
                <div className="panel-header"><div><h4>Paiement global</h4><p>Sélectionne les factures et les avoirs, puis valide un seul paiement global archivé.</p></div></div>
                <div className="stats-grid four-cols suppliers-kpi-grid">
                  <div className="stat-card"><span>Factures sélectionnées</span><strong>{formatCurrency(selectionSummary.totalInvoices)}</strong></div>
                  <div className="stat-card"><span>Avoirs sélectionnés</span><strong>{formatCurrency(selectionSummary.totalCredits)}</strong></div>
                  <div className="stat-card"><span>Net à payer</span><strong>{formatCurrency(selectionSummary.netToPay)}</strong></div>
                  <div className="stat-card"><span>Montant saisi</span><strong>{formatCurrency(paymentForm.amount)}</strong></div>
                </div>
                <div className="form-grid suppliers-form-grid">
                  <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                  <input type="number" step="0.01" placeholder="Montant payé" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
                  <select value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}>
                    <option value="virement">Mode : virement</option>
                    <option value="prélèvement">Mode : prélèvement</option>
                    <option value="chèque">Mode : chèque</option>
                    <option value="espèces">Mode : espèces</option>
                  </select>
                  <input placeholder="Référence / preuve de paiement" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
                  <input placeholder="Remarque" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                </div>
                <div className="hint">Logique appliquée : les avoirs sélectionnés sont déduits d'abord, puis le montant payé est réparti automatiquement sur les factures cochées. Les éléments réglés disparaissent de la liste active et passent dans l'archive.</div>
                <div className="inline-actions wrap-actions">
                  <button type="button" className="primary-btn" onClick={paySelection}>Payer la sélection</button>
                </div>
              </div>

              <div className="box-panel soft-panel suppliers-table-box">
                <div className="panel-header"><div><h4>Archive des paiements fournisseur</h4><p>Chaque paiement global reste archivé et imprimable.</p></div></div>
                <table>
                  <thead><tr><th>Date</th><th>Facture repère</th><th>Montant payé</th><th>Avoir utilisé</th><th>Reste après règlement</th><th>Référence</th><th>Action</th></tr></thead>
                  <tbody>
                    {supplierPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.date)}</td>
                        <td>{payment.invoiceNumber}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{formatCurrency(payment.creditUsed || 0)}</td>
                        <td>{formatCurrency(payment.remainingAfter || 0)}</td>
                        <td>{payment.reference || payment.note || '-'}</td>
                        <td className="actions-cell suppliers-actions-cell"><button className="link-btn" onClick={() => printSupplierPaymentDetail(payment)}>Imprimer détail</button></td>
                      </tr>
                    ))}
                    {!supplierPayments.length && <tr><td colSpan="7">Aucun paiement archivé.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div>Sélectionne un fournisseur.</div>}
        </section>
      </div>
    </div>
  );
}

function ArchivesModule({ suppliers, clients, quotes, auditLog }) {
  const supplierPayments = suppliers.flatMap((supplier) => (supplier.paymentArchive || []).map((payment) => ({
    id: payment.id,
    supplierName: supplier.name,
    invoiceNumber: payment.invoiceNumber,
    date: payment.date,
    amount: payment.amount,
    creditUsed: payment.creditUsed || 0,
    note: payment.note || '-',
  })));
  const supplierCredits = suppliers.flatMap((supplier) => (supplier.paymentArchive || []).flatMap((payment) => (payment.creditsApplied || []).map((credit) => ({
    id: `${payment.id}-${credit.id}`,
    supplierName: supplier.name,
    number: credit.number,
    date: payment.date,
    amount: credit.usedAmount,
  }))));
  return (
    <div className="grid gap-16">
      <section className="panel premium-panel">
        <div className="panel-header"><div><h3>Archives</h3><p>Conserve ici l'historique imprimable des paiements, avoirs et actions du logiciel.</p></div></div>
        <div className="stats-grid four-cols">
          <div className="stat-card"><span>Paiements fournisseur archivés</span><strong>{supplierPayments.length}</strong></div>
          <div className="stat-card"><span>Avoirs archivés</span><strong>{supplierCredits.length}</strong></div>
          <div className="stat-card"><span>Devis archivés</span><strong>{quotes.length}</strong></div>
          <div className="stat-card"><span>Historique actions</span><strong>{auditLog.length}</strong></div>
        </div>
      </section>
      <section className="panel premium-panel">
        <div className="panel-header"><div><h3>Archive des paiements fournisseur</h3></div></div>
        <table><thead><tr><th>Fournisseur</th><th>Facture</th><th>Date</th><th>Montant payé</th><th>Avoir</th><th>Référence</th></tr></thead><tbody>{supplierPayments.map((p) => <tr key={p.id}><td>{p.supplierName}</td><td>{p.invoiceNumber}</td><td>{formatDate(p.date)}</td><td>{formatCurrency(p.amount)}</td><td>{formatCurrency(p.creditUsed || 0)}</td><td>{p.note}</td></tr>)}{!supplierPayments.length && <tr><td colSpan="6">Aucun paiement fournisseur archivé.</td></tr>}</tbody></table>
      </section>
      <section className="panel premium-panel">
        <div className="panel-header"><div><h3>Archive des avoirs fournisseur</h3></div></div>
        <table><thead><tr><th>Fournisseur</th><th>Avoir</th><th>Date</th><th>Montant</th></tr></thead><tbody>{supplierCredits.map((c) => <tr key={c.id}><td>{c.supplierName}</td><td>{c.number}</td><td>{formatDate(c.date)}</td><td>{formatCurrency(c.amount)}</td></tr>)}{!supplierCredits.length && <tr><td colSpan="4">Aucun avoir archivé.</td></tr>}</tbody></table>
      </section>
    </div>
  );
}

function FinanceModule({ finance, setFinance, receipts, setReceipts, globalSearch, addAudit }) {
  const paymentTabs = ['Carte', 'Espèces', 'Chèque', 'Virement'];
  const financeSections = [
    { key: 'ca', label: "Chiffre d’affaires global" },
    { key: 'recettes', label: 'Recettes' },
    { key: 'carburant', label: 'Réapprovisionnement carburant' },
    { key: 'charges', label: 'Charges' },
  ];

  const [activeSection, setActiveSection] = useState('ca');
  const [activePaymentMode, setActivePaymentMode] = useState('Carte');
  const [selectedIds, setSelectedIds] = useState([]);
  const [caForm, setCaForm] = useState({ amount: 0, invoiceNumber: '', date: today(), payerName: '', pdfName: '' });
  const [editingCaId, setEditingCaId] = useState(null);

  const [cashDepositForm, setCashDepositForm] = useState({ operationNumber: '', date: today(), amount: 0, note: '' });
  const [editingCashDepositId, setEditingCashDepositId] = useState(null);
  const [openedCashDepositId, setOpenedCashDepositId] = useState(null);

  const [chequeDepositForm, setChequeDepositForm] = useState({ reference: '', date: today(), amount: 0, slipCopyName: '', note: '' });
  const [editingChequeDepositId, setEditingChequeDepositId] = useState(null);
  const [openedChequeDepositId, setOpenedChequeDepositId] = useState(null);

  const [receiptForm, setReceiptForm] = useState({ date: today(), amount: 0, person: '' });
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState('');

  const [fuelForm, setFuelForm] = useState({ vehicleModel: '', plate: '', driver: '', amount: 0, date: today() });
  const [editingFuelId, setEditingFuelId] = useState(null);
  const [driverFilter, setDriverFilter] = useState('');

  const [chargeForm, setChargeForm] = useState({ date: today(), label: '', category: '', amount: 0, note: '' });
  const [editingChargeId, setEditingChargeId] = useState(null);

  const [reportDate, setReportDate] = useState(today());
  const [reportMonth, setReportMonth] = useState(today().slice(0, 7));
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());

  const normalizedSearch = globalSearch.toLowerCase();

  const isPaymentRow = (item) => item.type !== 'approvisionnement' && item.type !== 'charge' && item.type !== 'cash_deposit' && item.type !== 'cheque_deposit';
  const paymentRows = finance.filter(isPaymentRow);
  const allCaRows = paymentRows;
  const caRows = allCaRows.filter((item) => item.mode === activePaymentMode && [item.payerName, item.amount, item.invoiceNumber, item.pdfName].join(' ').toLowerCase().includes(normalizedSearch));

  const cashInvoiceRows = useMemo(() => allCaRows.filter((item) => item.mode === 'Espèces').sort((a, b) => new Date(a.date) - new Date(b.date)), [allCaRows]);
  const chequeInvoiceRows = useMemo(() => allCaRows.filter((item) => item.mode === 'Chèque').sort((a, b) => new Date(a.date) - new Date(b.date)), [allCaRows]);
  const cashDeposits = useMemo(() => finance.filter((item) => item.type === 'cash_deposit').sort((a, b) => new Date(a.date) - new Date(b.date)), [finance]);
  const chequeDeposits = useMemo(() => finance.filter((item) => item.type === 'cheque_deposit').sort((a, b) => new Date(a.date) - new Date(b.date)), [finance]);

  const buildDepositAssignments = (invoices, deposits) => {
    const openDeposits = deposits.map((deposit) => ({
      ...deposit,
      amount: Number(deposit.amount || 0),
      matchedInvoiceIds: [],
      matchedInvoices: [],
      matchedTotal: 0,
      remaining: Number(deposit.amount || 0),
      status: 'ouvert',
    }));
    const pendingInvoices = [];

    invoices.forEach((invoice) => {
      const amount = Number(invoice.amount || 0);
      if (!(amount > 0)) return;
      const candidates = openDeposits
        .map((deposit, index) => ({ deposit, index, remainderAfter: Number((deposit.remaining - amount).toFixed(2)) }))
        .filter((item) => item.remainderAfter >= 0);

      if (!candidates.length) {
        pendingInvoices.push(invoice);
        return;
      }

      candidates.sort((a, b) => {
        if (a.remainderAfter !== b.remainderAfter) return a.remainderAfter - b.remainderAfter;
        return new Date(a.deposit.date) - new Date(b.deposit.date);
      });

      const chosen = candidates[0].deposit;
      chosen.matchedInvoiceIds.push(invoice.id);
      chosen.matchedInvoices.push(invoice);
      chosen.matchedTotal = Number((chosen.matchedTotal + amount).toFixed(2));
      chosen.remaining = Number((chosen.remaining - amount).toFixed(2));
      chosen.status = chosen.remaining === 0 ? 'clôturé' : 'ouvert';
    });

    return {
      deposits: openDeposits,
      pendingInvoices,
    };
  };

  const cashAssignment = useMemo(() => buildDepositAssignments(cashInvoiceRows, cashDeposits), [cashInvoiceRows, cashDeposits]);
  const chequeAssignment = useMemo(() => buildDepositAssignments(chequeInvoiceRows, chequeDeposits), [chequeInvoiceRows, chequeDeposits]);

  const openedCashDeposit = cashAssignment.deposits.find((deposit) => deposit.id === openedCashDepositId) || null;
  const openedChequeDeposit = chequeAssignment.deposits.find((deposit) => deposit.id === openedChequeDepositId) || null;

  const fuelRows = finance.filter((item) => item.type === 'approvisionnement' && (!driverFilter || item.driver === driverFilter));
  const chargeRows = finance.filter((item) => item.type === 'charge' && [item.label, item.category, item.amount, item.note].join(' ').toLowerCase().includes(normalizedSearch));
  const receiptRows = receipts.filter((r) => [r.person, r.amount, r.date].join(' ').toLowerCase().includes(normalizedSearch));
  const filteredByPerson = selectedPerson ? receiptRows.filter((r) => r.person === selectedPerson) : receiptRows;
  const totalsByPerson = receiptRows.reduce((acc, item) => ({ ...acc, [item.person]: (acc[item.person] || 0) + Number(item.amount || 0) }), {});

  const totalGeneral = allCaRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentTabTotal = caRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const selectedTotal = caRows.filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalReceipts = receiptRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalFuel = finance.filter((item) => item.type === 'approvisionnement').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalCharges = finance.filter((item) => item.type === 'charge').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const drivers = [...new Set(finance.filter((item) => item.type === 'approvisionnement').map((item) => item.driver).filter(Boolean))];
  const fuelByDriver = finance.filter((item) => item.type === 'approvisionnement').reduce((acc, item) => ({ ...acc, [item.driver]: (acc[item.driver] || 0) + Number(item.amount || 0) }), {});


  const openUltraCleanPrint = (docTitle, docHeading, bodyHtml) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const logoPath = '/logo-luxe.jpeg';
    win.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111;padding:34px 42px}
            .doc{max-width:900px;margin:0 auto}
            .head{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:18px}
            .head img{width:138px;height:138px;object-fit:contain}
            .brand{font-size:28px;font-weight:300;letter-spacing:10px;text-transform:uppercase;text-align:center;line-height:1.18}
            .brand-sub{font-size:18px;letter-spacing:5px;font-weight:700}
            .coords{display:grid;gap:4px;text-align:center;font-size:14px;margin-top:2px}
            .title{margin:20px 0 18px;text-align:center;font-size:28px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
            .meta{width:100%;border-collapse:collapse;margin-bottom:16px}
            .meta td{padding:6px 0;font-size:14px;border:none}
            .meta td.label{font-weight:700;width:180px}
            table.report{width:100%;border-collapse:collapse;margin-top:8px}
            table.report th,table.report td{padding:10px 8px;border-bottom:1px solid #d9d9d9;font-size:14px;text-align:left}
            table.report th{font-weight:800;border-top:2px solid #111;border-bottom:2px solid #111}
            table.report td.amount, table.report th.amount{text-align:right}
            .total-row{display:flex;justify-content:flex-end;gap:12px;margin-top:18px;font-size:18px;font-weight:800}
            .footer{margin-top:28px;padding-top:14px;border-top:1px solid #111;text-align:center;font-size:13px;font-weight:700}
            .note{font-size:13px;color:#444;margin-top:8px}
            @media print{body{padding:18px}.doc{max-width:none}}
          </style>
        </head>
        <body>
          <div class="doc">
            <div class="head">
              <img src="${logoPath}" alt="THE KING PIÈCES AUTOS" />
              <div class="brand">THE KING<br/>PIECES AUTO</div>
              <div class="brand-sub">BY MAFYNA</div>
              <div class="coords">
                <div>01 84 74 15 00</div>
                <div>06 50 05 89 45</div>
                <div>thekingpiecesautos@gmail.com</div>
              </div>
            </div>
            <div class="title">${docHeading}</div>
            ${bodyHtml}
            <div class="footer">SIRET : 977 631 530 00010 | TVA : FR80 977 631 530</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const printUltraCleanReport = (docTitle, heading, rowsHtml, totalHtml, topMetaHtml = '') => {
    openUltraCleanPrint(docTitle, heading, `
      ${topMetaHtml}
      <table class="report">
        <thead><tr><th>Date</th><th>Client</th><th>Mode</th><th class="amount">Montant</th></tr></thead>
        <tbody>${rowsHtml || "<tr><td colspan='4'>Aucune ligne.</td></tr>"}</tbody>
      </table>
      <div class="total-row"><span>TOTAL</span><span>${totalHtml}</span></div>
    `);
  };

  const printUltraCleanDepositDocument = (deposit, mode) => {
    if (!deposit) return;
    const refLabel = mode === 'Espèces' ? "N° opération" : 'Référence remise';
    const refValue = deposit.operationNumber || deposit.reference || '-';
    const rows = (deposit.matchedInvoices || []).map((item) => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${item.payerName || '-'}</td>
        <td>${mode}</td>
        <td class="amount">${formatCurrency(item.amount)}</td>
      </tr>
    `).join('');
    const topMetaHtml = `
      <table class="meta">
        <tbody>
          <tr><td class="label">${refLabel}</td><td>${refValue}</td></tr>
          <tr><td class="label">Date</td><td>${formatDate(deposit.date)}</td></tr>
          <tr><td class="label">Montant prévu</td><td>${formatCurrency(deposit.amount)}</td></tr>
          <tr><td class="label">Montant affecté</td><td>${formatCurrency(deposit.matchedTotal || 0)}</td></tr>
          <tr><td class="label">Statut</td><td>${deposit.status || '-'}</td></tr>
          ${deposit.slipCopyName ? `<tr><td class="label">Copie remise</td><td>${deposit.slipCopyName}</td></tr>` : ''}
          ${deposit.note ? `<tr><td class="label">Remarque</td><td>${deposit.note}</td></tr>` : ''}
        </tbody>
      </table>
    `;
    printUltraCleanReport(
      `${mode === 'Espèces' ? 'Versement espèces' : 'Remise chèques'} ${refValue}`,
      mode === 'Espèces' ? 'VERSEMENT ESPÈCES' : 'REMISE CHÈQUES',
      rows,
      formatCurrency(deposit.matchedTotal || 0),
      topMetaHtml,
    );
  };

  const resetCaForm = () => { setCaForm({ amount: 0, invoiceNumber: '', date: today(), payerName: '', pdfName: '' }); setEditingCaId(null); };
  const saveCa = () => {
    const item = { id: editingCaId || crypto.randomUUID(), ...caForm, amount: Number(caForm.amount || 0), mode: activePaymentMode, type: 'paiement' };
    if (editingCaId) {
      setFinance((prev) => prev.map((row) => row.id === editingCaId ? item : row));
      addAudit('Modification', `Chiffre d'affaires ${activePaymentMode}`);
    } else {
      setFinance((prev) => [item, ...prev]);
      addAudit('Ajout', `Chiffre d'affaires ${activePaymentMode}`);
    }
    resetCaForm();
  };
  const editCa = (item) => {
    setEditingCaId(item.id);
    setActivePaymentMode(item.mode);
    setCaForm({ amount: Number(item.amount || 0), invoiceNumber: item.invoiceNumber || '', date: item.date || today(), payerName: item.payerName || '', pdfName: item.pdfName || '' });
    setActiveSection('ca');
  };
  const deleteFinanceItem = (id, label = 'Transaction finance') => {
    setFinance((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    addAudit('Suppression', label);
  };
  const toggleSelection = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

  const resetCashDepositForm = () => {
    setCashDepositForm({ operationNumber: '', date: today(), amount: 0, note: '' });
    setEditingCashDepositId(null);
  };
  const saveCashDeposit = () => {
    const item = {
      id: editingCashDepositId || crypto.randomUUID(),
      type: 'cash_deposit',
      operationNumber: cashDepositForm.operationNumber,
      date: cashDepositForm.date,
      amount: Number(cashDepositForm.amount || 0),
      note: cashDepositForm.note || '',
    };
    if (editingCashDepositId) {
      setFinance((prev) => prev.map((row) => row.id === editingCashDepositId ? item : row));
      addAudit('Modification', `Versement espèces ${item.operationNumber || item.date}`);
    } else {
      setFinance((prev) => [item, ...prev]);
      addAudit('Ajout', `Versement espèces ${item.operationNumber || item.date}`);
    }
    resetCashDepositForm();
  };
  const editCashDeposit = (item) => {
    setEditingCashDepositId(item.id);
    setCashDepositForm({ operationNumber: item.operationNumber || '', date: item.date || today(), amount: Number(item.amount || 0), note: item.note || '' });
    setActiveSection('ca');
    setActivePaymentMode('Espèces');
  };

  const resetChequeDepositForm = () => {
    setChequeDepositForm({ reference: '', date: today(), amount: 0, slipCopyName: '', note: '' });
    setEditingChequeDepositId(null);
  };
  const saveChequeDeposit = () => {
    const item = {
      id: editingChequeDepositId || crypto.randomUUID(),
      type: 'cheque_deposit',
      reference: chequeDepositForm.reference,
      date: chequeDepositForm.date,
      amount: Number(chequeDepositForm.amount || 0),
      slipCopyName: chequeDepositForm.slipCopyName || '',
      note: chequeDepositForm.note || '',
    };
    if (editingChequeDepositId) {
      setFinance((prev) => prev.map((row) => row.id === editingChequeDepositId ? item : row));
      addAudit('Modification', `Remise chèques ${item.reference || item.date}`);
    } else {
      setFinance((prev) => [item, ...prev]);
      addAudit('Ajout', `Remise chèques ${item.reference || item.date}`);
    }
    resetChequeDepositForm();
  };
  const editChequeDeposit = (item) => {
    setEditingChequeDepositId(item.id);
    setChequeDepositForm({ reference: item.reference || '', date: item.date || today(), amount: Number(item.amount || 0), slipCopyName: item.slipCopyName || '', note: item.note || '' });
    setActiveSection('ca');
    setActivePaymentMode('Chèque');
  };

  const printDepositDetail = (deposit, mode) => {
    printUltraCleanDepositDocument(deposit, mode);
  };

  const resetReceiptForm = () => { setReceiptForm({ date: today(), amount: 0, person: '' }); setEditingReceiptId(null); };
  const saveReceipt = () => {
    const item = { id: editingReceiptId || crypto.randomUUID(), ...receiptForm, amount: Number(receiptForm.amount || 0) };
    if (editingReceiptId) {
      setReceipts((prev) => prev.map((row) => row.id === editingReceiptId ? item : row));
      addAudit('Modification', 'Recette');
    } else {
      setReceipts((prev) => [item, ...prev]);
      addAudit('Ajout', 'Recette');
    }
    resetReceiptForm();
  };
  const editReceipt = (item) => {
    setEditingReceiptId(item.id);
    setReceiptForm({ date: item.date || today(), amount: Number(item.amount || 0), person: item.person || '' });
    setActiveSection('recettes');
  };
  const deleteReceipt = (id) => { setReceipts((prev) => prev.filter((item) => item.id !== id)); addAudit('Suppression', 'Recette'); };

  const resetFuelForm = () => { setFuelForm({ vehicleModel: '', plate: '', driver: '', amount: 0, date: today() }); setEditingFuelId(null); };
  const saveFuel = () => {
    const item = { id: editingFuelId || crypto.randomUUID(), ...fuelForm, amount: Number(fuelForm.amount || 0), type: 'approvisionnement' };
    if (editingFuelId) {
      setFinance((prev) => prev.map((row) => row.id === editingFuelId ? item : row));
      addAudit('Modification', 'Réapprovisionnement carburant');
    } else {
      setFinance((prev) => [item, ...prev]);
      addAudit('Ajout', 'Réapprovisionnement carburant');
    }
    resetFuelForm();
  };
  const editFuel = (item) => {
    setEditingFuelId(item.id);
    setFuelForm({ vehicleModel: item.vehicleModel || '', plate: item.plate || '', driver: item.driver || '', amount: Number(item.amount || 0), date: item.date || today() });
    setActiveSection('carburant');
  };

  const resetChargeForm = () => { setChargeForm({ date: today(), label: '', category: '', amount: 0, note: '' }); setEditingChargeId(null); };
  const saveCharge = () => {
    const item = { id: editingChargeId || crypto.randomUUID(), ...chargeForm, amount: Number(chargeForm.amount || 0), type: 'charge' };
    if (editingChargeId) {
      setFinance((prev) => prev.map((row) => row.id === editingChargeId ? item : row));
      addAudit('Modification', 'Charge');
    } else {
      setFinance((prev) => [item, ...prev]);
      addAudit('Ajout', 'Charge');
    }
    resetChargeForm();
  };
  const editCharge = (item) => {
    setEditingChargeId(item.id);
    setChargeForm({ date: item.date || today(), label: item.label || '', category: item.category || '', amount: Number(item.amount || 0), note: item.note || '' });
    setActiveSection('charges');
  };

  const printCAReport = (scope) => {
    let rowsData = allCaRows;
    if (scope === 'jour') rowsData = rowsData.filter((item) => item.date === reportDate);
    if (scope === 'mois') rowsData = rowsData.filter((item) => String(item.date || '').slice(0, 7) === reportMonth);
    if (scope === 'année') rowsData = rowsData.filter((item) => String(item.date || '').slice(0, 4) === reportYear);
    const rows = rowsData.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.payerName || '-'}</td><td>${item.mode || '-'}</td><td class="amount">${formatCurrency(item.amount)}</td></tr>`).join('');
    const total = rowsData.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const scopeLabel = scope === 'jour' ? formatDate(reportDate) : scope === 'mois' ? reportMonth : reportYear;
    const topMetaHtml = `<table class="meta"><tbody><tr><td class="label">Période</td><td>${scopeLabel}</td></tr></tbody></table>`;
    printUltraCleanReport(`Rapport journalier ${scope}`, 'RAPPORT JOURNALIER', rows, formatCurrency(total), topMetaHtml);
  };
  const printReceipts = (scope) => {
    let rowsData = receiptRows;
    if (scope === 'jour') rowsData = rowsData.filter((item) => item.date === reportDate);
    if (scope === 'mois') rowsData = rowsData.filter((item) => String(item.date || '').slice(0, 7) === reportMonth);
    if (scope === 'année') rowsData = rowsData.filter((item) => String(item.date || '').slice(0, 4) === reportYear);
    const rows = rowsData.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.person}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('');
    const total = rowsData.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    printHTML(`Recettes ${scope}`, `<h2>Recettes - ${scope}</h2><table><thead><tr><th>Date</th><th>Personne</th><th>Montant</th></tr></thead><tbody>${rows || "<tr><td colspan='3'>Aucune recette.</td></tr>"}</tbody></table><div class='total'>Total : ${formatCurrency(total)}</div>`);
  };
  const printReceiptsByPerson = () => {
    const rows = filteredByPerson.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.person}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('');
    const total = filteredByPerson.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    printHTML('Recettes par personne', `<h2>Recettes - ${selectedPerson || 'Toutes les personnes'}</h2><table><thead><tr><th>Date</th><th>Personne</th><th>Montant</th></tr></thead><tbody>${rows || "<tr><td colspan='3'>Aucune recette.</td></tr>"}</tbody></table><div class='total'>Total : ${formatCurrency(total)}</div>`);
  };
  const printFuelByDriver = () => {
    const rows = fuelRows.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.vehicleModel}</td><td>${item.plate}</td><td>${item.driver}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('');
    const total = fuelRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    printHTML('Réapprovisionnement carburant', `<h2>Réapprovisionnement carburant - ${driverFilter || 'Tous les chauffeurs'}</h2><table><thead><tr><th>Date</th><th>Modèle voiture</th><th>Plaque</th><th>Chauffeur</th><th>Montant</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Aucune donnée.</td></tr>"}</tbody></table><div class='total'>Total : ${formatCurrency(total)}</div>`);
  };
  const printFuelGlobal = () => {
    const detailRows = finance.filter((item) => item.type === 'approvisionnement').map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.vehicleModel}</td><td>${item.plate}</td><td>${item.driver}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('');
    const summaryRows = Object.entries(fuelByDriver).map(([driver, total]) => `<tr><td>${driver}</td><td>${formatCurrency(total)}</td></tr>`).join('');
    printHTML('Consommation totale véhicules', `<h2>Consommation totale de toutes les voitures</h2><h3>Détail complet</h3><table><thead><tr><th>Date</th><th>Modèle voiture</th><th>Plaque</th><th>Chauffeur</th><th>Montant</th></tr></thead><tbody>${detailRows || "<tr><td colspan='5'>Aucune donnée.</td></tr>"}</tbody></table><h3>Totaux par chauffeur</h3><table><thead><tr><th>Chauffeur</th><th>Total</th></tr></thead><tbody>${summaryRows || "<tr><td colspan='2'>Aucune donnée.</td></tr>"}</tbody></table><div class='total'>Total global : ${formatCurrency(totalFuel)}</div>`);
  };
  const printCharges = () => {
    const rows = chargeRows.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.label}</td><td>${item.category || '-'}</td><td>${item.note || '-'}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('');
    printHTML('Charges', `<h2>Charges</h2><table><thead><tr><th>Date</th><th>Charge</th><th>Catégorie</th><th>Remarque</th><th>Montant</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>Aucune charge.</td></tr>"}</tbody></table><div class='total'>Total charges : ${formatCurrency(totalCharges)}</div>`);
  };

  const cashPendingTotal = cashAssignment.pendingInvoices.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const chequePendingTotal = chequeAssignment.pendingInvoices.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="page-section finance-page">
      <section className="panel premium-panel finance-hero-panel">
        <div className="panel-header"><div><h3>Finance</h3><p>Choisis une rubrique. Une seule partie s’affiche à la fois en dessous.</p></div></div>
        <div className="stats-grid finance-sections-grid">
          {financeSections.map((section) => (
            <button
              key={section.key}
              className={`stat-card finance-section-card ${activeSection === section.key ? 'active' : ''}`}
              onClick={() => setActiveSection(section.key)}
            >
              <span>{section.label}</span>
              <strong>
                {section.key === 'ca' ? formatCurrency(totalGeneral) : section.key === 'recettes' ? formatCurrency(totalReceipts) : section.key === 'carburant' ? formatCurrency(totalFuel) : formatCurrency(totalCharges)}
              </strong>
            </button>
          ))}
        </div>
      </section>

      {activeSection === 'ca' && (
        <section className="panel premium-panel finance-module-panel">
          <div className="panel-header space-between"><div><h3>1. Chiffre d’affaires global</h3><p>Carte, espèces, chèque et virement. Les espèces et chèques gèrent aussi les dépôts bancaires ouverts et clôturés automatiquement.</p></div><strong>Total général : {formatCurrency(totalGeneral)}</strong></div>
          <div className="tabs finance-subtabs">{paymentTabs.map((mode) => <button key={mode} className={activePaymentMode === mode ? 'active' : ''} onClick={() => setActivePaymentMode(mode)}>{mode}</button>)}</div>
          <div className="stats-grid compact-stats">
            <div className="stat-card"><span>Mode affiché</span><strong>{activePaymentMode}</strong></div>
            <div className="stat-card"><span>Total du mode</span><strong>{formatCurrency(currentTabTotal)}</strong></div>
            <div className="stat-card"><span>Total sélectionné</span><strong>{formatCurrency(selectedTotal)}</strong></div>
            <div className="stat-card"><span>Total général</span><strong>{formatCurrency(totalGeneral)}</strong></div>
          </div>
          <div className="form-grid compact-grid">
            <input placeholder="Nom client / entreprise" value={caForm.payerName} onChange={(e) => setCaForm({ ...caForm, payerName: e.target.value })} />
            <input placeholder="Numéro de facture" value={caForm.invoiceNumber} onChange={(e) => setCaForm({ ...caForm, invoiceNumber: e.target.value })} />
            <input type="number" step="0.01" placeholder="Montant" value={caForm.amount} onChange={(e) => setCaForm({ ...caForm, amount: Number(e.target.value) })} />
            <input type="date" value={caForm.date} onChange={(e) => setCaForm({ ...caForm, date: e.target.value })} />
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setCaForm({ ...caForm, pdfName: e.target.files?.[0]?.name || '' })} />
            <input placeholder="Nom du PDF joint" value={caForm.pdfName} onChange={(e) => setCaForm({ ...caForm, pdfName: e.target.value })} />
          </div>
          <div className="inline-actions"><button className="primary-btn" onClick={saveCa}>{editingCaId ? 'Modifier la ligne' : `Ajouter en ${activePaymentMode}`}</button>{editingCaId && <button className="secondary-btn" onClick={resetCaForm}>Annuler</button>}</div>
          <div className="form-grid compact-grid" style={{ marginTop: 14 }}>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            <input placeholder="Année" value={reportYear} onChange={(e) => setReportYear(e.target.value)} />
          </div>
          <div className="inline-actions">
            <button className="secondary-btn" onClick={() => printCAReport('jour')}>Imprimer jour</button>
            <button className="secondary-btn" onClick={() => printCAReport('mois')}>Imprimer mois</button>
            <button className="secondary-btn" onClick={() => printCAReport('année')}>Imprimer année</button>
          </div>
          <div className="finance-table-shell"><table style={{ marginTop: 14 }}>
            <thead><tr><th></th><th>Date</th><th>Nom</th><th>N° facture</th><th>PDF</th><th>Montant</th><th>Actions</th></tr></thead>
            <tbody>
              {caRows.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} /></td><td>{formatDate(item.date)}</td><td>{item.payerName}</td><td>{item.invoiceNumber}</td><td>{item.pdfName || '-'}</td><td>{formatCurrency(item.amount)}</td><td><div className="actions-cell"><button className="secondary-btn" onClick={() => editCa(item)}>Modifier</button><button className="secondary-btn danger-text" onClick={() => deleteFinanceItem(item.id, "Chiffre d'affaires journalier")}>Supprimer</button></div></td></tr>)}
              {!caRows.length && <tr><td colSpan="7">Aucune transaction pour {activePaymentMode}.</td></tr>}
            </tbody>
          </table></div>

          {activePaymentMode === 'Espèces' && (
            <div className="grid gap-16" style={{ marginTop: 16 }}>
              <section className="box-panel soft-panel">
                <div className="panel-header space-between"><div><h4>Versements espèces</h4><p>Chaque versement reste ouvert jusqu'à ce que le total exact des factures affectées soit atteint.</p></div><strong>Factures en instance : {formatCurrency(cashPendingTotal)}</strong></div>
                <div className="form-grid compact-grid">
                  <input placeholder="N° opération" value={cashDepositForm.operationNumber} onChange={(e) => setCashDepositForm({ ...cashDepositForm, operationNumber: e.target.value })} />
                  <input type="date" value={cashDepositForm.date} onChange={(e) => setCashDepositForm({ ...cashDepositForm, date: e.target.value })} />
                  <input type="number" step="0.01" placeholder="Montant du versement" value={cashDepositForm.amount} onChange={(e) => setCashDepositForm({ ...cashDepositForm, amount: Number(e.target.value) })} />
                  <input placeholder="Remarque" value={cashDepositForm.note} onChange={(e) => setCashDepositForm({ ...cashDepositForm, note: e.target.value })} />
                </div>
                <div className="inline-actions"><button className="primary-btn" onClick={saveCashDeposit}>{editingCashDepositId ? 'Modifier le versement' : 'Enregistrer le versement'}</button>{editingCashDepositId && <button className="secondary-btn" onClick={resetCashDepositForm}>Annuler</button>}</div>
                <table style={{ marginTop: 14 }}>
                  <thead><tr><th>N° opération</th><th>Date</th><th>Montant</th><th>Affecté</th><th>Reste</th><th>Statut</th><th>Factures</th><th>Actions</th></tr></thead>
                  <tbody>
                    {cashAssignment.deposits.map((deposit) => (
                      <tr key={deposit.id} className={openedCashDepositId === deposit.id ? 'selected-row' : ''}>
                        <td>{deposit.operationNumber || '-'}</td>
                        <td>{formatDate(deposit.date)}</td>
                        <td>{formatCurrency(deposit.amount)}</td>
                        <td>{formatCurrency(deposit.matchedTotal)}</td>
                        <td>{formatCurrency(deposit.remaining)}</td>
                        <td><span className={`badge ${deposit.status === 'clôturé' ? 'success' : 'warning'}`}>{deposit.status}</span></td>
                        <td>{deposit.matchedInvoices.map((item) => item.invoiceNumber || `${formatCurrency(item.amount)}`).join(', ') || '-'}</td>
                        <td><div className="actions-cell"><button className="secondary-btn" onClick={() => setOpenedCashDepositId(deposit.id)}>Détail</button><button className="secondary-btn" onClick={() => editCashDeposit(deposit)}>Modifier</button><button className="secondary-btn" onClick={() => printDepositDetail(deposit, 'Espèces')}>Imprimer</button><button className="secondary-btn danger-text" onClick={() => deleteFinanceItem(deposit.id, 'Versement espèces')}>Supprimer</button></div></td>
                      </tr>
                    ))}
                    {!cashAssignment.deposits.length && <tr><td colSpan="8">Aucun versement espèces.</td></tr>}
                  </tbody>
                </table>
                {openedCashDeposit && (
                  <div className="box-panel" style={{ marginTop: 14 }}>
                    <h4>Détail du versement espèces</h4>
                    <div className="info-grid">
                      <div><strong>N° opération</strong><span>{openedCashDeposit.operationNumber || '-'}</span></div>
                      <div><strong>Date</strong><span>{formatDate(openedCashDeposit.date)}</span></div>
                      <div><strong>Montant</strong><span>{formatCurrency(openedCashDeposit.amount)}</span></div>
                      <div><strong>Affecté</strong><span>{formatCurrency(openedCashDeposit.matchedTotal)}</span></div>
                      <div><strong>Reste</strong><span>{formatCurrency(openedCashDeposit.remaining)}</span></div>
                      <div><strong>Statut</strong><span>{openedCashDeposit.status}</span></div>
                    </div>
                    <table><thead><tr><th>Date</th><th>Nom</th><th>N° facture</th><th>Montant</th></tr></thead><tbody>{openedCashDeposit.matchedInvoices.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.payerName}</td><td>{item.invoiceNumber}</td><td>{formatCurrency(item.amount)}</td></tr>)}{!openedCashDeposit.matchedInvoices.length && <tr><td colSpan="4">Aucune facture rattachée.</td></tr>}</tbody></table>
                  </div>
                )}
                <div className="box-panel" style={{ marginTop: 14 }}>
                  <h4>Factures espèces en instance</h4>
                  <table><thead><tr><th>Date</th><th>Nom</th><th>N° facture</th><th>Montant</th></tr></thead><tbody>{cashAssignment.pendingInvoices.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.payerName}</td><td>{item.invoiceNumber}</td><td>{formatCurrency(item.amount)}</td></tr>)}{!cashAssignment.pendingInvoices.length && <tr><td colSpan="4">Aucune facture en instance.</td></tr>}</tbody></table>
                </div>
              </section>
            </div>
          )}

          {activePaymentMode === 'Chèque' && (
            <div className="grid gap-16" style={{ marginTop: 16 }}>
              <section className="box-panel soft-panel">
                <div className="panel-header space-between"><div><h4>Remises chèques</h4><p>Chaque remise de chèques garde sa référence, sa date de dépôt et sa copie jointe.</p></div><strong>Chèques en instance : {formatCurrency(chequePendingTotal)}</strong></div>
                <div className="form-grid compact-grid">
                  <input placeholder="Référence remise" value={chequeDepositForm.reference} onChange={(e) => setChequeDepositForm({ ...chequeDepositForm, reference: e.target.value })} />
                  <input type="date" value={chequeDepositForm.date} onChange={(e) => setChequeDepositForm({ ...chequeDepositForm, date: e.target.value })} />
                  <input type="number" step="0.01" placeholder="Montant déposé" value={chequeDepositForm.amount} onChange={(e) => setChequeDepositForm({ ...chequeDepositForm, amount: Number(e.target.value) })} />
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => setChequeDepositForm({ ...chequeDepositForm, slipCopyName: e.target.files?.[0]?.name || '' })} />
                  <input placeholder="Copie / nom du bordereau" value={chequeDepositForm.slipCopyName} onChange={(e) => setChequeDepositForm({ ...chequeDepositForm, slipCopyName: e.target.value })} />
                  <input placeholder="Remarque" value={chequeDepositForm.note} onChange={(e) => setChequeDepositForm({ ...chequeDepositForm, note: e.target.value })} />
                </div>
                <div className="inline-actions"><button className="primary-btn" onClick={saveChequeDeposit}>{editingChequeDepositId ? 'Modifier la remise' : 'Enregistrer la remise'}</button>{editingChequeDepositId && <button className="secondary-btn" onClick={resetChequeDepositForm}>Annuler</button>}</div>
                <table style={{ marginTop: 14 }}>
                  <thead><tr><th>Référence</th><th>Date dépôt</th><th>Montant</th><th>Affecté</th><th>Reste</th><th>Statut</th><th>Copie</th><th>Actions</th></tr></thead>
                  <tbody>
                    {chequeAssignment.deposits.map((deposit) => (
                      <tr key={deposit.id} className={openedChequeDepositId === deposit.id ? 'selected-row' : ''}>
                        <td>{deposit.reference || '-'}</td>
                        <td>{formatDate(deposit.date)}</td>
                        <td>{formatCurrency(deposit.amount)}</td>
                        <td>{formatCurrency(deposit.matchedTotal)}</td>
                        <td>{formatCurrency(deposit.remaining)}</td>
                        <td><span className={`badge ${deposit.status === 'clôturé' ? 'success' : 'warning'}`}>{deposit.status}</span></td>
                        <td>{deposit.slipCopyName || '-'}</td>
                        <td><div className="actions-cell"><button className="secondary-btn" onClick={() => setOpenedChequeDepositId(deposit.id)}>Détail</button><button className="secondary-btn" onClick={() => editChequeDeposit(deposit)}>Modifier</button><button className="secondary-btn" onClick={() => printDepositDetail(deposit, 'Chèque')}>Imprimer</button><button className="secondary-btn danger-text" onClick={() => deleteFinanceItem(deposit.id, 'Remise chèques')}>Supprimer</button></div></td>
                      </tr>
                    ))}
                    {!chequeAssignment.deposits.length && <tr><td colSpan="8">Aucune remise de chèques.</td></tr>}
                  </tbody>
                </table>
                {openedChequeDeposit && (
                  <div className="box-panel" style={{ marginTop: 14 }}>
                    <h4>Détail de la remise chèques</h4>
                    <div className="info-grid">
                      <div><strong>Référence</strong><span>{openedChequeDeposit.reference || '-'}</span></div>
                      <div><strong>Date dépôt</strong><span>{formatDate(openedChequeDeposit.date)}</span></div>
                      <div><strong>Montant</strong><span>{formatCurrency(openedChequeDeposit.amount)}</span></div>
                      <div><strong>Affecté</strong><span>{formatCurrency(openedChequeDeposit.matchedTotal)}</span></div>
                      <div><strong>Reste</strong><span>{formatCurrency(openedChequeDeposit.remaining)}</span></div>
                      <div><strong>Statut</strong><span>{openedChequeDeposit.status}</span></div>
                      <div><strong>Copie remise</strong><span>{openedChequeDeposit.slipCopyName || '-'}</span></div>
                    </div>
                    <table><thead><tr><th>Date</th><th>Nom</th><th>N° facture</th><th>Montant</th></tr></thead><tbody>{openedChequeDeposit.matchedInvoices.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.payerName}</td><td>{item.invoiceNumber}</td><td>{formatCurrency(item.amount)}</td></tr>)}{!openedChequeDeposit.matchedInvoices.length && <tr><td colSpan="4">Aucun chèque rattaché.</td></tr>}</tbody></table>
                  </div>
                )}
                <div className="box-panel" style={{ marginTop: 14 }}>
                  <h4>Chèques en instance</h4>
                  <table><thead><tr><th>Date</th><th>Nom</th><th>N° facture</th><th>Montant</th></tr></thead><tbody>{chequeAssignment.pendingInvoices.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.payerName}</td><td>{item.invoiceNumber}</td><td>{formatCurrency(item.amount)}</td></tr>)}{!chequeAssignment.pendingInvoices.length && <tr><td colSpan="4">Aucun chèque en instance.</td></tr>}</tbody></table>
                </div>
              </section>
            </div>
          )}
        </section>
      )}

      {activeSection === 'recettes' && (
        <section className="panel premium-panel finance-module-panel">
          <div className="panel-header space-between"><div><h3>2. Recettes</h3><p>Gestion des recettes, archivage, modification, suppression et impressions par jour, mois, année ou personne.</p></div><strong>Total recettes : {formatCurrency(totalReceipts)}</strong></div>
          <div className="form-grid compact-grid">
            <input type="date" value={receiptForm.date} onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })} />
            <input type="number" step="0.01" placeholder="Montant" value={receiptForm.amount} onChange={(e) => setReceiptForm({ ...receiptForm, amount: Number(e.target.value) })} />
            <input placeholder="Nom de la personne" value={receiptForm.person} onChange={(e) => setReceiptForm({ ...receiptForm, person: e.target.value })} />
          </div>
          <div className="inline-actions"><button className="primary-btn" onClick={saveReceipt}>{editingReceiptId ? 'Modifier la recette' : 'Ajouter la recette'}</button>{editingReceiptId && <button className="secondary-btn" onClick={resetReceiptForm}>Annuler</button>}</div>
          <div className="form-grid compact-grid" style={{ marginTop: 14 }}>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            <input placeholder="Année" value={reportYear} onChange={(e) => setReportYear(e.target.value)} />
            <select className="mini-select" value={selectedPerson} onChange={(e) => setSelectedPerson(e.target.value)}><option value="">Choisir une personne</option>{Object.keys(totalsByPerson).map((person) => <option key={person} value={person}>{person}</option>)}</select>
          </div>
          <div className="inline-actions"><button className="secondary-btn" onClick={() => printReceipts('jour')}>Imprimer jour</button><button className="secondary-btn" onClick={() => printReceipts('mois')}>Imprimer mois</button><button className="secondary-btn" onClick={() => printReceipts('année')}>Imprimer année</button><button className="secondary-btn" onClick={printReceiptsByPerson}>Imprimer personne</button></div>
          <div className="finance-table-shell"><table style={{ marginTop: 14 }}>
            <thead><tr><th>Date</th><th>Personne</th><th>Montant</th><th>Actions</th></tr></thead>
            <tbody>{filteredByPerson.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.person}</td><td>{formatCurrency(item.amount)}</td><td><div className="actions-cell"><button className="secondary-btn" onClick={() => editReceipt(item)}>Modifier</button><button className="secondary-btn danger-text" onClick={() => deleteReceipt(item.id)}>Supprimer</button></div></td></tr>)}{!filteredByPerson.length && <tr><td colSpan="4">Aucune recette.</td></tr>}</tbody>
          </table></div>
        </section>
      )}

      {activeSection === 'carburant' && (
        <section className="panel premium-panel finance-module-panel">
          <div className="panel-header space-between"><div><h3>3. Réapprovisionnement carburant</h3><p>Suivi des dépenses carburant avec détail par véhicule et par chauffeur.</p></div><strong>Total carburant : {formatCurrency(totalFuel)}</strong></div>
          <div className="form-grid compact-grid">
            <input placeholder="Modèle de voiture" value={fuelForm.vehicleModel} onChange={(e) => setFuelForm({ ...fuelForm, vehicleModel: e.target.value })} />
            <input placeholder="Plaque d'immatriculation" value={fuelForm.plate} onChange={(e) => setFuelForm({ ...fuelForm, plate: e.target.value })} />
            <input placeholder="Nom du chauffeur" value={fuelForm.driver} onChange={(e) => setFuelForm({ ...fuelForm, driver: e.target.value })} />
            <input type="number" step="0.01" placeholder="Montant" value={fuelForm.amount} onChange={(e) => setFuelForm({ ...fuelForm, amount: Number(e.target.value) })} />
            <input type="date" value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} />
          </div>
          <div className="inline-actions"><button className="primary-btn" onClick={saveFuel}>{editingFuelId ? 'Modifier la ligne' : 'Ajouter la ligne'}</button>{editingFuelId && <button className="secondary-btn" onClick={resetFuelForm}>Annuler</button>}<select className="mini-select" value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}><option value="">Tous les chauffeurs</option>{drivers.map((driver) => <option key={driver} value={driver}>{driver}</option>)}</select><button className="secondary-btn" onClick={printFuelByDriver}>Imprimer chauffeur</button><button className="secondary-btn" onClick={printFuelGlobal}>Imprimer total global</button></div>
          <div className="finance-table-shell"><table style={{ marginTop: 14 }}>
            <thead><tr><th>Date</th><th>Voiture</th><th>Plaque</th><th>Chauffeur</th><th>Montant</th><th>Actions</th></tr></thead>
            <tbody>{fuelRows.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.vehicleModel}</td><td>{item.plate}</td><td>{item.driver}</td><td>{formatCurrency(item.amount)}</td><td><div className="actions-cell"><button className="secondary-btn" onClick={() => editFuel(item)}>Modifier</button><button className="secondary-btn danger-text" onClick={() => deleteFinanceItem(item.id, 'Réapprovisionnement carburant')}>Supprimer</button></div></td></tr>)}{!fuelRows.length && <tr><td colSpan="6">Aucun réapprovisionnement carburant.</td></tr>}</tbody>
          </table></div>
        </section>
      )}

      {activeSection === 'charges' && (
        <section className="panel premium-panel finance-module-panel">
          <div className="panel-header space-between"><div><h3>4. Charges</h3><p>Autres dépenses du magasin, avec catégorie, remarque et impression du total.</p></div><strong>Total charges : {formatCurrency(totalCharges)}</strong></div>
          <div className="form-grid compact-grid">
            <input type="date" value={chargeForm.date} onChange={(e) => setChargeForm({ ...chargeForm, date: e.target.value })} />
            <input placeholder="Nom de la charge" value={chargeForm.label} onChange={(e) => setChargeForm({ ...chargeForm, label: e.target.value })} />
            <input placeholder="Catégorie" value={chargeForm.category} onChange={(e) => setChargeForm({ ...chargeForm, category: e.target.value })} />
            <input type="number" step="0.01" placeholder="Montant" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: Number(e.target.value) })} />
            <input placeholder="Remarque" value={chargeForm.note} onChange={(e) => setChargeForm({ ...chargeForm, note: e.target.value })} />
          </div>
          <div className="inline-actions"><button className="primary-btn" onClick={saveCharge}>{editingChargeId ? 'Modifier la charge' : 'Ajouter la charge'}</button>{editingChargeId && <button className="secondary-btn" onClick={resetChargeForm}>Annuler</button>}<button className="secondary-btn" onClick={printCharges}>Imprimer les charges</button></div>
          <div className="finance-table-shell"><table style={{ marginTop: 14 }}>
            <thead><tr><th>Date</th><th>Charge</th><th>Catégorie</th><th>Remarque</th><th>Montant</th><th>Actions</th></tr></thead>
            <tbody>{chargeRows.map((item) => <tr key={item.id}><td>{formatDate(item.date)}</td><td>{item.label}</td><td>{item.category || '-'}</td><td>{item.note || '-'}</td><td>{formatCurrency(item.amount)}</td><td><div className="actions-cell"><button className="secondary-btn" onClick={() => editCharge(item)}>Modifier</button><button className="secondary-btn danger-text" onClick={() => deleteFinanceItem(item.id, 'Charge')}>Supprimer</button></div></td></tr>)}{!chargeRows.length && <tr><td colSpan="6">Aucune charge.</td></tr>}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}

function UsersModule({ users, setUsers, addAudit }) {
  const defaultPermissions = ['dashboard', 'stock', 'devis', 'clients'];
  const [form, setForm] = useState({ fullName: '', username: '', password: '', role: 'Salarié', permissions: defaultPermissions });
  const [editingId, setEditingId] = useState(null);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const resetForm = () => {
    setForm({ fullName: '', username: '', password: '', role: 'Salarié', permissions: defaultPermissions });
    setEditingId(null);
    setShowFormPassword(false);
  };

  const togglePermission = (permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const saveUser = () => {
    const permissions = form.role === 'Administrateur' ? modules.map((m) => m.key) : form.permissions;
    const payload = { ...form, permissions };

    if (editingId) {
      setUsers((prev) => prev.map((user) => (user.id === editingId ? { ...user, ...payload } : user)));
      addAudit('Modification', `Utilisateur ${payload.username}`);
    } else {
      const user = { id: crypto.randomUUID(), ...payload };
      setUsers((prev) => [user, ...prev]);
      addAudit('Ajout', `Utilisateur ${user.username}`);
    }

    resetForm();
  };

  const editUser = (user) => {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName,
      username: user.username,
      password: user.password,
      role: user.role,
      permissions: user.permissions || defaultPermissions,
    });
    setShowFormPassword(false);
  };

  const deleteUser = (id) => {
    const target = users.find((user) => user.id === id);
    setUsers((prev) => prev.filter((user) => user.id !== id));
    if (editingId === id) resetForm();
    addAudit('Suppression', `Utilisateur ${target?.username || id}`);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="two-cols">
      <div className="panel premium-panel">
        <div className="panel-header space-between"><h3>{editingId ? 'Modifier un compte' : 'Créer un compte'}</h3>{editingId && <button className="secondary-btn" onClick={resetForm}>Annuler</button>}</div>
        <div className="form-grid">
          <input placeholder="Nom complet" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input placeholder="Identifiant" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <div className="password-field">
            <input placeholder="Mot de passe" type={showFormPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="secondary-btn" onClick={() => setShowFormPassword((prev) => !prev)}>{showFormPassword ? 'Masquer' : 'Afficher'}</button>
          </div>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>Administrateur</option><option>Salarié</option></select>
        </div>
        {form.role === 'Salarié' && (
          <div className="permission-grid">
            {modules.map((module) => (
              <label key={module.key} className="checkbox-row"><input type="checkbox" checked={form.permissions.includes(module.key)} onChange={() => togglePermission(module.key)} />{module.label}</label>
            ))}
          </div>
        )}
        <div className="inline-actions">
          <button className="primary-btn" onClick={saveUser}>{editingId ? 'Enregistrer les modifications' : 'Créer l’utilisateur'}</button>
        </div>
      </div>
      <div className="panel premium-panel">
        <div className="panel-header"><h3>Utilisateurs existants</h3></div>
        <table>
          <thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Mot de passe</th><th>Accès</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{visiblePasswords[u.id] ? u.password : '••••••••'}</td>
                <td>{u.permissions.join(', ')}</td>
                <td>
                  <div className="inline-actions wrap-actions">
                    <button className="link-btn" onClick={() => editUser(u)}>Modifier</button>
                    <button className="link-btn" onClick={() => togglePasswordVisibility(u.id)}>{visiblePasswords[u.id] ? 'Masquer' : 'Afficher'}</button>
                    <button className="link-btn danger-text" onClick={() => deleteUser(u.id)}>Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function OrderRequestsModule({ products, requests, setRequests, globalSearch, setGlobalSearch, addAudit }) {
  const [form, setForm] = useState(emptyOrderRequest());
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [sourceFilter, setSourceFilter] = useState('Toutes');
  const [editingId, setEditingId] = useState(null);

  const ruptureRequests = useMemo(
    () =>
      (products || [])
        .filter((p) => !p.archived && Number(p.quantity) <= 0)
        .map((p) => ({
          id: `rupture-${p.id}`,
          date: today(),
          itemName: p.name,
          internalReference: p.internalReference || '',
          vehicle: '',
          quantity: Math.max(1, Number(p.minReorderQuantity || 1)),
          employee: 'Rupture stock',
          note: p.comment || 'Pièce en rupture transmise automatiquement depuis le stock',
          status: 'À commander',
          source: 'Rupture stock',
          productId: p.id,
        })),
    [products]
  );

  const mergedRequests = useMemo(() => {
    const manual = (requests || []).map((r) => ({
      ...r,
      source: r.source || 'Demande manuelle',
    }));
    const byId = new Map();
    [...manual, ...ruptureRequests].forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [requests, ruptureRequests]);

  const search = String(globalSearch || '').toLowerCase();

  const filtered = mergedRequests.filter((item) => {
    const haystack = [
      item.itemName,
      item.internalReference,
      item.vehicle,
      item.employee,
      item.note,
      item.source,
      item.status,
    ]
      .join(' ')
      .toLowerCase();

    const searchOk = search ? haystack.includes(search) : true;
    const statusOk = statusFilter === 'Tous' ? true : item.status === statusFilter;
    const sourceOk = sourceFilter === 'Toutes' ? true : item.source === sourceFilter;

    return searchOk && statusOk && sourceOk;
  });

  const save = (e) => {
    e.preventDefault();

    const payload = {
      date: form.date || today(),
      itemName: String(form.itemName || '').trim(),
      internalReference: String(form.internalReference || '').trim(),
      vehicle: String(form.vehicle || '').trim(),
      quantity: Math.max(1, Number(form.quantity || 1)),
      employee: String(form.employee || '').trim(),
      note: String(form.note || '').trim(),
      status: form.status || 'À commander',
      source: 'Demande manuelle',
    };

    if (!payload.itemName) return;

    if (editingId) {
      setRequests((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r))
      );
      addAudit('Modification', `Demande à commander ${payload.itemName}`);
    } else {
      const newRequest = {
        id: crypto.randomUUID(),
        ...payload,
      };
      setRequests((prev) => [newRequest, ...(prev || [])]);
      addAudit('Ajout', `Demande à commander ${newRequest.itemName}`);
    }

    setForm(emptyOrderRequest());
    setEditingId(null);
    setStatusFilter('Tous');
    setSourceFilter('Toutes');
    if (setGlobalSearch) setGlobalSearch('');
  };

  const edit = (item) => {
    if (item.source === 'Rupture stock') return;
    setEditingId(item.id);
    setForm({
      date: item.date || today(),
      itemName: item.itemName || '',
      internalReference: item.internalReference || '',
      vehicle: item.vehicle || '',
      quantity: Math.max(1, Number(item.quantity || 1)),
      employee: item.employee || '',
      note: item.note || '',
      status: item.status || 'À commander',
      source: 'Demande manuelle',
    });
  };

  const remove = (id, source) => {
    if (source === 'Rupture stock') return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyOrderRequest());
    }
    addAudit('Suppression', 'Demande à commander');
  };

  const changeStatus = (item, nextStatus) => {
    if (item.source === 'Rupture stock') {
      setRequests((prev) => [{
        id: crypto.randomUUID(),
        date: item.date,
        itemName: item.itemName,
        internalReference: item.internalReference,
        vehicle: item.vehicle,
        quantity: item.quantity,
        employee: item.employee,
        note: item.note,
        status: nextStatus,
        source: 'Demande manuelle',
      }, ...(prev || [])]);
      addAudit('Statut', `Rupture stock marquée ${nextStatus}`);
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: nextStatus } : r)));
    addAudit('Statut', `Demande ${item.itemName} marquée ${nextStatus}`);
  };

  const printDailyPdf = () => {
    const day = today();
    const items = mergedRequests.filter((item) => item.date === day || item.source === 'Rupture stock');
    const rows = items.map((item) => `<tr><td>${formatDate(item.date)}</td><td>${item.itemName}</td><td>${item.internalReference || '-'}</td><td>${item.quantity}</td><td>${item.source}</td><td>${item.employee || '-'}</td><td>${item.status}</td><td>${item.note || '-'}</td></tr>`).join('');
    printHTML('Stock à commander - PDF du jour', `<h1>${company.name}</h1><h2>Stock à commander du jour - ${formatDate(day)}</h2><table><thead><tr><th>Date</th><th>Pièce</th><th>Réf. interne</th><th>Qté</th><th>Origine</th><th>Demandeur</th><th>Statut</th><th>Remarque</th></tr></thead><tbody>${rows || "<tr><td colspan='8'>Aucune pièce à commander aujourd’hui.</td></tr>"}</tbody></table><div class='total'>Total lignes : ${items.length}</div>`);
  };

  const manualCount = (requests || []).length;
  const ruptureCount = ruptureRequests.length;
  const pendingCount = mergedRequests.filter((item) => item.status === 'À commander').length;

  return (
    <div className="grid gap-16">
      <section className="panel premium-panel">
        <div className="panel-header space-between">
          <div>
            <h3>Stock à commander</h3>
            <p>Demandes manuelles des collègues + ruptures automatiques reliées au stock.</p>
          </div>
          <div className="inline-actions">
            <button className="secondary-btn" onClick={printDailyPdf}>Générer le PDF du jour</button>
          </div>
        </div>
        <div className="status-cards-grid">
          <div className="status-card selected"><span>Demandes manuelles</span><strong>{manualCount}</strong></div>
          <div className="status-card danger"><span>Ruptures stock liées</span><strong>{ruptureCount}</strong></div>
          <div className="status-card warning"><span>À commander</span><strong>{pendingCount}</strong></div>
        </div>
      </section>

      <section className="two-cols stock-layout">
        <form className="panel premium-panel" onSubmit={save}>
          <div className="panel-header"><h3>{editingId ? 'Modifier une demande' : 'Nouvelle demande à commander'}</h3></div>
          <div className="form-grid">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input placeholder="Nom de la pièce" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required />
            <input placeholder="Référence interne" value={form.internalReference} onChange={(e) => setForm({ ...form, internalReference: e.target.value })} />
            <input placeholder="Véhicule / modèle" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
            <input type="number" min="1" placeholder="Quantité demandée" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            <input placeholder="Nom du salarié" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>À commander</option><option>Commandé</option><option>Reçu</option><option>Annulé</option>
            </select>
            <textarea placeholder="Remarque" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="inline-actions">
            <button className="primary-btn" type="submit">{editingId ? 'Enregistrer' : 'Ajouter'}</button>
            <button type="button" className="secondary-btn" onClick={() => { setEditingId(null); setForm(emptyOrderRequest()); }}>Réinitialiser</button>
          </div>
        </form>

        <section className="panel premium-panel">
          <div className="panel-header space-between"><h3>Liste à commander</h3><div className="inline-actions"><select value={sourceFilter} onChange={(e)=>setSourceFilter(e.target.value)}><option>Toutes</option><option>Demande manuelle</option><option>Rupture stock</option></select><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option>Tous</option><option>À commander</option><option>Commandé</option><option>Reçu</option><option>Annulé</option></select></div></div>
          <table>
            <thead><tr><th>Date</th><th>Pièce</th><th>Réf. interne</th><th>Qté</th><th>Origine</th><th>Demandeur</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.date)}</td>
                  <td><strong>{item.itemName}</strong><div className="muted-line">{item.vehicle || item.note || '-'}</div></td>
                  <td>{item.internalReference || '-'}</td>
                  <td>{item.quantity}</td>
                  <td><span className={`badge ${item.source === 'Rupture stock' ? 'rupture' : 'normal'}`}>{item.source}</span></td>
                  <td>{item.employee || '-'}</td>
                  <td><span className="badge warning">{item.status}</span></td>
                  <td>
                    <div className="inline-actions wrap-actions">
                      <button className="link-btn" onClick={() => changeStatus(item, 'Commandé')}>Commandé</button>
                      <button className="link-btn success-text" onClick={() => changeStatus(item, 'Reçu')}>Reçu</button>
                      {item.source !== 'Rupture stock' && <button className="link-btn" onClick={() => edit(item)}>Modifier</button>}
                      {item.source !== 'Rupture stock' && <button className="link-btn danger-text" onClick={() => remove(item.id, item.source)}>Supprimer</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="8">Aucune demande.</td></tr>}
            </tbody>
          </table>
          <div className="hint">Les pièces en rupture dans le module stock remontent automatiquement ici. Le bouton « Générer le PDF du jour » imprime la liste journalière avec les références internes.</div>
        </section>
      </section>
    </div>
  );
}

function emptyOrderRequest() {
  return { date: today(), itemName: '', internalReference: '', vehicle: '', quantity: 1, employee: '', note: '', status: 'À commander', source: 'Demande manuelle' };
}

function emptyProduct(family = '') {
  return { name: '', family, subfamily: '', originalReference: '', internalReference: '', supplierId: '', quantity: 0, privatePrice: 0, proPrice: 0, comment: '' };
}

function emptyQuote() {
  return { date: today(), clientName: '', clientAddress: '', vehicleBrand: '', plate: '', validity: '30 jours', customerType: 'particulier', lines: [] };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default App;
