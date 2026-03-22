import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StackingRule {
  id: string;
  rule_key: string;
  allowed: boolean;
  description: string;
  updated_at: string;
}

export function useStackingRules() {
  return useQuery({
    queryKey: ["stacking-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_stacking_rules" as any)
        .select("*")
        .order("rule_key");
      if (error) throw error;
      return data as StackingRule[];
    },
  });
}

export function useUpdateStackingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, allowed }: { id: string; allowed: boolean }) => {
      const { error } = await supabase
        .from("discount_stacking_rules" as any)
        .update({ allowed, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stacking-rules"] }),
  });
}

/** Helper: check if a specific stacking rule is allowed */
export function isStackingAllowed(rules: StackingRule[] | undefined, ruleKey: string): boolean {
  if (!rules) return false;
  const rule = rules.find((r) => r.rule_key === ruleKey);
  return rule?.allowed ?? false;
}
