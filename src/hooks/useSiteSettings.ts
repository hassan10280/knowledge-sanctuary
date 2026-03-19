import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { error } = await supabase
        .from("site_settings")
        .upsert({ section, key, value, updated_at: new Date().toISOString() }, { onConflict: "section,key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings"] }),
  });
}
