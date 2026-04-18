const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);

function buildHeaders(prefer = '') {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  if (prefer) headers.Prefer = prefer;
  return headers;
}

function createMissingEnvError() {
  return new Error(
    'Supabase non configuré : ajoute VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans ton environnement.'
  );
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, options = {}) {
  if (!hasSupabaseEnv) {
    throw createMissingEnvError();
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(options.prefer || ''),
      ...(options.headers || {}),
    },
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || payload?.hint || response.statusText;

    throw new Error(message || 'Erreur Supabase inconnue.');
  }

  return payload;
}

function createEmptyPayload() {
  return {
    values: {},
    meta: {},
  };
}

export async function ensureAppStateRow() {
  if (!hasSupabaseEnv) return null;

  const row = {
    id: 'global',
    payload: createEmptyPayload(),
    updated_at: new Date().toISOString(),
  };

  try {
    await request('/rest/v1/app_state?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([row]),
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
    return true;
  } catch (error) {
    throw new Error(`Impossible de préparer la table app_state : ${error.message}`);
  }
}

export async function fetchAppState() {
  if (!hasSupabaseEnv) return null;

  const rows = await request('/rest/v1/app_state?id=eq.global&select=id,payload,updated_at');
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function saveAppState(payload) {
  if (!hasSupabaseEnv) return null;

  const row = {
    id: 'global',
    payload,
    updated_at: new Date().toISOString(),
  };

  const rows = await request('/rest/v1/app_state?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify([row]),
    prefer: 'resolution=merge-duplicates,return=representation',
  });

  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export function normalizeAppStatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return createEmptyPayload();
  }

  if (payload.values && payload.meta) {
    return {
      values: payload.values && typeof payload.values === 'object' ? payload.values : {},
      meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : {},
    };
  }

  return {
    values: payload,
    meta: {},
  };
}
