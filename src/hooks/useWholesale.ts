import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWholesaleFormFields() {
  return useQuery({
    queryKey: ["wholesale-form-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_form_fields")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (field: any) => {
      const { error } = await supabase.from("wholesale_form_fields").upsert(field);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wholesale-form-fields"] }),
  });
}

export function useDeleteFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wholesale_form_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wholesale-form-fields"] }),
  });
}

export function useWholesaleApplications() {
  return useQuery({
    queryKey: ["wholesale-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitWholesaleApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (application: { user_id: string; form_data: Record<string, any> }) => {
      const { error } = await supabase.from("wholesale_applications").insert(application);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wholesale-applications"] }),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, admin_notes, reviewed_by }: { id: string; status: string; admin_notes?: string; reviewed_by?: string }) => {
      const { error } = await supabase
        .from("wholesale_applications")
        .update({ status, admin_notes, reviewed_by, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wholesale-applications"] }),
  });
}

export function useWholesaleDiscounts() {
  return useQuery({
    queryKey: ["wholesale-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_discounts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (discount: any) => {
      const { error } = await supabase.from("wholesale_discounts").upsert(discount);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wholesale-discounts"] }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wholesale_discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wholesale-discounts"] }),
  });
}

export function useUserRole() {
  return useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "retail";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (data?.some(r => r.role === "admin")) return "admin";
      if (data?.some(r => r.role === "wholesale")) return "wholesale";
      return "retail";
    },
  });
}
