import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SettingValue = unknown;
type SettingEntry = { section: string; key: string; value: SettingValue };
type SiteSettingRow = Tables<"site_settings">;

const buildSettingRows = (entries: SettingEntry[]) =>
  entries.map(({ section, key, value }) => ({
    section,
    key,
    value: value as never,
    updated_at: new Date().toISOString(),
  }));

async function upsertSettings(entries: SettingEntry[]) {
  // Verify user is authenticated before attempting write
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in as admin to save settings.");

  const rows = buildSettingRows(entries);

  // Use individual upserts to avoid batch timeout issues
  for (const row of rows) {
    const { error } = await supabase
      .from("site_settings")
      .upsert(row, { onConflict: "section,key" });

    if (error) throw new Error(`Failed to save "${row.key}": ${error.message}`);
  }
}

function mergeSettings(existing: SiteSettingRow[] | undefined, entries: SettingEntry[]): SiteSettingRow[] {
  const merged = [...(existing ?? [])];

  entries.forEach(({ section, key, value }) => {
    const index = merged.findIndex((row) => row.section === section && row.key === key);
    const nextRow: SiteSettingRow = {
      id: index >= 0 ? merged[index].id : crypto.randomUUID(),
      section,
      key,
      value: value as SiteSettingRow["value"],
      updated_at: new Date().toISOString(),
      updated_by: index >= 0 ? merged[index].updated_by : null,
    };

    if (index >= 0) {
      merged[index] = { ...merged[index], ...nextRow };
    } else {
      merged.push(nextRow);
    }
  });

  return merged;
}

export function useSiteSettings(section?: string) {
  return useQuery({
    queryKey: ["site_settings", section],
    queryFn: async () => {
      let query = supabase.from("site_settings").select("*");
      if (section) query = query.eq("section", section);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: section ? 15_000 : 5_000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useSetting(section: string, key: string) {
  const { data } = useSiteSettings(section);
  const setting = data?.find((s) => s.key === key);
  return setting?.value;
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, key, value }: { section: string; key: string; value: any }) => {
      await upsertSettings([{ section, key, value }]);
    },
    onMutate: ({ section, key, value }) => {
      const entries = [{ section, key, value }];
      qc.setQueryData<SiteSettingRow[]>(["site_settings"], (current) => mergeSettings(current, entries));
      qc.setQueryData<SiteSettingRow[]>(["site_settings", section], (current) => mergeSettings(current, entries));
    },
    onSettled: (_data, _error, variables) => {
      void qc.invalidateQueries({ queryKey: ["site_settings"] });
      void qc.invalidateQueries({ queryKey: ["site_settings", variables.section] });
    },
  });
}

export function useUpdateSettingsBatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, entries }: { section: string; entries: Array<{ key: string; value: SettingValue }> }) => {
      await upsertSettings(entries.map((entry) => ({ ...entry, section })));
    },
    onMutate: ({ section, entries }) => {
      const nextEntries = entries.map((entry) => ({ ...entry, section }));
      qc.setQueryData<SiteSettingRow[]>(["site_settings"], (current) => mergeSettings(current, nextEntries));
      qc.setQueryData<SiteSettingRow[]>(["site_settings", section], (current) => mergeSettings(current, nextEntries));
    },
    onSettled: (_data, _error, variables) => {
      void qc.invalidateQueries({ queryKey: ["site_settings"] });
      void qc.invalidateQueries({ queryKey: ["site_settings", variables.section] });
    },
  });
}
