import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRetailDiscounts() {
  return useQuery({
    queryKey: ["retail-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retail_discounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertRetailDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (discount: any) => {
      const { error } = await supabase.from("retail_discounts").upsert(discount);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retail-discounts"] }),
  });
}

export function useDeleteRetailDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("retail_discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retail-discounts"] }),
  });
}
