import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePublishers() {
  return useQuery({
    queryKey: ["publishers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publishers")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertPublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (publisher: any) => {
      const { error } = await supabase.from("publishers").upsert(publisher);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publishers"] }),
  });
}

export function useDeletePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("publishers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publishers"] }),
  });
}
