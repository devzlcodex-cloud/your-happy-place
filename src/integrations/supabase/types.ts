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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      booking_details: {
        Row: {
          accessibility: string
          aircraft: string | null
          booking_id: string
          note: string | null
        }
        Insert: {
          accessibility?: string
          aircraft?: string | null
          booking_id: string
          note?: string | null
        }
        Update: {
          accessibility?: string
          aircraft?: string | null
          booking_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          actor_id: string | null
          actor_name: string
          booking_id: string | null
          created_at: string
          id: string
          kind: string
          message: string
          scope: string
        }
        Insert: {
          actor_id?: string | null
          actor_name: string
          booking_id?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
          scope?: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_evidence: {
        Row: {
          author_id: string | null
          author_name: string
          booking_id: string
          caption: string | null
          created_at: string
          id: string
          storage_path: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          booking_id: string
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          booking_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_evidence_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_flights: {
        Row: {
          airline: string | null
          booking_id: string
          eta: string | null
          flight_number: string | null
          flight_status: string
          gate: string | null
          terminal: string | null
          updated_at: string
          updated_by_name: string | null
        }
        Insert: {
          airline?: string | null
          booking_id: string
          eta?: string | null
          flight_number?: string | null
          flight_status?: string
          gate?: string | null
          terminal?: string | null
          updated_at?: string
          updated_by_name?: string | null
        }
        Update: {
          airline?: string | null
          booking_id?: string
          eta?: string | null
          flight_number?: string | null
          flight_status?: string
          gate?: string | null
          terminal?: string | null
          updated_at?: string
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_flights_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_observations: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          booking_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          body: string
          booking_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_observations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          id: string
          price_cents: number
          service_id: string
          service_name: string
        }
        Insert: {
          booking_id: string
          id?: string
          price_cents: number
          service_id: string
          service_name: string
        }
        Update: {
          booking_id?: string
          id?: string
          price_cents?: number
          service_id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_sessions: {
        Row: {
          booking_id: string
          check_in_at: string | null
          check_in_by: string | null
          check_out_at: string | null
          check_out_by: string | null
          collaborator_name: string
          id: string
          is_lead: boolean
          team_member_id: string
        }
        Insert: {
          booking_id: string
          check_in_at?: string | null
          check_in_by?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          collaborator_name: string
          id?: string
          is_lead?: boolean
          team_member_id: string
        }
        Update: {
          booking_id?: string
          check_in_at?: string | null
          check_in_by?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          collaborator_name?: string
          id?: string
          is_lead?: boolean
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_sessions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          base: Database["public"]["Enums"]["base_code"]
          client_id: string
          client_name: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_date: string
          scheduled_time: string
          service_summary: string
        }
        Insert: {
          base: Database["public"]["Enums"]["base_code"]
          client_id: string
          client_name: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_date: string
          scheduled_time: string
          service_summary: string
        }
        Update: {
          base?: Database["public"]["Enums"]["base_code"]
          client_id?: string
          client_name?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          service_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          contact_name: string | null
          email: string | null
          phone: string | null
        }
        Insert: {
          client_id: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
        }
        Update: {
          client_id?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          initials: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          initials: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          initials?: string
          name?: string
        }
        Relationships: []
      }
      financial_adjustments: {
        Row: {
          amount_cents: number
          author_id: string | null
          author_name: string
          collaborator_name: string
          created_at: string
          id: string
          reason: string
          team_member_id: string
        }
        Insert: {
          amount_cents: number
          author_id?: string | null
          author_name: string
          collaborator_name: string
          created_at?: string
          id?: string
          reason: string
          team_member_id: string
        }
        Update: {
          amount_cents?: number
          author_id?: string | null
          author_name?: string
          collaborator_name?: string
          created_at?: string
          id?: string
          reason?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          booking_code: string
          booking_id: string
          collaborator_name: string
          created_at: string
          id: string
          paid_at: string | null
          paid_by: string | null
          paid_by_name: string | null
          payment_method: string | null
          payment_reference: string | null
          service_date: string
          session_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          team_member_id: string
        }
        Insert: {
          amount_cents: number
          booking_code: string
          booking_id: string
          collaborator_name: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          service_date: string
          session_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          team_member_id: string
        }
        Update: {
          amount_cents?: number
          booking_code?: string
          booking_id?: string
          collaborator_name?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          service_date?: string
          session_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "booking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount_cents: number
          booking_code: string
          booking_id: string
          client_name: string
          created_at: string
          id: string
          paid_at: string | null
          paid_by: string | null
          paid_by_name: string | null
          payment_method: string | null
          payment_reference: string | null
          service_date: string
          status: Database["public"]["Enums"]["settlement_status"]
        }
        Insert: {
          amount_cents: number
          booking_code: string
          booking_id: string
          client_name: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          service_date: string
          status?: Database["public"]["Enums"]["settlement_status"]
        }
        Update: {
          amount_cents?: number
          booking_code?: string
          booking_id?: string
          client_name?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_by_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          service_date?: string
          status?: Database["public"]["Enums"]["settlement_status"]
        }
        Relationships: [
          {
            foreignKeyName: "receivables_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit: {
        Row: {
          actor_id: string | null
          actor_label: string
          created_at: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"] | null
          previous_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_label: string
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          price_cents: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price_cents: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          access_role: Database["public"]["Enums"]["app_role"] | null
          access_status: string
          accessible_support: boolean
          active: boolean
          auth_user_id: string | null
          base: Database["public"]["Enums"]["base_code"]
          created_at: string
          created_by: string | null
          id: string
          initials: string
          job_title: string
          languages: string[]
          login_email: string | null
          name: string
        }
        Insert: {
          access_role?: Database["public"]["Enums"]["app_role"] | null
          access_status?: string
          accessible_support?: boolean
          active?: boolean
          auth_user_id?: string | null
          base: Database["public"]["Enums"]["base_code"]
          created_at?: string
          created_by?: string | null
          id?: string
          initials: string
          job_title?: string
          languages?: string[]
          login_email?: string | null
          name: string
        }
        Update: {
          access_role?: Database["public"]["Enums"]["app_role"] | null
          access_status?: string
          accessible_support?: boolean
          active?: boolean
          auth_user_id?: string | null
          base?: Database["public"]["Enums"]["base_code"]
          created_at?: string
          created_by?: string | null
          id?: string
          initials?: string
          job_title?: string
          languages?: string[]
          login_email?: string | null
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actor_label: { Args: never; Returns: string }
      add_adjustment: {
        Args: {
          _amount_cents: number
          _reason: string
          _team_member_id: string
        }
        Returns: undefined
      }
      add_evidence: {
        Args: { _booking_id: string; _caption?: string; _path: string }
        Returns: undefined
      }
      add_observation: {
        Args: { _body: string; _booking_id: string }
        Returns: undefined
      }
      change_member_role: {
        Args: {
          _member_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      check_in: { Args: { _session_id: string }; Returns: undefined }
      check_out: { Args: { _session_id: string }; Returns: undefined }
      create_booking: {
        Args: {
          _accessibility?: string
          _aircraft?: string
          _base: Database["public"]["Enums"]["base_code"]
          _client_id: string
          _date: string
          _lead_id: string
          _note?: string
          _service_ids: string[]
          _support_id?: string
          _time: string
        }
        Returns: string
      }
      create_client: {
        Args: {
          _category: string
          _contact_name?: string
          _email?: string
          _name: string
          _phone?: string
        }
        Returns: string
      }
      create_team_member: {
        Args: {
          _accessible: boolean
          _base: Database["public"]["Enums"]["base_code"]
          _job_title: string
          _languages: string[]
          _name: string
        }
        Returns: string
      }
      delete_adjustment: { Args: { _id: string }; Returns: undefined }
      delete_booking: { Args: { _id: string }; Returns: undefined }
      delete_client: { Args: { _id: string }; Returns: undefined }
      delete_service: { Args: { _id: string }; Returns: undefined }
      delete_team_member: { Args: { _id: string }; Returns: undefined }
      gestor_check_in: {
        Args: { _at?: string; _session_id: string }
        Returns: undefined
      }
      gestor_check_out: {
        Args: { _at?: string; _session_id: string }
        Returns: undefined
      }
      gestor_undo_check_in: {
        Args: { _session_id: string }
        Returns: undefined
      }
      get_my_profile: {
        Args: never
        Returns: {
          base: Database["public"]["Enums"]["base_code"]
          display_name: string
          role: Database["public"]["Enums"]["app_role"]
          team_member_id: string
          user_id: string
        }[]
      }
      grant_member_access: {
        Args: {
          _auth_user_id: string
          _email: string
          _member_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      mark_payout_paid: { Args: { _id: string }; Returns: undefined }
      mark_receivable_paid: { Args: { _id: string }; Returns: undefined }
      my_month_summary: {
        Args: { _month: string }
        Returns: {
          completed_cents: number
          completed_count: number
          projected_cents: number
          upcoming_count: number
        }[]
      }
      reopen_payout: { Args: { _id: string }; Returns: undefined }
      reopen_receivable: { Args: { _id: string }; Returns: undefined }
      set_flight_info: {
        Args: {
          _airline: string
          _booking_id: string
          _eta?: string
          _flight: string
          _gate: string
          _status: string
          _terminal: string
        }
        Returns: undefined
      }
      set_member_active: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      settle_payout: {
        Args: { _id: string; _method: string; _reference?: string }
        Returns: undefined
      }
      settle_receivable: {
        Args: { _id: string; _method: string; _reference?: string }
        Returns: undefined
      }
      update_adjustment: {
        Args: { _amount_cents: number; _id: string; _reason: string }
        Returns: undefined
      }
      update_booking: {
        Args: {
          _accessibility?: string
          _aircraft?: string
          _base: Database["public"]["Enums"]["base_code"]
          _date: string
          _id: string
          _lead_id: string
          _note?: string
          _service_ids: string[]
          _support_id?: string
          _time: string
        }
        Returns: undefined
      }
      update_client: {
        Args: {
          _category: string
          _contact_name?: string
          _email?: string
          _id: string
          _name: string
          _phone?: string
        }
        Returns: undefined
      }
      update_service: {
        Args: {
          _active: boolean
          _id: string
          _name: string
          _price_cents: number
        }
        Returns: undefined
      }
      update_team_member: {
        Args: {
          _accessible: boolean
          _base: Database["public"]["Enums"]["base_code"]
          _id: string
          _job_title: string
          _languages: string[]
          _name: string
        }
        Returns: undefined
      }
      upsert_service: {
        Args: { _active?: boolean; _name: string; _price_cents: number }
        Returns: string
      }
    }
    Enums: {
      app_role: "gestor" | "financeiro" | "campo"
      base_code: "GRU" | "VCP"
      settlement_status: "pending" | "paid"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["gestor", "financeiro", "campo"],
      base_code: ["GRU", "VCP"],
      settlement_status: ["pending", "paid"],
    },
  },
} as const
