import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBookRatings(bookId: string | undefined) {
  return useQuery({
    queryKey: ["book-ratings", bookId],
    enabled: !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_ratings")
        .select("*")
        .eq("book_id", bookId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useUserRating(bookId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["user-rating", bookId, userId],
    enabled: !!bookId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_ratings")
        .select("*")
        .eq("book_id", bookId!)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useHasPurchased(bookId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["has-purchased", bookId, userId],
    enabled: !!bookId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, order_id, orders!inner(user_id, status)")
        .eq("book_id", bookId!)
        .eq("orders.user_id", userId!)
        .eq("orders.status", "confirmed")
        .limit(1);
      if (error) return false;
      return (data?.length || 0) > 0;
    },
  });
}

export function useSubmitRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, userId, rating }: { bookId: string; userId: string; rating: number }) => {
      const { error } = await supabase
        .from("book_ratings")
        .upsert({ book_id: bookId, user_id: userId, rating }, { onConflict: "book_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["book-ratings", vars.bookId] });
      qc.invalidateQueries({ queryKey: ["user-rating", vars.bookId, vars.userId] });
    },
  });
}
