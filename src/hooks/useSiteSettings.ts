import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SettingValue = unknown;
type SettingEntry = { section: string; key: string; value: SettingValue };

const buildSettingRows = (entries: SettingEntry[]) =>
  entries.map(({ section, key, value }) => ({
    section,
    key,
    value: value as never,
    updated_at: new Date().toISOString(),
  }));

async function upsertSettings(entries: SettingEntry[]) {
  const { error } = await supabase
    .from("site_settings")
    .upsert(buildSettingRows(entries), { onConflict: "section,key" });

  if (error) throw error;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings"] }),
  });
}

export function useUpdateSettingsBatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ section, entries }: { section: string; entries: Array<{ key: string; value: SettingValue }> }) => {
      await upsertSettings(entries.map((entry) => ({ ...entry, section })));
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["site_settings"] }),
        qc.invalidateQueries({ queryKey: ["site_settings", variables.section] }),
      ]);
    },
  });
}
