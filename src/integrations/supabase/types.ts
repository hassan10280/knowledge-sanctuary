export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      billing_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          county: string | null
          created_at: string
          full_name: string
          id: string
          is_default: boolean | null
          phone: string | null
          postcode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          county?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postcode: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          county?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postcode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      book_ratings: {
        Row: {
          book_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_ratings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          category: string
          cover_color: string | null
          cover_image: string | null
          cover_pattern: string | null
          created_at: string
          description: string | null
          discount_percent: number | null
          id: string
          in_stock: boolean | null
          original_price: number | null
          price: number | null
          publisher: string | null
          rating: number | null
          sample_url: string | null
          show_ratings: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          category: string
          cover_color?: string | null
          cover_image?: string | null
          cover_pattern?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          in_stock?: boolean | null
          original_price?: number | null
          price?: number | null
          publisher?: string | null
          rating?: number | null
          sample_url?: string | null
          show_ratings?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          cover_color?: string | null
          cover_image?: string | null
          cover_pattern?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          in_stock?: boolean | null
          original_price?: number | null
          price?: number | null
          publisher?: string | null
          rating?: number | null
          sample_url?: string | null
          show_ratings?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          name_bn: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_bn?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_bn?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          updated_at: string
          usage_limit: number | null
          used_count: number
          wholesale_only: boolean
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          wholesale_only?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          wholesale_only?: boolean
        }
        Relationships: []
      }
      free_shipping_rules: {
        Row: {
          always_free: boolean
          created_at: string
          id: string
          is_active: boolean
          is_wholesale: boolean
          min_order_amount: number
          name: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          always_free?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          is_wholesale?: boolean
          min_order_amount?: number
          name?: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          always_free?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          is_wholesale?: boolean
          min_order_amount?: number
          name?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "free_shipping_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          book_id: string
          created_at: string
          id: string
          order_id: string
          price: number
          quantity: number
          title: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          order_id: string
          price: number
          quantity?: number
          title: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          quantity?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_name: string | null
          billing_postcode: string | null
          coupon_discount: number | null
          coupon_id: string | null
          created_at: string
          discount_amount: number | null
          id: string
          payment_method: string
          shipping_cost: number | null
          shipping_override: number | null
          status: string
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_name?: string | null
          billing_postcode?: string | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          payment_method?: string
          shipping_cost?: number | null
          shipping_override?: number | null
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_name?: string | null
          billing_postcode?: string | null
          coupon_discount?: number | null
          coupon_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          payment_method?: string
          shipping_cost?: number | null
          shipping_override?: number | null
          status?: string
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      retail_discounts: {
        Row: {
          book_id: string | null
          created_at: string
          discount_percent: number
          discount_type: string
          end_date: string | null
          id: string
          is_active: boolean
          reference_value: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          discount_percent?: number
          discount_type?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          reference_value: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          discount_percent?: number
          discount_type?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          reference_value?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_methods: {
        Row: {
          created_at: string
          description: string | null
          estimated_delivery_days: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_delivery_days?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_delivery_days?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          created_at: string
          flat_rate: number | null
          id: string
          is_active: boolean
          is_wholesale: boolean
          method_id: string
          price_ranges: Json | null
          rate_type: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          flat_rate?: number | null
          id?: string
          is_active?: boolean
          is_wholesale?: boolean
          method_id: string
          price_ranges?: Json | null
          rate_type?: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          created_at?: string
          flat_rate?: number | null
          id?: string
          is_active?: boolean
          is_wholesale?: boolean
          method_id?: string
          price_ranges?: Json | null
          rate_type?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_wholesale: boolean
          min_amount: number
          rule_name: string
          shipping_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_wholesale?: boolean
          min_amount?: number
          rule_name?: string
          shipping_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_wholesale?: boolean
          min_amount?: number
          rule_name?: string
          shipping_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          locations: string[]
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          locations?: string[]
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          locations?: string[]
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          section: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          section: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          section?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wholesale_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          form_data: Json
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wholesale_discounts: {
        Row: {
          book_id: string | null
          created_at: string
          discount_percent: number
          discount_type: string
          fixed_price: number | null
          id: string
          reference_value: string
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          discount_percent?: number
          discount_type?: string
          fixed_price?: number | null
          id?: string
          reference_value: string
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          discount_percent?: number
          discount_type?: string
          fixed_price?: number | null
          id?: string
          reference_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_discounts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_form_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          label: string
          options: Json | null
          placeholder: string | null
          required: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          label: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          label?: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      wholesale_quantity_tiers: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          max_qty: number | null
          min_qty: number
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          max_qty?: number | null
          min_qty: number
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          max_qty?: number | null
          min_qty?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "wholesale"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "wholesale"],
    },
  },
} as const
