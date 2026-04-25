import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

export async function ensureAppStateRow() {
  await supabase
    .from("app_state")
    .upsert(
      {
        id: "global",
        payload: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
}

export async function loadAppState() {
  await ensureAppStateRow();

  const { data, error } = await supabase
    .from("app_state")
    .select("payload")
    .eq("id","global")
    .single();

  if (error) {
    console.error(error);
    return {};
  }

  return data?.payload || {};
}

export async function saveAppState(payload) {
  const { error } = await supabase
    .from("app_state")
    .upsert({
      id:"global",
      payload,
      updated_at:new Date().toISOString()
    });

  if (error) {
    console.error(error);
  }
}