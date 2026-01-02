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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_key_status: {
        Row: {
          created_at: string
          error_details: string | null
          id: string
          key_index: number
          key_name: string
          last_checked_at: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_details?: string | null
          id?: string
          key_index: number
          key_name: string
          last_checked_at?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_details?: string | null
          id?: string
          key_index?: number
          key_name?: string
          last_checked_at?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          fraud_flags: Json | null
          id: string
          last_searches_reset: string | null
          name: string | null
          plan: string
          searches_limit: number
          searches_used: number
          signup_ip: string | null
          trial_messages_sent: number | null
          trial_start_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          fraud_flags?: Json | null
          id: string
          last_searches_reset?: string | null
          name?: string | null
          plan?: string
          searches_limit?: number
          searches_used?: number
          signup_ip?: string | null
          trial_messages_sent?: number | null
          trial_start_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          fraud_flags?: Json | null
          id?: string
          last_searches_reset?: string | null
          name?: string | null
          plan?: string
          searches_limit?: number
          searches_used?: number
          signup_ip?: string | null
          trial_messages_sent?: number | null
          trial_start_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          keyword: string
          leads: Json | null
          location: string
          results_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          leads?: Json | null
          location: string
          results_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          leads?: Json | null
          location?: string
          results_count?: number
          user_id?: string
        }
        Relationships: []
      }
      shared_reports: {
        Row: {
          created_at: string
          expires_at: string
          filter_type: string
          id: string
          password_hash: string
          report_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          filter_type?: string
          id?: string
          password_hash: string
          report_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          filter_type?: string
          id?: string
          password_hash?: string
          report_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      trial_feedback: {
        Row: {
          created_at: string
          experience_status: string
          id: string
          missing_features: string | null
          not_continue_reason: string | null
          nps_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_status: string
          id?: string
          missing_features?: string | null
          not_continue_reason?: string | null
          nps_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          experience_status?: string
          id?: string
          missing_features?: string | null
          not_continue_reason?: string | null
          nps_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          created_at: string
          id: string
          main_objective: string
          previous_experience: string | null
          previous_tool: string | null
          service_types: string[]
          skipped: boolean
          team_size: string
          user_id: string
          user_profile: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_objective: string
          previous_experience?: string | null
          previous_tool?: string | null
          service_types: string[]
          skipped?: boolean
          team_size: string
          user_id: string
          user_profile: string
        }
        Update: {
          created_at?: string
          id?: string
          main_objective?: string
          previous_experience?: string | null
          previous_tool?: string | null
          service_types?: string[]
          skipped?: boolean
          team_size?: string
          user_id?: string
          user_profile?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          delay_seconds: number
          enable_smart_pause: boolean
          failed_count: number
          id: string
          leads: Json
          messages: Json
          name: string
          pause_after_contacts: number | null
          pause_minutes: number | null
          pause_reason: string | null
          paused_at_limit: boolean | null
          resume_at: string | null
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          total_leads: number
          updated_at: string
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          delay_seconds?: number
          enable_smart_pause?: boolean
          failed_count?: number
          id?: string
          leads?: Json
          messages?: Json
          name: string
          pause_after_contacts?: number | null
          pause_minutes?: number | null
          pause_reason?: string | null
          paused_at_limit?: boolean | null
          resume_at?: string | null
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_leads?: number
          updated_at?: string
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          delay_seconds?: number
          enable_smart_pause?: boolean
          failed_count?: number
          id?: string
          leads?: Json
          messages?: Json
          name?: string
          pause_after_contacts?: number | null
          pause_minutes?: number | null
          pause_reason?: string | null
          paused_at_limit?: boolean | null
          resume_at?: string | null
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_leads?: number
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          created_at: string
          daily_sent_count: number
          id: string
          instance_name: string | null
          is_connected: boolean
          last_sent_at: string | null
          name: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_sent_count?: number
          id?: string
          instance_name?: string | null
          is_connected?: boolean
          last_sent_at?: string | null
          name: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_sent_count?: number
          id?: string
          instance_name?: string | null
          is_connected?: boolean
          last_sent_at?: string | null
          name?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_reset_monthly_searches: {
        Args: { user_id: string }
        Returns: Json
      }
      check_signup_fraud: {
        Args: { p_fingerprint: string; p_ip: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
