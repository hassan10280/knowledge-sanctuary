import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBundleDiscounts() {
  return useQuery({
    queryKey: ["bundle-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_discounts" as any)
        .select("*, bundle_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertBundleDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bundle, bookIds }: { bundle: any; bookIds: string[] }) => {
      // Upsert bundle
      const { data, error } = await supabase
        .from("bundle_discounts" as any)
        .upsert(bundle)
        .select()
        .single();
      if (error) throw error;
      const bundleId = (data as any).id;

      // Delete old items and insert new
      await supabase.from("bundle_items" as any).delete().eq("bundle_id", bundleId);
      if (bookIds.length > 0) {
        const items = bookIds.map((book_id) => ({ bundle_id: bundleId, book_id }));
        const { error: itemErr } = await supabase.from("bundle_items" as any).insert(items);
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundle-discounts"] }),
  });
}

export function useDeleteBundleDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bundle_discounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundle-discounts"] }),
  });
}
