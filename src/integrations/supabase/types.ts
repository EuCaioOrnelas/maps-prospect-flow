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
      agent_conversations: {
        Row: {
          agent_id: string
          agent_manually_paused: boolean | null
          agent_paused_until: string | null
          antiloop_sent_at: string | null
          bot_confidence_score: number | null
          bot_detection_reason: string | null
          bot_detection_state: string
          created_at: string
          id: string
          initial_message_content: string | null
          initial_message_sent_at: string | null
          is_processing: boolean | null
          lead_name: string | null
          lead_phone: string
          process_after: string | null
          reply_content: string | null
          reply_count: number | null
          reply_sent: boolean
          reply_sent_at: string | null
          response_content: string | null
          response_received: boolean
          response_received_at: string | null
          status: string
          updated_at: string
          user_responded_at: string | null
          user_responded_date: string | null
        }
        Insert: {
          agent_id: string
          agent_manually_paused?: boolean | null
          agent_paused_until?: string | null
          antiloop_sent_at?: string | null
          bot_confidence_score?: number | null
          bot_detection_reason?: string | null
          bot_detection_state?: string
          created_at?: string
          id?: string
          initial_message_content?: string | null
          initial_message_sent_at?: string | null
          is_processing?: boolean | null
          lead_name?: string | null
          lead_phone: string
          process_after?: string | null
          reply_content?: string | null
          reply_count?: number | null
          reply_sent?: boolean
          reply_sent_at?: string | null
          response_content?: string | null
          response_received?: boolean
          response_received_at?: string | null
          status?: string
          updated_at?: string
          user_responded_at?: string | null
          user_responded_date?: string | null
        }
        Update: {
          agent_id?: string
          agent_manually_paused?: boolean | null
          agent_paused_until?: string | null
          antiloop_sent_at?: string | null
          bot_confidence_score?: number | null
          bot_detection_reason?: string | null
          bot_detection_state?: string
          created_at?: string
          id?: string
          initial_message_content?: string | null
          initial_message_sent_at?: string | null
          is_processing?: boolean | null
          lead_name?: string | null
          lead_phone?: string
          process_after?: string | null
          reply_content?: string | null
          reply_count?: number | null
          reply_sent?: boolean
          reply_sent_at?: string | null
          response_content?: string | null
          response_received?: boolean
          response_received_at?: string | null
          status?: string
          updated_at?: string
          user_responded_at?: string | null
          user_responded_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_message_buffer: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          id: string
          lead_name: string | null
          lead_phone: string
          message_content: string
          received_at: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          lead_name?: string | null
          lead_phone: string
          message_content: string
          received_at?: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          lead_name?: string | null
          lead_phone?: string
          message_content?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_message_buffer_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_message_buffer_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_message_logs: {
        Row: {
          agent_id: string
          content: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          id: string
          message_type: string | null
          processed_at: string
        }
        Insert: {
          agent_id: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction: string
          id?: string
          message_type?: string | null
          processed_at?: string
        }
        Update: {
          agent_id?: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          message_type?: string | null
          processed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_message_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_message_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_templates: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          template_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          template_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          agent_objective: string | null
          communication_style: string
          created_at: string
          crm_stage_on_end: string | null
          crm_stage_on_lost: string | null
          crm_stage_on_new_lead: string | null
          crm_stage_on_reply: string | null
          crm_stage_on_unknown: string | null
          daily_limit: number
          end_conversation_criteria: string | null
          id: string
          is_warmed: boolean
          last_reset_date: string | null
          max_replies: number | null
          max_response_chars: number | null
          message_templates: Json | null
          messages_sent_today: number
          n8n_webhook_url: string | null
          n8n_workflow_id: string | null
          name: string
          objective: string
          operating_hours_end: string
          operating_hours_start: string
          post_response_behavior: string | null
          respond_to_groups: boolean
          status: string
          system_prompt: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          whatsapp_number_id: string | null
          wizard_data: Json | null
        }
        Insert: {
          agent_objective?: string | null
          communication_style?: string
          created_at?: string
          crm_stage_on_end?: string | null
          crm_stage_on_lost?: string | null
          crm_stage_on_new_lead?: string | null
          crm_stage_on_reply?: string | null
          crm_stage_on_unknown?: string | null
          daily_limit?: number
          end_conversation_criteria?: string | null
          id?: string
          is_warmed?: boolean
          last_reset_date?: string | null
          max_replies?: number | null
          max_response_chars?: number | null
          message_templates?: Json | null
          messages_sent_today?: number
          n8n_webhook_url?: string | null
          n8n_workflow_id?: string | null
          name: string
          objective: string
          operating_hours_end?: string
          operating_hours_start?: string
          post_response_behavior?: string | null
          respond_to_groups?: boolean
          status?: string
          system_prompt?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number_id?: string | null
          wizard_data?: Json | null
        }
        Update: {
          agent_objective?: string | null
          communication_style?: string
          created_at?: string
          crm_stage_on_end?: string | null
          crm_stage_on_lost?: string | null
          crm_stage_on_new_lead?: string | null
          crm_stage_on_reply?: string | null
          crm_stage_on_unknown?: string | null
          daily_limit?: number
          end_conversation_criteria?: string | null
          id?: string
          is_warmed?: boolean
          last_reset_date?: string | null
          max_replies?: number | null
          max_response_chars?: number | null
          message_templates?: Json | null
          messages_sent_today?: number
          n8n_webhook_url?: string | null
          n8n_workflow_id?: string | null
          name?: string
          objective?: string
          operating_hours_end?: string
          operating_hours_start?: string
          post_response_behavior?: string | null
          respond_to_groups?: boolean
          status?: string
          system_prompt?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string | null
          wizard_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          confidence: number | null
          cost_usd: number | null
          created_at: string
          id: string
          matched_faq_ids: string[] | null
          matched_kb_ids: string[] | null
          model: string | null
          query: string | null
          ticket_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          was_helpful: boolean | null
        }
        Insert: {
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          matched_faq_ids?: string[] | null
          matched_kb_ids?: string[] | null
          model?: string | null
          query?: string | null
          ticket_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          was_helpful?: boolean | null
        }
        Update: {
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          matched_faq_ids?: string[] | null
          matched_kb_ids?: string[] | null
          model?: string | null
          query?: string | null
          ticket_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_cost_by_ticket"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ai_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          expires_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      campaign_daily_reservations: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          reserved_count: number
          reserved_date: string
          updated_at: string
          whatsapp_number_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          reserved_count?: number
          reserved_date: string
          updated_at?: string
          whatsapp_number_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          reserved_count?: number
          reserved_date?: string
          updated_at?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_daily_reservations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_daily_reservations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_drafts: {
        Row: {
          campaign_name: string
          created_at: string
          delay_seconds_max: number
          delay_seconds_min: number
          enable_smart_pause: boolean
          id: string
          is_scheduled: boolean
          messages: Json
          name: string
          pause_after_contacts: number
          pause_minutes: number
          scheduled_date: string | null
          scheduled_time: string
          selected_leads: Json
          selected_number_id: string | null
          step: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name?: string
          created_at?: string
          delay_seconds_max?: number
          delay_seconds_min?: number
          enable_smart_pause?: boolean
          id?: string
          is_scheduled?: boolean
          messages?: Json
          name?: string
          pause_after_contacts?: number
          pause_minutes?: number
          scheduled_date?: string | null
          scheduled_time?: string
          selected_leads?: Json
          selected_number_id?: string | null
          step?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          created_at?: string
          delay_seconds_max?: number
          delay_seconds_min?: number
          enable_smart_pause?: boolean
          id?: string
          is_scheduled?: boolean
          messages?: Json
          name?: string
          pause_after_contacts?: number
          pause_minutes?: number
          scheduled_date?: string | null
          scheduled_time?: string
          selected_leads?: Json
          selected_number_id?: string | null
          step?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_incidents: {
        Row: {
          campaign_id: string | null
          contact_phone: string | null
          created_at: string
          detected_at: string
          id: string
          incident_type: string
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_phone?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          incident_type: string
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_phone?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          incident_type?: string
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_incidents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_incidents_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_processor_heartbeats: {
        Row: {
          action: string
          campaigns_processed: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          messages_sent: number | null
          started_at: string
          status: string
        }
        Insert: {
          action: string
          campaigns_processed?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          messages_sent?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          action?: string
          campaigns_processed?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          messages_sent?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      campaign_responses: {
        Row: {
          campaign_id: string
          contact_phone: string
          created_at: string
          id: string
          message_content: string | null
          responded_at: string
          user_id: string
          window_number: number
        }
        Insert: {
          campaign_id: string
          contact_phone: string
          created_at?: string
          id?: string
          message_content?: string | null
          responded_at?: string
          user_id: string
          window_number?: number
        }
        Update: {
          campaign_id?: string
          contact_phone?: string
          created_at?: string
          id?: string
          message_content?: string | null
          responded_at?: string
          user_id?: string
          window_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_feedback: {
        Row: {
          additional_comments: string | null
          cancellation_reason: string
          created_at: string
          details: string | null
          email: string | null
          id: string
          intends_to_return: string | null
          provider: string | null
          usage_level: string | null
          user_id: string
        }
        Insert: {
          additional_comments?: string | null
          cancellation_reason: string
          created_at?: string
          details?: string | null
          email?: string | null
          id?: string
          intends_to_return?: string | null
          provider?: string | null
          usage_level?: string | null
          user_id: string
        }
        Update: {
          additional_comments?: string | null
          cancellation_reason?: string
          created_at?: string
          details?: string | null
          email?: string | null
          id?: string
          intends_to_return?: string | null
          provider?: string | null
          usage_level?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          contact_name: string | null
          contact_phone: string
          contact_profile_pic: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          is_muted: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_text: string | null
          last_message_type: string | null
          pinned_at: string | null
          unread_count: number | null
          updated_at: string
          user_id: string
          waba_connection_id: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone: string
          contact_profile_pic?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_text?: string | null
          last_message_type?: string | null
          pinned_at?: string | null
          unread_count?: number | null
          updated_at?: string
          user_id: string
          waba_connection_id: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string
          contact_profile_pic?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_text?: string | null
          last_message_type?: string | null
          pinned_at?: string | null
          unread_count?: number | null
          updated_at?: string
          user_id?: string
          waba_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_waba_connection_id_fkey"
            columns: ["waba_connection_id"]
            isOneToOne: false
            referencedRelation: "user_waba_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_caption: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string
          metadata: Json | null
          reply_to_message_id: string | null
          status: string | null
          status_updated_at: string | null
          user_id: string
          waba_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          reply_to_message_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          user_id: string
          waba_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          reply_to_message_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          user_id?: string
          waba_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_leads: {
        Row: {
          address: string | null
          address_number: string | null
          checkout_completed: boolean
          checkout_completed_at: string | null
          checkout_started_at: string
          created_at: string
          email: string
          id: string
          name: string | null
          neighborhood: string | null
          phone: string | null
          plan_attempted: string
          postal_code: string | null
          stripe_session_id: string | null
          tax_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          checkout_completed?: boolean
          checkout_completed_at?: string | null
          checkout_started_at?: string
          created_at?: string
          email: string
          id?: string
          name?: string | null
          neighborhood?: string | null
          phone?: string | null
          plan_attempted: string
          postal_code?: string | null
          stripe_session_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          checkout_completed?: boolean
          checkout_completed_at?: string | null
          checkout_started_at?: string
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          neighborhood?: string | null
          phone?: string | null
          plan_attempted?: string
          postal_code?: string | null
          stripe_session_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          attendant_name: string
          company_differential: string
          company_name: string
          company_niche: string
          company_objective: string
          company_products: string
          company_target_audience: string
          created_at: string
          id: string
          last_message_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendant_name?: string
          company_differential?: string
          company_name?: string
          company_niche?: string
          company_objective?: string
          company_products?: string
          company_target_audience?: string
          created_at?: string
          id?: string
          last_message_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attendant_name?: string
          company_differential?: string
          company_name?: string
          company_niche?: string
          company_objective?: string
          company_products?: string
          company_target_audience?: string
          created_at?: string
          id?: string
          last_message_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_services: {
        Row: {
          average_ticket: number
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_ticket?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_ticket?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_code: string
          created_at: string
          discount_amount_cents: number
          email: string
          id: string
          ip_address: string | null
          plan_key: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_code: string
          created_at?: string
          discount_amount_cents?: number
          email: string
          id?: string
          ip_address?: string | null
          plan_key: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string
          created_at?: string
          discount_amount_cents?: number
          email?: string
          id?: string
          ip_address?: string | null
          plan_key?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          allowed_plans: string[] | null
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          allowed_plans?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          allowed_plans?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      crm_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_subscription_payments: {
        Row: {
          amount_cents: number
          created_at: string
          custom_subscription_id: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string
          receipt_file_name: string | null
          receipt_file_url: string | null
          recorded_by_admin_id: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          custom_subscription_id: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          receipt_file_name?: string | null
          receipt_file_url?: string | null
          recorded_by_admin_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          custom_subscription_id?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          receipt_file_name?: string | null
          receipt_file_url?: string | null
          recorded_by_admin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_subscription_payments_custom_subscription_id_fkey"
            columns: ["custom_subscription_id"]
            isOneToOne: false
            referencedRelation: "custom_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_subscription_renewals: {
        Row: {
          id: string
          new_subscription_id: string
          notes: string | null
          previous_subscription_id: string
          renewed_at: string
          renewed_by_admin_id: string
          user_id: string
        }
        Insert: {
          id?: string
          new_subscription_id: string
          notes?: string | null
          previous_subscription_id: string
          renewed_at?: string
          renewed_by_admin_id: string
          user_id: string
        }
        Update: {
          id?: string
          new_subscription_id?: string
          notes?: string | null
          previous_subscription_id?: string
          renewed_at?: string
          renewed_by_admin_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_subscription_renewals_new_subscription_id_fkey"
            columns: ["new_subscription_id"]
            isOneToOne: false
            referencedRelation: "custom_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_subscription_renewals_previous_subscription_id_fkey"
            columns: ["previous_subscription_id"]
            isOneToOne: false
            referencedRelation: "custom_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_subscriptions: {
        Row: {
          cancel_reason: string | null
          canceled_at: string | null
          contract_file_name: string | null
          contract_file_url: string | null
          contract_months: number | null
          created_at: string
          created_by_admin_id: string
          ends_at: string | null
          id: string
          is_lifetime: boolean
          monthly_value_cents: number
          notes: string | null
          payment_method: string
          payment_notes: string | null
          plan: string
          renewed_into_id: string | null
          searches_limit: number
          starts_at: string
          status: string
          subscription_label: string | null
          total_value_cents: number
          updated_at: string
          user_id: string
          whatsapp_numbers_limit: number
        }
        Insert: {
          cancel_reason?: string | null
          canceled_at?: string | null
          contract_file_name?: string | null
          contract_file_url?: string | null
          contract_months?: number | null
          created_at?: string
          created_by_admin_id: string
          ends_at?: string | null
          id?: string
          is_lifetime?: boolean
          monthly_value_cents?: number
          notes?: string | null
          payment_method?: string
          payment_notes?: string | null
          plan: string
          renewed_into_id?: string | null
          searches_limit?: number
          starts_at?: string
          status?: string
          subscription_label?: string | null
          total_value_cents?: number
          updated_at?: string
          user_id: string
          whatsapp_numbers_limit?: number
        }
        Update: {
          cancel_reason?: string | null
          canceled_at?: string | null
          contract_file_name?: string | null
          contract_file_url?: string | null
          contract_months?: number | null
          created_at?: string
          created_by_admin_id?: string
          ends_at?: string | null
          id?: string
          is_lifetime?: boolean
          monthly_value_cents?: number
          notes?: string | null
          payment_method?: string
          payment_notes?: string | null
          plan?: string
          renewed_into_id?: string | null
          searches_limit?: number
          starts_at?: string
          status?: string
          subscription_label?: string | null
          total_value_cents?: number
          updated_at?: string
          user_id?: string
          whatsapp_numbers_limit?: number
        }
        Relationships: []
      }
      email_flow_edges: {
        Row: {
          condition_label: string | null
          created_at: string
          flow_id: string
          id: string
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
        }
        Insert: {
          condition_label?: string | null
          created_at?: string
          flow_id: string
          id?: string
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
        }
        Update: {
          condition_label?: string | null
          created_at?: string
          flow_id?: string
          id?: string
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "email_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "email_flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          current_node_id: string | null
          entered_at: string
          exit_reason: string | null
          exited_at: string | null
          flow_id: string
          id: string
          metadata: Json | null
          next_step_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          entered_at?: string
          exit_reason?: string | null
          exited_at?: string | null
          flow_id: string
          id?: string
          metadata?: Json | null
          next_step_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          entered_at?: string
          exit_reason?: string | null
          exited_at?: string | null
          flow_id?: string
          id?: string
          metadata?: Json | null
          next_step_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_enrollments_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "email_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_enrollments_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_execution_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          enrollment_id: string | null
          executed_at: string
          flow_id: string
          id: string
          node_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          enrollment_id?: string | null
          executed_at?: string
          flow_id: string
          id?: string
          node_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          enrollment_id?: string | null
          executed_at?: string
          flow_id?: string
          id?: string
          node_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_execution_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_flow_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_execution_logs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_execution_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "email_flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_nodes: {
        Row: {
          config: Json | null
          created_at: string
          flow_id: string
          id: string
          name: string
          node_type: string
          position_x: number
          position_y: number
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          flow_id: string
          id?: string
          name?: string
          node_type: string
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          flow_id?: string
          id?: string
          name?: string
          node_type?: string
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          preview_text: string | null
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          preview_text?: string | null
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          preview_text?: string | null
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_flows: {
        Row: {
          activated_at: string | null
          audience_config: Json | null
          audience_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_rules: Json | null
          id: string
          name: string
          settings: Json | null
          status: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          audience_config?: Json | null
          audience_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_rules?: Json | null
          id?: string
          name: string
          settings?: Json | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          audience_config?: Json | null
          audience_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_rules?: Json | null
          id?: string
          name?: string
          settings?: Json | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          clicked_count: number | null
          created_at: string
          email_type: Database["public"]["Enums"]["email_type"]
          error_message: string | null
          id: string
          idempotency_key: string | null
          opened_at: string | null
          opened_count: number | null
          payload: Json | null
          provider_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string | null
          to_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          clicked_count?: number | null
          created_at?: string
          email_type: Database["public"]["Enums"]["email_type"]
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          opened_at?: string | null
          opened_count?: number | null
          payload?: Json | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          to_email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          clicked_count?: number | null
          created_at?: string
          email_type?: Database["public"]["Enums"]["email_type"]
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          opened_at?: string | null
          opened_count?: number | null
          payload?: Json | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          to_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          id: string
          marketing_enabled: boolean
          transactional_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_enabled?: boolean
          transactional_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketing_enabled?: boolean
          transactional_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faq_topics: {
        Row: {
          active: boolean | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean | null
          content: string | null
          created_at: string
          embedding: string | null
          id: string
          sort_order: number | null
          tags: string[] | null
          title: string
          topic_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean | null
          content?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          sort_order?: number | null
          tags?: string[] | null
          title: string
          topic_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean | null
          content?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faqs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "faq_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      frontend_errors: {
        Row: {
          app_version: string | null
          col_no: number | null
          created_at: string
          id: string
          line_no: number | null
          message: string
          resolved: boolean
          route: string | null
          session_id: string | null
          severity: string
          source_file: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          col_no?: number | null
          created_at?: string
          id?: string
          line_no?: number | null
          message: string
          resolved?: boolean
          route?: string | null
          session_id?: string | null
          severity?: string
          source_file?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          col_no?: number | null
          created_at?: string
          id?: string
          line_no?: number | null
          message?: string
          resolved?: boolean
          route?: string | null
          session_id?: string | null
          severity?: string
          source_file?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ignored_contacts: {
        Row: {
          campaign_id: string | null
          created_at: string
          first_message_sent_at: string
          id: string
          phone: string
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          first_message_sent_at?: string
          id?: string
          phone: string
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          first_message_sent_at?: string
          id?: string
          phone?: string
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ignored_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ignored_contacts_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          active: boolean | null
          auto_escalate: boolean | null
          category: string | null
          created_at: string
          embedding: string | null
          guided_flow: Json | null
          id: string
          last_used_at: string | null
          min_confidence: number | null
          pains: string | null
          priority: string | null
          severity: string | null
          solution: string | null
          subtopic: string | null
          success_rate: number
          successful_uses: number
          tags: string[] | null
          title: string
          total_uses: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean | null
          auto_escalate?: boolean | null
          category?: string | null
          created_at?: string
          embedding?: string | null
          guided_flow?: Json | null
          id?: string
          last_used_at?: string | null
          min_confidence?: number | null
          pains?: string | null
          priority?: string | null
          severity?: string | null
          solution?: string | null
          subtopic?: string | null
          success_rate?: number
          successful_uses?: number
          tags?: string[] | null
          title: string
          total_uses?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean | null
          auto_escalate?: boolean | null
          category?: string | null
          created_at?: string
          embedding?: string | null
          guided_flow?: Json | null
          id?: string
          last_used_at?: string | null
          min_confidence?: number | null
          pains?: string | null
          priority?: string | null
          severity?: string | null
          solution?: string | null
          subtopic?: string | null
          success_rate?: number
          successful_uses?: number
          tags?: string[] | null
          title?: string
          total_uses?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      landing_page_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          landing_page_id: string | null
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          landing_page_id?: string | null
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          landing_page_id?: string | null
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_events_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_deal_attachments: {
        Row: {
          created_at: string
          deal_id: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_deal_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "lead_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_deals: {
        Row: {
          closed_at: string
          contract_months: number
          contract_type: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          closed_at?: string
          contract_months?: number
          contract_type?: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          user_id: string
          value: number
        }
        Update: {
          closed_at?: string
          contract_months?: number
          contract_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_files: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_folder_id: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          lead_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_folder_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          lead_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_folder_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          lead_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_origins: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          ai_approach_message: string | null
          ai_diagnosis: string | null
          ai_recommended_action: string | null
          ai_score: number | null
          category: string | null
          city: string | null
          closing_probability: string | null
          company_name: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          enrichment_data: Json | null
          estimated_value: number | null
          first_message_sent: boolean | null
          first_message_sent_at: string | null
          google_maps_link: string | null
          has_responded: boolean | null
          id: string
          last_message_sent: string | null
          last_message_sent_at: string | null
          last_response: string | null
          last_response_at: string | null
          opportunity_level: string | null
          origin: string | null
          phone: string
          phone_numbers: Json | null
          pipeline_stage_id: string | null
          prospected_at: string | null
          rating: number | null
          region: string | null
          responded_at: string | null
          review_count: number | null
          social_media: Json | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp_number_id: string | null
          whatsapp_status: string | null
        }
        Insert: {
          address?: string | null
          ai_approach_message?: string | null
          ai_diagnosis?: string | null
          ai_recommended_action?: string | null
          ai_score?: number | null
          category?: string | null
          city?: string | null
          closing_probability?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          enrichment_data?: Json | null
          estimated_value?: number | null
          first_message_sent?: boolean | null
          first_message_sent_at?: string | null
          google_maps_link?: string | null
          has_responded?: boolean | null
          id?: string
          last_message_sent?: string | null
          last_message_sent_at?: string | null
          last_response?: string | null
          last_response_at?: string | null
          opportunity_level?: string | null
          origin?: string | null
          phone: string
          phone_numbers?: Json | null
          pipeline_stage_id?: string | null
          prospected_at?: string | null
          rating?: number | null
          region?: string | null
          responded_at?: string | null
          review_count?: number | null
          social_media?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp_number_id?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          address?: string | null
          ai_approach_message?: string | null
          ai_diagnosis?: string | null
          ai_recommended_action?: string | null
          ai_score?: number | null
          category?: string | null
          city?: string | null
          closing_probability?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          enrichment_data?: Json | null
          estimated_value?: number | null
          first_message_sent?: boolean | null
          first_message_sent_at?: string | null
          google_maps_link?: string | null
          has_responded?: boolean | null
          id?: string
          last_message_sent?: string | null
          last_message_sent_at?: string | null
          last_response?: string | null
          last_response_at?: string | null
          opportunity_level?: string | null
          origin?: string | null
          phone?: string
          phone_numbers?: Json | null
          pipeline_stage_id?: string | null
          prospected_at?: string | null
          rating?: number | null
          region?: string | null
          responded_at?: string | null
          review_count?: number | null
          social_media?: Json | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp_number_id?: string | null
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          campaign_name: string
          connection_id: string | null
          created_at: string
          error_details: Json | null
          failed_count: number
          id: string
          status: string
          success_count: number
          template_language: string
          template_name: string
          total_recipients: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name: string
          connection_id?: string | null
          created_at?: string
          error_details?: Json | null
          failed_count?: number
          id?: string
          status?: string
          success_count?: number
          template_language?: string
          template_name: string
          total_recipients?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          connection_id?: string | null
          created_at?: string
          error_details?: Json | null
          failed_count?: number
          id?: string
          status?: string
          success_count?: number
          template_language?: string
          template_name?: string
          total_recipients?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_waba_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_user_settings: {
        Row: {
          created_at: string
          id: string
          notify_campaign_issues: boolean
          notify_daily_summary: boolean
          notify_number_disconnected: boolean
          notify_quality_drop: boolean
          security_audit_log: boolean
          security_hmac_required: boolean
          security_ip_allowlist: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_campaign_issues?: boolean
          notify_daily_summary?: boolean
          notify_number_disconnected?: boolean
          notify_quality_drop?: boolean
          security_audit_log?: boolean
          security_hmac_required?: boolean
          security_ip_allowlist?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_campaign_issues?: boolean
          notify_daily_summary?: boolean
          notify_number_disconnected?: boolean
          notify_quality_drop?: boolean
          security_audit_log?: boolean
          security_hmac_required?: boolean
          security_ip_allowlist?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_webhook_events: {
        Row: {
          contact_name: string | null
          created_at: string | null
          event_type: string
          from_phone: string | null
          id: string
          message_content: string | null
          message_type: string | null
          phone_number_id: string | null
          raw_payload: Json | null
          received_at: string | null
          waba_id: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          event_type: string
          from_phone?: string | null
          id?: string
          message_content?: string | null
          message_type?: string | null
          phone_number_id?: string | null
          raw_payload?: Json | null
          received_at?: string | null
          waba_id?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          event_type?: string
          from_phone?: string | null
          id?: string
          message_content?: string | null
          message_type?: string | null
          phone_number_id?: string | null
          raw_payload?: Json | null
          received_at?: string | null
          waba_id?: string | null
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          access_email: string | null
          address: string | null
          admin_notes: string | null
          approved_partner_id: string | null
          audience_size: string | null
          city: string | null
          cnpj: string | null
          community_url: string | null
          company_name: string | null
          contact_authorized: boolean | null
          country: string | null
          cpf: string | null
          created_at: string
          current_clients_count: number | null
          differential: string | null
          documents: Json | null
          email: string
          expected_monthly_referrals: number | null
          full_name: string
          has_team: boolean | null
          how_would_sell: string | null
          id: string
          info_accuracy_confirmed: boolean | null
          instagram_url: string | null
          internal_score: number | null
          ip_address: string | null
          linkedin_url: string | null
          monthly_leads_estimate: string | null
          motivation: string | null
          other_softwares_details: string | null
          password_hash: string | null
          phone: string | null
          phone_secondary: string | null
          postal_code: string | null
          profile: string | null
          promoted_other_softwares: boolean | null
          promotion_channels: string[] | null
          reason_to_be_approved: string | null
          reason_to_be_partner: string | null
          rejection_reason: string | null
          results_90_days: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          source: string | null
          state: string | null
          status: string
          terms_accepted: boolean | null
          tiktok_url: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          website_url: string | null
          years_in_market: string | null
          youtube_url: string | null
        }
        Insert: {
          access_email?: string | null
          address?: string | null
          admin_notes?: string | null
          approved_partner_id?: string | null
          audience_size?: string | null
          city?: string | null
          cnpj?: string | null
          community_url?: string | null
          company_name?: string | null
          contact_authorized?: boolean | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          current_clients_count?: number | null
          differential?: string | null
          documents?: Json | null
          email: string
          expected_monthly_referrals?: number | null
          full_name: string
          has_team?: boolean | null
          how_would_sell?: string | null
          id?: string
          info_accuracy_confirmed?: boolean | null
          instagram_url?: string | null
          internal_score?: number | null
          ip_address?: string | null
          linkedin_url?: string | null
          monthly_leads_estimate?: string | null
          motivation?: string | null
          other_softwares_details?: string | null
          password_hash?: string | null
          phone?: string | null
          phone_secondary?: string | null
          postal_code?: string | null
          profile?: string | null
          promoted_other_softwares?: boolean | null
          promotion_channels?: string[] | null
          reason_to_be_approved?: string | null
          reason_to_be_partner?: string | null
          rejection_reason?: string | null
          results_90_days?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          source?: string | null
          state?: string | null
          status?: string
          terms_accepted?: boolean | null
          tiktok_url?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website_url?: string | null
          years_in_market?: string | null
          youtube_url?: string | null
        }
        Update: {
          access_email?: string | null
          address?: string | null
          admin_notes?: string | null
          approved_partner_id?: string | null
          audience_size?: string | null
          city?: string | null
          cnpj?: string | null
          community_url?: string | null
          company_name?: string | null
          contact_authorized?: boolean | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          current_clients_count?: number | null
          differential?: string | null
          documents?: Json | null
          email?: string
          expected_monthly_referrals?: number | null
          full_name?: string
          has_team?: boolean | null
          how_would_sell?: string | null
          id?: string
          info_accuracy_confirmed?: boolean | null
          instagram_url?: string | null
          internal_score?: number | null
          ip_address?: string | null
          linkedin_url?: string | null
          monthly_leads_estimate?: string | null
          motivation?: string | null
          other_softwares_details?: string | null
          password_hash?: string | null
          phone?: string | null
          phone_secondary?: string | null
          postal_code?: string | null
          profile?: string | null
          promoted_other_softwares?: boolean | null
          promotion_channels?: string[] | null
          reason_to_be_approved?: string | null
          reason_to_be_partner?: string | null
          rejection_reason?: string | null
          results_90_days?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          source?: string | null
          state?: string | null
          status?: string
          terms_accepted?: boolean | null
          tiktok_url?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website_url?: string | null
          years_in_market?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_approved_partner_id_fkey"
            columns: ["approved_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_bank_accounts: {
        Row: {
          account_type: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string
          holder_name: string | null
          holder_tax_id: string | null
          id: string
          partner_id: string
          pix_key: string | null
          pix_key_type: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          holder_name?: string | null
          holder_tax_id?: string | null
          id?: string
          partner_id: string
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          holder_name?: string | null
          holder_tax_id?: string | null
          id?: string
          partner_id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_bank_accounts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_clicks: {
        Row: {
          converted_to_lead_at: string | null
          converted_user_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          landing_page: string | null
          partner_id: string
          referral_code: string
          referral_link_id: string | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          converted_to_lead_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          partner_id: string
          referral_code: string
          referral_link_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          converted_to_lead_at?: string | null
          converted_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          partner_id?: string
          referral_code?: string
          referral_link_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clicks_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "partner_referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          available_at: string
          base_amount_cents: number
          cancellation_reason: string | null
          cancelled_at: string | null
          commission_amount_cents: number
          commission_percent: number
          created_at: string
          id: string
          internal_notes: string | null
          paid_at: string | null
          partner_id: string
          partner_level: Database["public"]["Enums"]["partner_level"]
          partner_sale_id: string
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          available_at: string
          base_amount_cents: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_amount_cents: number
          commission_percent: number
          created_at?: string
          id?: string
          internal_notes?: string | null
          paid_at?: string | null
          partner_id: string
          partner_level: Database["public"]["Enums"]["partner_level"]
          partner_sale_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          available_at?: string
          base_amount_cents?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_amount_cents?: number
          commission_percent?: number
          created_at?: string
          id?: string
          internal_notes?: string | null
          paid_at?: string | null
          partner_id?: string
          partner_level?: Database["public"]["Enums"]["partner_level"]
          partner_sale_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_sale_id_fkey"
            columns: ["partner_sale_id"]
            isOneToOne: false
            referencedRelation: "partner_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_fraud_attempts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          matched_field: string | null
          metadata: Json | null
          partner_id: string | null
          reason: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          matched_field?: string | null
          metadata?: Json | null
          partner_id?: string | null
          reason: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          matched_field?: string | null
          metadata?: Json | null
          partner_id?: string | null
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_fraud_attempts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_goals: {
        Row: {
          achieved_value: number
          completed_at: string | null
          created_at: string
          created_by_admin_id: string | null
          deadline_at: string
          description: string | null
          goal_type: Database["public"]["Enums"]["partner_goal_type"]
          id: string
          internal_notes: string | null
          partner_id: string
          prize_amount_cents: number
          prize_claimed_at: string | null
          prize_status: Database["public"]["Enums"]["partner_goal_prize_status"]
          prize_withdrawal_id: string | null
          referral_link_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["partner_goal_status"]
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          achieved_value?: number
          completed_at?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          deadline_at: string
          description?: string | null
          goal_type: Database["public"]["Enums"]["partner_goal_type"]
          id?: string
          internal_notes?: string | null
          partner_id: string
          prize_amount_cents?: number
          prize_claimed_at?: string | null
          prize_status?: Database["public"]["Enums"]["partner_goal_prize_status"]
          prize_withdrawal_id?: string | null
          referral_link_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["partner_goal_status"]
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          achieved_value?: number
          completed_at?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          deadline_at?: string
          description?: string | null
          goal_type?: Database["public"]["Enums"]["partner_goal_type"]
          id?: string
          internal_notes?: string | null
          partner_id?: string
          prize_amount_cents?: number
          prize_claimed_at?: string | null
          prize_status?: Database["public"]["Enums"]["partner_goal_prize_status"]
          prize_withdrawal_id?: string | null
          referral_link_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["partner_goal_status"]
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_goals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_goals_prize_withdrawal_id_fkey"
            columns: ["prize_withdrawal_id"]
            isOneToOne: false
            referencedRelation: "partner_withdrawals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_goals_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "partner_referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          attributed_at: string
          cancelled_at: string | null
          click_id: string | null
          created_at: string
          current_plan: string | null
          email: string
          id: string
          is_cancelled: boolean
          is_paid: boolean
          is_trial: boolean
          last_activity_at: string | null
          name: string | null
          paid_at: string | null
          partner_id: string
          referral_link_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attributed_at?: string
          cancelled_at?: string | null
          click_id?: string | null
          created_at?: string
          current_plan?: string | null
          email: string
          id?: string
          is_cancelled?: boolean
          is_paid?: boolean
          is_trial?: boolean
          last_activity_at?: string | null
          name?: string | null
          paid_at?: string | null
          partner_id: string
          referral_link_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attributed_at?: string
          cancelled_at?: string | null
          click_id?: string | null
          created_at?: string
          current_plan?: string | null
          email?: string
          id?: string
          is_cancelled?: boolean
          is_paid?: boolean
          is_trial?: boolean
          last_activity_at?: string | null
          name?: string | null
          paid_at?: string | null
          partner_id?: string
          referral_link_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_leads_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "partner_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "partner_referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_levels_history: {
        Row: {
          changed_at: string
          changed_by_admin_id: string | null
          from_level: Database["public"]["Enums"]["partner_level"] | null
          id: string
          partner_id: string
          reason: string | null
          to_level: Database["public"]["Enums"]["partner_level"]
        }
        Insert: {
          changed_at?: string
          changed_by_admin_id?: string | null
          from_level?: Database["public"]["Enums"]["partner_level"] | null
          id?: string
          partner_id: string
          reason?: string | null
          to_level: Database["public"]["Enums"]["partner_level"]
        }
        Update: {
          changed_at?: string
          changed_by_admin_id?: string | null
          from_level?: Database["public"]["Enums"]["partner_level"] | null
          id?: string
          partner_id?: string
          reason?: string | null
          to_level?: Database["public"]["Enums"]["partner_level"]
        }
        Relationships: [
          {
            foreignKeyName: "partner_levels_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_materials: {
        Row: {
          asset_url: string | null
          category: string
          content_text: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          display_order: number
          format: string | null
          id: string
          is_active: boolean
          meta: Json | null
          preview_url: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_url?: string | null
          category: string
          content_text?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          display_order?: number
          format?: string | null
          id?: string
          is_active?: boolean
          meta?: Json | null
          preview_url?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_url?: string | null
          category?: string
          content_text?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          display_order?: number
          format?: string | null
          id?: string
          is_active?: boolean
          meta?: Json | null
          preview_url?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          internal_notes: string | null
          paid_at: string
          partner_id: string
          payment_method: string
          payment_reference: string | null
          receipt_file_name: string | null
          receipt_file_url: string | null
          recorded_by_admin_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          internal_notes?: string | null
          paid_at?: string
          partner_id: string
          payment_method?: string
          payment_reference?: string | null
          receipt_file_name?: string | null
          receipt_file_url?: string | null
          recorded_by_admin_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          internal_notes?: string | null
          paid_at?: string
          partner_id?: string
          payment_method?: string
          payment_reference?: string | null
          receipt_file_name?: string | null
          receipt_file_url?: string | null
          recorded_by_admin_id?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payouts_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "partner_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referral_links: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          description: string | null
          expires_at: string | null
          id: string
          internal_name: string | null
          is_active: boolean
          label: string
          partner_id: string
          slug: string
          total_clicks: number
          total_leads: number
          total_paid_clients: number
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          internal_name?: string | null
          is_active?: boolean
          label: string
          partner_id: string
          slug: string
          total_clicks?: number
          total_leads?: number
          total_paid_clients?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          internal_name?: string | null
          is_active?: boolean
          label?: string
          partner_id?: string
          slug?: string
          total_clicks?: number
          total_leads?: number
          total_paid_clients?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_referral_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sales: {
        Row: {
          amount_cents: number
          chargeback_at: string | null
          created_at: string
          customer_user_id: string
          external_reference: string | null
          id: string
          is_recurring: boolean
          paid_at: string
          partner_id: string
          partner_lead_id: string | null
          payment_method: string | null
          payment_provider: string
          plan: string
          refunded_at: string | null
        }
        Insert: {
          amount_cents?: number
          chargeback_at?: string | null
          created_at?: string
          customer_user_id: string
          external_reference?: string | null
          id?: string
          is_recurring?: boolean
          paid_at?: string
          partner_id: string
          partner_lead_id?: string | null
          payment_method?: string | null
          payment_provider: string
          plan: string
          refunded_at?: string | null
        }
        Update: {
          amount_cents?: number
          chargeback_at?: string | null
          created_at?: string
          customer_user_id?: string
          external_reference?: string | null
          id?: string
          is_recurring?: boolean
          paid_at?: string
          partner_id?: string
          partner_lead_id?: string | null
          payment_method?: string | null
          payment_provider?: string
          plan?: string
          refunded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sales_partner_lead_id_fkey"
            columns: ["partner_lead_id"]
            isOneToOne: false
            referencedRelation: "partner_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_settings: {
        Row: {
          admin_notification_emails: string[] | null
          allow_multiple_pending_withdrawals: boolean
          bronze_commission_percent: number
          created_at: string
          gold_commission_percent: number
          gold_threshold_clients: number
          id: number
          minimum_withdrawal_cents: number
          partner_portal_domain: string | null
          platinum_commission_percent: number
          platinum_threshold_clients: number
          program_enabled: boolean
          release_days: number
          silver_commission_percent: number
          silver_threshold_clients: number
          updated_at: string
        }
        Insert: {
          admin_notification_emails?: string[] | null
          allow_multiple_pending_withdrawals?: boolean
          bronze_commission_percent?: number
          created_at?: string
          gold_commission_percent?: number
          gold_threshold_clients?: number
          id?: number
          minimum_withdrawal_cents?: number
          partner_portal_domain?: string | null
          platinum_commission_percent?: number
          platinum_threshold_clients?: number
          program_enabled?: boolean
          release_days?: number
          silver_commission_percent?: number
          silver_threshold_clients?: number
          updated_at?: string
        }
        Update: {
          admin_notification_emails?: string[] | null
          allow_multiple_pending_withdrawals?: boolean
          bronze_commission_percent?: number
          created_at?: string
          gold_commission_percent?: number
          gold_threshold_clients?: number
          id?: number
          minimum_withdrawal_cents?: number
          partner_portal_domain?: string | null
          platinum_commission_percent?: number
          platinum_threshold_clients?: number
          program_enabled?: boolean
          release_days?: number
          silver_commission_percent?: number
          silver_threshold_clients?: number
          updated_at?: string
        }
        Relationships: []
      }
      partner_withdrawals: {
        Row: {
          amount_cents: number
          approved_at: string | null
          bank_snapshot: Json | null
          created_at: string
          id: string
          internal_notes: string | null
          paid_at: string | null
          partner_id: string
          rejected_at: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_by_admin_id: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          bank_snapshot?: Json | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          paid_at?: string | null
          partner_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          bank_snapshot?: Json | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          paid_at?: string | null
          partner_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_by_admin_id?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_withdrawals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          created_by_admin_id: string | null
          custom_commission_percent: number | null
          email: string
          full_name: string
          id: string
          internal_notes: string | null
          level: Database["public"]["Enums"]["partner_level"]
          lifetime_commission_cents: number
          lifetime_revenue_cents: number
          phone: string | null
          referral_code: string
          status: Database["public"]["Enums"]["partner_status"]
          tax_id: string | null
          total_clicks: number
          total_leads: number
          total_paid_clients: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          custom_commission_percent?: number | null
          email: string
          full_name: string
          id?: string
          internal_notes?: string | null
          level?: Database["public"]["Enums"]["partner_level"]
          lifetime_commission_cents?: number
          lifetime_revenue_cents?: number
          phone?: string | null
          referral_code: string
          status?: Database["public"]["Enums"]["partner_status"]
          tax_id?: string | null
          total_clicks?: number
          total_leads?: number
          total_paid_clients?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          custom_commission_percent?: number | null
          email?: string
          full_name?: string
          id?: string
          internal_notes?: string | null
          level?: Database["public"]["Enums"]["partner_level"]
          lifetime_commission_cents?: number
          lifetime_revenue_cents?: number
          phone?: string | null
          referral_code?: string
          status?: Database["public"]["Enums"]["partner_status"]
          tax_id?: string | null
          total_clicks?: number
          total_leads?: number
          total_paid_clients?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pix_invoices: {
        Row: {
          abacate_checkout_id: string | null
          amount_cents: number
          automation_paused: boolean | null
          checkout_url: string | null
          company_name: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          last_email_sent_at: string | null
          last_email_status: string | null
          paid_at: string | null
          pix_code: string | null
          plan: string
          renewal_stage: string | null
          status: string
          subscription_period_end: string | null
          updated_at: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          abacate_checkout_id?: string | null
          amount_cents: number
          automation_paused?: boolean | null
          checkout_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_email_status?: string | null
          paid_at?: string | null
          pix_code?: string | null
          plan: string
          renewal_stage?: string | null
          status?: string
          subscription_period_end?: string | null
          updated_at?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          abacate_checkout_id?: string | null
          amount_cents?: number
          automation_paused?: boolean | null
          checkout_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_email_status?: string | null
          paid_at?: string | null
          pix_code?: string | null
          plan?: string
          renewal_stage?: string | null
          status?: string
          subscription_period_end?: string | null
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      pix_tracking_events: {
        Row: {
          created_at: string | null
          email_log_id: string | null
          event_type: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          renewal_stage: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_log_id?: string | null
          event_type: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          renewal_stage?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_log_id?: string | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          renewal_stage?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_tracking_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "pix_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          admin_assigned_plan: boolean
          archived_at: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          avatar_url: string | null
          billing_period: string | null
          bonus_searches: number
          chat_onboarding_seen: boolean
          city: string | null
          cpf: string | null
          created_at: string
          custom_feature_permissions: Json | null
          custom_searches_limit: number | null
          custom_subscription_id: string | null
          custom_whatsapp_numbers_limit: number | null
          device_fingerprint: string | null
          email: string
          fraud_flags: Json | null
          id: string
          is_archived: boolean
          is_blocked: boolean | null
          is_custom_subscription: boolean
          last_searches_reset: string | null
          name: string | null
          neighborhood: string | null
          payment_provider: string | null
          phone: string | null
          plan: string
          postal_code: string | null
          requires_payment_setup: boolean
          searches_limit: number
          searches_used: number
          signup_ip: string | null
          state: string | null
          subscription_current_period_end: string | null
          subscription_price_cents: number | null
          terms_accepted_at: string | null
          trial_asaas_customer_id: string | null
          trial_asaas_subscription_id: string | null
          trial_auto_charge_cancelled: boolean | null
          trial_auto_charge_cancelled_at: string | null
          trial_billing_period: string | null
          trial_campaigns_used: number
          trial_card_brand: string | null
          trial_card_last4: string | null
          trial_card_token: string | null
          trial_end_at: string | null
          trial_flows_used: number
          trial_leads_used: number
          trial_messages_sent: number | null
          trial_plan_chosen: string | null
          trial_start_at: string | null
          trial_will_charge_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          admin_assigned_plan?: boolean
          archived_at?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          avatar_url?: string | null
          billing_period?: string | null
          bonus_searches?: number
          chat_onboarding_seen?: boolean
          city?: string | null
          cpf?: string | null
          created_at?: string
          custom_feature_permissions?: Json | null
          custom_searches_limit?: number | null
          custom_subscription_id?: string | null
          custom_whatsapp_numbers_limit?: number | null
          device_fingerprint?: string | null
          email: string
          fraud_flags?: Json | null
          id: string
          is_archived?: boolean
          is_blocked?: boolean | null
          is_custom_subscription?: boolean
          last_searches_reset?: string | null
          name?: string | null
          neighborhood?: string | null
          payment_provider?: string | null
          phone?: string | null
          plan?: string
          postal_code?: string | null
          requires_payment_setup?: boolean
          searches_limit?: number
          searches_used?: number
          signup_ip?: string | null
          state?: string | null
          subscription_current_period_end?: string | null
          subscription_price_cents?: number | null
          terms_accepted_at?: string | null
          trial_asaas_customer_id?: string | null
          trial_asaas_subscription_id?: string | null
          trial_auto_charge_cancelled?: boolean | null
          trial_auto_charge_cancelled_at?: string | null
          trial_billing_period?: string | null
          trial_campaigns_used?: number
          trial_card_brand?: string | null
          trial_card_last4?: string | null
          trial_card_token?: string | null
          trial_end_at?: string | null
          trial_flows_used?: number
          trial_leads_used?: number
          trial_messages_sent?: number | null
          trial_plan_chosen?: string | null
          trial_start_at?: string | null
          trial_will_charge_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          admin_assigned_plan?: boolean
          archived_at?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          avatar_url?: string | null
          billing_period?: string | null
          bonus_searches?: number
          chat_onboarding_seen?: boolean
          city?: string | null
          cpf?: string | null
          created_at?: string
          custom_feature_permissions?: Json | null
          custom_searches_limit?: number | null
          custom_subscription_id?: string | null
          custom_whatsapp_numbers_limit?: number | null
          device_fingerprint?: string | null
          email?: string
          fraud_flags?: Json | null
          id?: string
          is_archived?: boolean
          is_blocked?: boolean | null
          is_custom_subscription?: boolean
          last_searches_reset?: string | null
          name?: string | null
          neighborhood?: string | null
          payment_provider?: string | null
          phone?: string | null
          plan?: string
          postal_code?: string | null
          requires_payment_setup?: boolean
          searches_limit?: number
          searches_used?: number
          signup_ip?: string | null
          state?: string | null
          subscription_current_period_end?: string | null
          subscription_price_cents?: number | null
          terms_accepted_at?: string | null
          trial_asaas_customer_id?: string | null
          trial_asaas_subscription_id?: string | null
          trial_auto_charge_cancelled?: boolean | null
          trial_auto_charge_cancelled_at?: string | null
          trial_billing_period?: string | null
          trial_campaigns_used?: number
          trial_card_brand?: string | null
          trial_card_last4?: string | null
          trial_card_token?: string | null
          trial_end_at?: string | null
          trial_flows_used?: number
          trial_leads_used?: number
          trial_messages_sent?: number | null
          trial_plan_chosen?: string | null
          trial_start_at?: string | null
          trial_will_charge_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      renewal_email_templates: {
        Row: {
          content: string
          created_at: string | null
          cta_text: string | null
          cta_url_template: string | null
          draft_content: string | null
          draft_subject: string | null
          id: string
          is_published: boolean | null
          last_edited_at: string | null
          last_edited_by: string | null
          payment_method: string
          preview_text: string | null
          stage: string
          subject: string
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          cta_text?: string | null
          cta_url_template?: string | null
          draft_content?: string | null
          draft_subject?: string | null
          id?: string
          is_published?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          payment_method?: string
          preview_text?: string | null
          stage: string
          subject: string
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          cta_text?: string | null
          cta_url_template?: string | null
          draft_content?: string | null
          draft_subject?: string | null
          id?: string
          is_published?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          payment_method?: string
          preview_text?: string | null
          stage?: string
          subject?: string
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      revenue_alerts: {
        Row: {
          alert_message: string
          alert_severity: string
          alert_type: string
          created_at: string
          current_value: number
          id: string
          is_read: boolean
          metric_name: string
          previous_value: number
          user_id: string
          variation_pct: number
        }
        Insert: {
          alert_message: string
          alert_severity?: string
          alert_type: string
          created_at?: string
          current_value?: number
          id?: string
          is_read?: boolean
          metric_name: string
          previous_value?: number
          user_id: string
          variation_pct?: number
        }
        Update: {
          alert_message?: string
          alert_severity?: string
          alert_type?: string
          created_at?: string
          current_value?: number
          id?: string
          is_read?: boolean
          metric_name?: string
          previous_value?: number
          user_id?: string
          variation_pct?: number
        }
        Relationships: []
      }
      revenue_conversations: {
        Row: {
          avg_response_time_seconds: number | null
          created_at: string
          id: string
          inbound_count_7d: number
          last_inbound_at: string | null
          last_outbound_at: string | null
          lead_id: string
          number_instance_id: string | null
          outbound_count_7d: number
          unreplied_inbound_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_response_time_seconds?: number | null
          created_at?: string
          id?: string
          inbound_count_7d?: number
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          lead_id: string
          number_instance_id?: string | null
          outbound_count_7d?: number
          unreplied_inbound_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_response_time_seconds?: number | null
          created_at?: string
          id?: string
          inbound_count_7d?: number
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          lead_id?: string
          number_instance_id?: string | null
          outbound_count_7d?: number
          unreplied_inbound_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "revenue_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_conversations_number_instance_id_fkey"
            columns: ["number_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          created_at: string
          event_meta: Json | null
          event_type: string
          event_value: number | null
          id: string
          intent_category: string | null
          intent_confidence_score: number | null
          intent_subtype: string | null
          lead_id: string
          number_instance_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_meta?: Json | null
          event_type: string
          event_value?: number | null
          id?: string
          intent_category?: string | null
          intent_confidence_score?: number | null
          intent_subtype?: string | null
          lead_id: string
          number_instance_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_meta?: Json | null
          event_type?: string
          event_value?: number | null
          id?: string
          intent_category?: string | null
          intent_confidence_score?: number | null
          intent_subtype?: string | null
          lead_id?: string
          number_instance_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "revenue_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_number_instance_id_fkey"
            columns: ["number_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_intent_logs: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          intent_category: string
          intent_subtype: string
          lead_id: string
          matched_keywords: string[] | null
          message_id: string | null
          raw_message: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          intent_category: string
          intent_subtype: string
          lead_id: string
          matched_keywords?: string[] | null
          message_id?: string | null
          raw_message: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          intent_category?: string
          intent_subtype?: string
          lead_id?: string
          matched_keywords?: string[] | null
          message_id?: string | null
          raw_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_intent_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "revenue_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_leads: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string
          estimated_ticket_value: number | null
          first_seen_at: string
          id: string
          last_activity_at: string
          last_intent_category: string | null
          last_intent_subtype: string | null
          name: string | null
          notes: string | null
          phone_e164: string
          risk_reason: string | null
          risk_state: Database["public"]["Enums"]["revenue_risk_state"]
          score_engagement: number
          score_intent: number
          score_last_calc_at: string | null
          score_risk: number
          score_total: number
          score_urgency: number
          source_number_instance_id: string | null
          status_bucket: Database["public"]["Enums"]["revenue_status_bucket"]
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string
          estimated_ticket_value?: number | null
          first_seen_at?: string
          id?: string
          last_activity_at?: string
          last_intent_category?: string | null
          last_intent_subtype?: string | null
          name?: string | null
          notes?: string | null
          phone_e164: string
          risk_reason?: string | null
          risk_state?: Database["public"]["Enums"]["revenue_risk_state"]
          score_engagement?: number
          score_intent?: number
          score_last_calc_at?: string | null
          score_risk?: number
          score_total?: number
          score_urgency?: number
          source_number_instance_id?: string | null
          status_bucket?: Database["public"]["Enums"]["revenue_status_bucket"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string
          estimated_ticket_value?: number | null
          first_seen_at?: string
          id?: string
          last_activity_at?: string
          last_intent_category?: string | null
          last_intent_subtype?: string | null
          name?: string | null
          notes?: string | null
          phone_e164?: string
          risk_reason?: string | null
          risk_state?: Database["public"]["Enums"]["revenue_risk_state"]
          score_engagement?: number
          score_intent?: number
          score_last_calc_at?: string | null
          score_risk?: number
          score_total?: number
          score_urgency?: number
          source_number_instance_id?: string | null
          status_bucket?: Database["public"]["Enums"]["revenue_status_bucket"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_leads_source_number_instance_id_fkey"
            columns: ["source_number_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_number_config: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_number_config_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_reports: {
        Row: {
          created_at: string
          id: string
          report_data: Json
          report_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_data?: Json
          report_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_data?: Json
          report_date?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_score_logs: {
        Row: {
          category: string
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          lead_id: string
          points_applied: number
          score_after: number
          score_before: number
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          lead_id: string
          points_applied?: number
          score_after?: number
          score_before?: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          lead_id?: string
          points_applied?: number
          score_after?: number
          score_before?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_score_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "revenue_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_score_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "revenue_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_score_rules: {
        Row: {
          cooldown_minutes: number | null
          id: string
          is_enabled: boolean
          max_per_day: number | null
          points: number
          rule_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cooldown_minutes?: number | null
          id?: string
          is_enabled?: boolean
          max_per_day?: number | null
          points?: number
          rule_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cooldown_minutes?: number | null
          id?: string
          is_enabled?: boolean
          max_per_day?: number | null
          points?: number
          rule_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_score_snapshots: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          score_value: number
          snapshot_date: string
          status_bucket: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          score_value?: number
          snapshot_date?: string
          status_bucket?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          score_value?: number
          snapshot_date?: string
          status_bucket?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_score_snapshots_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "revenue_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_settings: {
        Row: {
          cooldown_decay_per_day: number
          created_at: string
          default_close_rate_cold: number
          default_close_rate_engaged: number
          default_close_rate_hot: number
          default_close_rate_very_hot: number
          default_ticket_value: number
          id: string
          risk_no_reply_hours: number
          sla_first_response_minutes: number
          updated_at: string
          user_id: string
          weight_engagement: number
          weight_intent: number
          weight_risk: number
          weight_urgency: number
        }
        Insert: {
          cooldown_decay_per_day?: number
          created_at?: string
          default_close_rate_cold?: number
          default_close_rate_engaged?: number
          default_close_rate_hot?: number
          default_close_rate_very_hot?: number
          default_ticket_value?: number
          id?: string
          risk_no_reply_hours?: number
          sla_first_response_minutes?: number
          updated_at?: string
          user_id: string
          weight_engagement?: number
          weight_intent?: number
          weight_risk?: number
          weight_urgency?: number
        }
        Update: {
          cooldown_decay_per_day?: number
          created_at?: string
          default_close_rate_cold?: number
          default_close_rate_engaged?: number
          default_close_rate_hot?: number
          default_close_rate_very_hot?: number
          default_ticket_value?: number
          id?: string
          risk_no_reply_hours?: number
          sla_first_response_minutes?: number
          updated_at?: string
          user_id?: string
          weight_engagement?: number
          weight_intent?: number
          weight_risk?: number
          weight_urgency?: number
        }
        Relationships: []
      }
      score_decay_config: {
        Row: {
          created_at: string
          id: string
          max_days: number
          min_days: number
          multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_days?: number
          min_days?: number
          multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_days?: number
          min_days?: number
          multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      score_rules: {
        Row: {
          apply_decay: boolean
          category: string
          created_at: string
          description: string | null
          event_name: string
          id: string
          is_active: boolean
          is_negative: boolean
          max_applications_per_period: number | null
          period_type: string | null
          points: number
          updated_at: string
        }
        Insert: {
          apply_decay?: boolean
          category: string
          created_at?: string
          description?: string | null
          event_name: string
          id?: string
          is_active?: boolean
          is_negative?: boolean
          max_applications_per_period?: number | null
          period_type?: string | null
          points?: number
          updated_at?: string
        }
        Update: {
          apply_decay?: boolean
          category?: string
          created_at?: string
          description?: string | null
          event_name?: string
          id?: string
          is_active?: boolean
          is_negative?: boolean
          max_applications_per_period?: number | null
          period_type?: string | null
          points?: number
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
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
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
      signup_fraud_allowlist: {
        Row: {
          created_at: string
          id: string
          identifier_hash: string
          note: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_hash: string
          note?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identifier_hash?: string
          note?: string | null
        }
        Relationships: []
      }
      subscription_cancellations: {
        Row: {
          active_until: string | null
          billing_type: string | null
          cancelled_at: string
          created_at: string
          id: string
          last_charge_date: string | null
          notes: string | null
          provider: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          active_until?: string | null
          billing_type?: string | null
          cancelled_at?: string
          created_at?: string
          id?: string
          last_charge_date?: string | null
          notes?: string | null
          provider?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          active_until?: string | null
          billing_type?: string | null
          cancelled_at?: string
          created_at?: string
          id?: string
          last_charge_date?: string | null
          notes?: string | null
          provider?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          carry_over: number | null
          created_at: string
          email: string
          event_source: string
          event_type: string
          id: string
          metadata: Json | null
          new_plan: string | null
          new_searches_limit: number | null
          previous_plan: string | null
          previous_searches_limit: number | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          carry_over?: number | null
          created_at?: string
          email: string
          event_source: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_plan?: string | null
          new_searches_limit?: number | null
          previous_plan?: string | null
          previous_searches_limit?: number | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          carry_over?: number | null
          created_at?: string
          email?: string
          event_source?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_plan?: string | null
          new_searches_limit?: number | null
          previous_plan?: string | null
          previous_searches_limit?: number | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_upgrades: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          from_billing_period: string | null
          from_plan: string
          id: string
          new_subscription_id: string | null
          old_subscription_id: string | null
          proration_credit_cents: number
          provider: string
          remaining_searches_carried: number
          status: string
          to_billing_period: string
          to_plan: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          from_billing_period?: string | null
          from_plan: string
          id?: string
          new_subscription_id?: string | null
          old_subscription_id?: string | null
          proration_credit_cents?: number
          provider?: string
          remaining_searches_carried?: number
          status?: string
          to_billing_period: string
          to_plan: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          from_billing_period?: string | null
          from_plan?: string
          id?: string
          new_subscription_id?: string | null
          old_subscription_id?: string | null
          proration_credit_cents?: number
          provider?: string
          remaining_searches_carried?: number
          status?: string
          to_billing_period?: string
          to_plan?: string
          user_id?: string
        }
        Relationships: []
      }
      support_incidents: {
        Row: {
          affected_users: number
          category: string | null
          created_at: string
          description: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          sample_ticket_ids: string[] | null
          signature: string | null
          status: string
          ticket_count: number
          title: string
          updated_at: string
        }
        Insert: {
          affected_users?: number
          category?: string | null
          created_at?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          sample_ticket_ids?: string[] | null
          signature?: string | null
          status?: string
          ticket_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          affected_users?: number
          category?: string | null
          created_at?: string
          description?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          sample_ticket_ids?: string[] | null
          signature?: string | null
          status?: string
          ticket_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          ticket_id: string
          was_helpful: boolean | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          ticket_id: string
          was_helpful?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          ticket_id?: string
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_cost_by_ticket"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          nps_comment: string | null
          nps_recommend: number | null
          nps_score: number | null
          resolved_by: string | null
          stars: number | null
          ticket_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          nps_comment?: string | null
          nps_recommend?: number | null
          nps_score?: number | null
          resolved_by?: string | null
          stars?: number | null
          ticket_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          nps_comment?: string | null
          nps_recommend?: number | null
          nps_score?: number | null
          resolved_by?: string | null
          stars?: number | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_cost_by_ticket"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "support_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_phase: string | null
          id: string
          metadata: Json | null
          ticket_id: string
          to_phase: string
          triggered_by: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_phase?: string | null
          id?: string
          metadata?: Json | null
          ticket_id: string
          to_phase: string
          triggered_by?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_phase?: string | null
          id?: string
          metadata?: Json | null
          ticket_id?: string
          to_phase?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_cost_by_ticket"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "support_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_history: {
        Row: {
          action_type: string
          attachments: Json
          author_id: string | null
          author_name: string | null
          content: string | null
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          action_type?: string
          attachments?: Json
          author_id?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          action_type?: string
          attachments?: Json
          author_id?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_cost_by_ticket"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "support_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_confidence: number | null
          ai_summary: string | null
          category: string | null
          conversation_summary: string | null
          created_at: string
          customer_type: string | null
          due_at: string | null
          email: string | null
          frustration_score: number
          id: string
          internal_notes: string | null
          is_manual: boolean
          name: string | null
          phase: string
          phone: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          summary_message_count: number
          ticket_number: string | null
          updated_at: string
          user_id: string | null
          visitor_session: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_summary?: string | null
          category?: string | null
          conversation_summary?: string | null
          created_at?: string
          customer_type?: string | null
          due_at?: string | null
          email?: string | null
          frustration_score?: number
          id?: string
          internal_notes?: string | null
          is_manual?: boolean
          name?: string | null
          phase?: string
          phone?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          summary_message_count?: number
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_session?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_summary?: string | null
          category?: string | null
          conversation_summary?: string | null
          created_at?: string
          customer_type?: string | null
          due_at?: string | null
          email?: string | null
          frustration_score?: number
          id?: string
          internal_notes?: string | null
          is_manual?: boolean
          name?: string | null
          phase?: string
          phone?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          summary_message_count?: number
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_session?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          alert_type: string
          category: string | null
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          occurrences: number | null
          period_end: string | null
          period_start: string | null
          resolved: boolean | null
          resolved_at: string | null
          title: string
        }
        Insert: {
          alert_type: string
          category?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          occurrences?: number | null
          period_end?: string | null
          period_start?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          category?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          occurrences?: number | null
          period_end?: string | null
          period_start?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          title?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      trial_activation_config: {
        Row: {
          config_key: string
          config_type: string
          config_value: Json
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_key: string
          config_type: string
          config_value?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_type?: string
          config_value?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      trial_automation_steps: {
        Row: {
          action_type: string
          automation_id: string
          condition: Json
          created_at: string
          delay_hours: number
          id: string
          step_order: number
          stop_condition: Json
          template_id: string | null
          updated_at: string
        }
        Insert: {
          action_type?: string
          automation_id: string
          condition?: Json
          created_at?: string
          delay_hours?: number
          id?: string
          step_order?: number
          stop_condition?: Json
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          automation_id?: string
          condition?: Json
          created_at?: string
          delay_hours?: number
          id?: string
          step_order?: number
          stop_condition?: Json
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_automation_steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "trial_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_automation_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "trial_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_automations: {
        Row: {
          automation_type: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          trigger_conditions: Json
          trigger_event: string
          updated_at: string
        }
        Insert: {
          automation_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          trigger_conditions?: Json
          trigger_event: string
          updated_at?: string
        }
        Update: {
          automation_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          trigger_conditions?: Json
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      trial_behaviour_trigger_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          trigger_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          trigger_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          trigger_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_behaviour_trigger_logs_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "trial_behaviour_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_behaviour_triggers: {
        Row: {
          conditions: Json
          cooldown_hours: number
          created_at: string
          description: string | null
          entry_rules: Json
          id: string
          name: string
          priority: number
          status: string
          stop_condition: Json
          success_condition: Json
          target_automation_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          entry_rules?: Json
          id?: string
          name: string
          priority?: number
          status?: string
          stop_condition?: Json
          success_condition?: Json
          target_automation_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          entry_rules?: Json
          id?: string
          name?: string
          priority?: number
          status?: string
          stop_condition?: Json
          success_condition?: Json
          target_automation_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_behaviour_triggers_target_automation_id_fkey"
            columns: ["target_automation_id"]
            isOneToOne: false
            referencedRelation: "trial_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_email_events: {
        Row: {
          automation_id: string | null
          created_at: string
          email_template_id: string | null
          event_type: string
          id: string
          metadata: Json
          step_id: string | null
          user_id: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          email_template_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          step_id?: string | null
          user_id: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          email_template_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          step_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_email_events_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "trial_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_email_events_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "trial_message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_email_events_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "trial_automation_steps"
            referencedColumns: ["id"]
          },
        ]
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
      trial_link_clicks: {
        Row: {
          automation_id: string | null
          clicked_at: string
          email_template_id: string | null
          id: string
          link_id: string | null
          redirect_url: string | null
          step_id: string | null
          user_id: string
        }
        Insert: {
          automation_id?: string | null
          clicked_at?: string
          email_template_id?: string | null
          id?: string
          link_id?: string | null
          redirect_url?: string | null
          step_id?: string | null
          user_id: string
        }
        Update: {
          automation_id?: string | null
          clicked_at?: string
          email_template_id?: string | null
          id?: string
          link_id?: string | null
          redirect_url?: string | null
          step_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_link_clicks_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "trial_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_link_clicks_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "trial_message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_link_clicks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "trial_automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      trial_product_events: {
        Row: {
          created_at: string
          event_name: string
          event_source: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          event_source?: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          event_source?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      trial_revenue_attribution: {
        Row: {
          automation_id: string | null
          created_at: string
          email_template_id: string | null
          id: string
          revenue_amount: number
          step_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          email_template_id?: string | null
          id?: string
          revenue_amount?: number
          step_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          email_template_id?: string | null
          id?: string
          revenue_amount?: number
          step_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_revenue_attribution_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "trial_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_revenue_attribution_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "trial_message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_revenue_attribution_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "trial_automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_user_automation_state: {
        Row: {
          automation_id: string
          completed_at: string | null
          created_at: string
          current_step_id: string | null
          entered_at: string
          id: string
          metadata: Json
          next_step_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_id: string
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          entered_at?: string
          id?: string
          metadata?: Json
          next_step_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_id?: string
          completed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          entered_at?: string
          id?: string
          metadata?: Json
          next_step_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_user_automation_state_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "trial_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_user_automation_state_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "trial_automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activation_progress: {
        Row: {
          activation_completed: boolean
          created_at: string
          dismissed: boolean
          first_activation_at: string | null
          id: string
          progress_percentage: number
          step_explore_ai_crm_completed: boolean
          step_first_campaign_completed: boolean
          step_prospect_clients_completed: boolean
          step_scheduled_campaign_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_completed?: boolean
          created_at?: string
          dismissed?: boolean
          first_activation_at?: string | null
          id?: string
          progress_percentage?: number
          step_explore_ai_crm_completed?: boolean
          step_first_campaign_completed?: boolean
          step_prospect_clients_completed?: boolean
          step_scheduled_campaign_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_completed?: boolean
          created_at?: string
          dismissed?: boolean
          first_activation_at?: string | null
          id?: string
          progress_percentage?: number
          step_explore_ai_crm_completed?: boolean
          step_first_campaign_completed?: boolean
          step_prospect_clients_completed?: boolean
          step_scheduled_campaign_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_agents: {
        Row: {
          ai_model: string
          ai_output_type: string
          ai_provider: string
          ai_routes: string | null
          created_at: string
          credential_id: string | null
          id: string
          max_chars: number
          name: string
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string
          ai_output_type?: string
          ai_provider?: string
          ai_routes?: string | null
          created_at?: string
          credential_id?: string | null
          id?: string
          max_chars?: number
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          ai_output_type?: string
          ai_provider?: string
          ai_routes?: string | null
          created_at?: string
          credential_id?: string | null
          id?: string
          max_chars?: number
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_agents_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "user_ai_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_credentials: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dismissed_popups: {
        Row: {
          dismissed_at: string
          id: string
          popup_key: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          popup_key: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          popup_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_drive_connections: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_active: boolean
          refresh_token: string | null
          root_folder_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          refresh_token?: string | null
          root_folder_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          refresh_token?: string | null
          root_folder_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
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
      user_google_tokens: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string
          scopes: string[] | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token: string
          scopes?: string[] | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          scopes?: string[] | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_landing_source: {
        Row: {
          created_at: string
          id: string
          landing_page_id: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page_id?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_page_id?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_landing_source_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding: {
        Row: {
          biggest_challenge: string | null
          completed_at: string | null
          created_at: string
          goal_90d: string | null
          id: string
          main_objective: string | null
          monthly_revenue: string | null
          previous_experience: string | null
          previous_tool: string | null
          role: string | null
          sales_method: string | null
          sales_team_size: string | null
          service_types: string[] | null
          skipped: boolean
          team_size: string | null
          tour_completed_at: string | null
          user_id: string
          user_profile: string | null
        }
        Insert: {
          biggest_challenge?: string | null
          completed_at?: string | null
          created_at?: string
          goal_90d?: string | null
          id?: string
          main_objective?: string | null
          monthly_revenue?: string | null
          previous_experience?: string | null
          previous_tool?: string | null
          role?: string | null
          sales_method?: string | null
          sales_team_size?: string | null
          service_types?: string[] | null
          skipped?: boolean
          team_size?: string | null
          tour_completed_at?: string | null
          user_id: string
          user_profile?: string | null
        }
        Update: {
          biggest_challenge?: string | null
          completed_at?: string | null
          created_at?: string
          goal_90d?: string | null
          id?: string
          main_objective?: string | null
          monthly_revenue?: string | null
          previous_experience?: string | null
          previous_tool?: string | null
          role?: string | null
          sales_method?: string | null
          sales_team_size?: string | null
          service_types?: string[] | null
          skipped?: boolean
          team_size?: string | null
          tour_completed_at?: string | null
          user_id?: string
          user_profile?: string | null
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
      user_score_events: {
        Row: {
          adjusted_points: number
          base_points: number
          created_at: string
          decay_multiplier: number
          event_category: string
          event_name: string
          event_occurred_at: string
          id: string
          metadata: Json | null
          source: string | null
          user_id: string
        }
        Insert: {
          adjusted_points?: number
          base_points?: number
          created_at?: string
          decay_multiplier?: number
          event_category: string
          event_name: string
          event_occurred_at?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id: string
        }
        Update: {
          adjusted_points?: number
          base_points?: number
          created_at?: string
          decay_multiplier?: number
          event_category?: string
          event_name?: string
          event_occurred_at?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_score_events_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_score_history: {
        Row: {
          created_at: string
          id: string
          new_score: number
          previous_score: number
          reason: string | null
          snapshot: Json | null
          user_id: string
          variation: number
        }
        Insert: {
          created_at?: string
          id?: string
          new_score?: number
          previous_score?: number
          reason?: string | null
          snapshot?: Json | null
          user_id: string
          variation?: number
        }
        Update: {
          created_at?: string
          id?: string
          new_score?: number
          previous_score?: number
          reason?: string | null
          snapshot?: Json | null
          user_id?: string
          variation?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_score_history_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scores: {
        Row: {
          activation_score: number
          churn_risk_score: number
          created_at: string
          engagement_score: number
          id: string
          last_calculated_at: string | null
          last_event_at: string | null
          normalized_score: number
          previous_score: number
          purchase_intent_score: number
          raw_score: number
          score_band: string
          score_label: string
          score_version: number
          total_score: number
          trend: string
          updated_at: string
          user_id: string
          value_score: number
        }
        Insert: {
          activation_score?: number
          churn_risk_score?: number
          created_at?: string
          engagement_score?: number
          id?: string
          last_calculated_at?: string | null
          last_event_at?: string | null
          normalized_score?: number
          previous_score?: number
          purchase_intent_score?: number
          raw_score?: number
          score_band?: string
          score_label?: string
          score_version?: number
          total_score?: number
          trend?: string
          updated_at?: string
          user_id: string
          value_score?: number
        }
        Update: {
          activation_score?: number
          churn_risk_score?: number
          created_at?: string
          engagement_score?: number
          id?: string
          last_calculated_at?: string | null
          last_event_at?: string | null
          normalized_score?: number
          previous_score?: number
          purchase_intent_score?: number
          raw_score?: number
          score_band?: string
          score_label?: string
          score_version?: number
          total_score?: number
          trend?: string
          updated_at?: string
          user_id?: string
          value_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_waba_connections: {
        Row: {
          access_token: string
          business_name: string | null
          created_at: string
          display_phone_number: string | null
          id: string
          nickname: string | null
          phone_number_id: string | null
          raw_signup_data: Json | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          waba_id: string
          webhook_verified_at: string | null
        }
        Insert: {
          access_token: string
          business_name?: string | null
          created_at?: string
          display_phone_number?: string | null
          id?: string
          nickname?: string | null
          phone_number_id?: string | null
          raw_signup_data?: Json | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          waba_id: string
          webhook_verified_at?: string | null
        }
        Update: {
          access_token?: string
          business_name?: string | null
          created_at?: string
          display_phone_number?: string | null
          id?: string
          nickname?: string | null
          phone_number_id?: string | null
          raw_signup_data?: Json | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          waba_id?: string
          webhook_verified_at?: string | null
        }
        Relationships: []
      }
      wa_automation_flows: {
        Row: {
          api_type: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          phone_number_id: string | null
          status: Database["public"]["Enums"]["wa_flow_status"]
          updated_at: string
          user_id: string
          version: number
          waba_connection_id: string | null
          whatsapp_number_id: string | null
        }
        Insert: {
          api_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["wa_flow_status"]
          updated_at?: string
          user_id: string
          version?: number
          waba_connection_id?: string | null
          whatsapp_number_id?: string | null
        }
        Update: {
          api_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["wa_flow_status"]
          updated_at?: string
          user_id?: string
          version?: number
          waba_connection_id?: string | null
          whatsapp_number_id?: string | null
        }
        Relationships: []
      }
      wa_flow_edges: {
        Row: {
          created_at: string
          flow_id: string
          id: string
          label: string | null
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
        }
        Insert: {
          created_at?: string
          flow_id: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
        }
        Update: {
          created_at?: string
          flow_id?: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "wa_automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_flow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "wa_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_flow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "wa_flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_flow_executions: {
        Row: {
          awaiting_input_until: string | null
          awaiting_node_id: string | null
          collected_data: Json | null
          completed_at: string | null
          created_at: string
          current_node_id: string | null
          current_node_name: string | null
          entry_data: Json | null
          exit_node_name: string | null
          flow_id: string
          id: string
          last_error: string | null
          lead_name: string | null
          lead_phone: string
          node_history: Json | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
          wait_until: string | null
        }
        Insert: {
          awaiting_input_until?: string | null
          awaiting_node_id?: string | null
          collected_data?: Json | null
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          current_node_name?: string | null
          entry_data?: Json | null
          exit_node_name?: string | null
          flow_id: string
          id?: string
          last_error?: string | null
          lead_name?: string | null
          lead_phone: string
          node_history?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          wait_until?: string | null
        }
        Update: {
          awaiting_input_until?: string | null
          awaiting_node_id?: string | null
          collected_data?: Json | null
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          current_node_name?: string | null
          entry_data?: Json | null
          exit_node_name?: string | null
          flow_id?: string
          id?: string
          last_error?: string | null
          lead_name?: string | null
          lead_phone?: string
          node_history?: Json | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          wait_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "wa_automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_flow_nodes: {
        Row: {
          config: Json | null
          created_at: string
          flow_id: string
          id: string
          name: string
          node_type: Database["public"]["Enums"]["wa_flow_node_type"]
          position_x: number
          position_y: number
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          flow_id: string
          id?: string
          name?: string
          node_type: Database["public"]["Enums"]["wa_flow_node_type"]
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          flow_id?: string
          id?: string
          name?: string
          node_type?: Database["public"]["Enums"]["wa_flow_node_type"]
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "wa_automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      warming_interactions: {
        Row: {
          ai_generated: boolean
          conversation_ended: boolean
          conversation_history: Json
          created_at: string
          id: string
          last_ai_error: string | null
          last_message_at: string | null
          last_message_sent: string | null
          last_response_at: string | null
          lead_diagnostic_snapshot: Json | null
          lead_id: string | null
          lead_name: string | null
          lead_phone: string
          messages_received: number
          messages_sent: number
          next_reply_at: string | null
          status: string
          updated_at: string
          user_id: string
          warming_level: number
          warming_session_id: string
        }
        Insert: {
          ai_generated?: boolean
          conversation_ended?: boolean
          conversation_history?: Json
          created_at?: string
          id?: string
          last_ai_error?: string | null
          last_message_at?: string | null
          last_message_sent?: string | null
          last_response_at?: string | null
          lead_diagnostic_snapshot?: Json | null
          lead_id?: string | null
          lead_name?: string | null
          lead_phone: string
          messages_received?: number
          messages_sent?: number
          next_reply_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warming_level: number
          warming_session_id: string
        }
        Update: {
          ai_generated?: boolean
          conversation_ended?: boolean
          conversation_history?: Json
          created_at?: string
          id?: string
          last_ai_error?: string | null
          last_message_at?: string | null
          last_message_sent?: string | null
          last_response_at?: string | null
          lead_diagnostic_snapshot?: Json | null
          lead_id?: string | null
          lead_name?: string | null
          lead_phone?: string
          messages_received?: number
          messages_sent?: number
          next_reply_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warming_level?: number
          warming_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warming_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_interactions_warming_session_id_fkey"
            columns: ["warming_session_id"]
            isOneToOne: false
            referencedRelation: "warming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      warming_search_assignments: {
        Row: {
          created_at: string
          id: string
          leads_count: number | null
          phone_key: string | null
          search_city: string | null
          search_query: string
          updated_at: string
          user_id: string
          warming_session_id: string | null
          whatsapp_number_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          leads_count?: number | null
          phone_key?: string | null
          search_city?: string | null
          search_query: string
          updated_at?: string
          user_id: string
          warming_session_id?: string | null
          whatsapp_number_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          leads_count?: number | null
          phone_key?: string | null
          search_city?: string | null
          search_query?: string
          updated_at?: string
          user_id?: string
          warming_session_id?: string | null
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warming_search_assignments_warming_session_id_fkey"
            columns: ["warming_session_id"]
            isOneToOne: false
            referencedRelation: "warming_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_search_assignments_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      warming_sessions: {
        Row: {
          agent_reply_limit: number | null
          ai_mode: boolean
          assigned_search_city: string | null
          assigned_search_query: string | null
          completed_at: string | null
          created_at: string
          current_day: number
          error_message: string | null
          id: string
          last_active_date: string | null
          last_message_at: string | null
          last_reset_date: string | null
          leads_limit: number
          leads_used: number
          messages_sent_today: number
          paused_at: string | null
          phone_key: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          warming_level: number
          warming_status: string
          whatsapp_number_id: string | null
        }
        Insert: {
          agent_reply_limit?: number | null
          ai_mode?: boolean
          assigned_search_city?: string | null
          assigned_search_query?: string | null
          completed_at?: string | null
          created_at?: string
          current_day?: number
          error_message?: string | null
          id?: string
          last_active_date?: string | null
          last_message_at?: string | null
          last_reset_date?: string | null
          leads_limit?: number
          leads_used?: number
          messages_sent_today?: number
          paused_at?: string | null
          phone_key?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warming_level?: number
          warming_status?: string
          whatsapp_number_id?: string | null
        }
        Update: {
          agent_reply_limit?: number | null
          ai_mode?: boolean
          assigned_search_city?: string | null
          assigned_search_query?: string | null
          completed_at?: string | null
          created_at?: string
          current_day?: number
          error_message?: string | null
          id?: string
          last_active_date?: string | null
          last_message_at?: string | null
          last_reset_date?: string | null
          leads_limit?: number
          leads_used?: number
          messages_sent_today?: number
          paused_at?: string | null
          phone_key?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warming_level?: number
          warming_status?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warming_sessions_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_secrets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          secret_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          secret_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          secret_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_campaigns: {
        Row: {
          accepted_window_terms: boolean | null
          completed_at: string | null
          created_at: string
          current_lead_index: number
          current_window: number | null
          delay_seconds: number
          delay_seconds_max: number
          enable_smart_pause: boolean
          failed_count: number
          first_10_no_response_count: number | null
          id: string
          is_first_stage: boolean | null
          last_message_sent_at: string | null
          leads: Json
          message_mode: string
          messages: Json
          name: string
          pause_after_contacts: number | null
          pause_minutes: number | null
          pause_reason: string | null
          paused_at_limit: boolean | null
          resume_at: string | null
          scheduled_at: string | null
          sent_count: number
          simulation_mode: boolean | null
          started_at: string | null
          status: string
          total_leads: number
          total_responses: number | null
          updated_at: string
          user_id: string
          whatsapp_number_id: string | null
          window_sent_count: number | null
          window_unlocked_at: string | null
        }
        Insert: {
          accepted_window_terms?: boolean | null
          completed_at?: string | null
          created_at?: string
          current_lead_index?: number
          current_window?: number | null
          delay_seconds?: number
          delay_seconds_max?: number
          enable_smart_pause?: boolean
          failed_count?: number
          first_10_no_response_count?: number | null
          id?: string
          is_first_stage?: boolean | null
          last_message_sent_at?: string | null
          leads?: Json
          message_mode?: string
          messages?: Json
          name: string
          pause_after_contacts?: number | null
          pause_minutes?: number | null
          pause_reason?: string | null
          paused_at_limit?: boolean | null
          resume_at?: string | null
          scheduled_at?: string | null
          sent_count?: number
          simulation_mode?: boolean | null
          started_at?: string | null
          status?: string
          total_leads?: number
          total_responses?: number | null
          updated_at?: string
          user_id: string
          whatsapp_number_id?: string | null
          window_sent_count?: number | null
          window_unlocked_at?: string | null
        }
        Update: {
          accepted_window_terms?: boolean | null
          completed_at?: string | null
          created_at?: string
          current_lead_index?: number
          current_window?: number | null
          delay_seconds?: number
          delay_seconds_max?: number
          enable_smart_pause?: boolean
          failed_count?: number
          first_10_no_response_count?: number | null
          id?: string
          is_first_stage?: boolean | null
          last_message_sent_at?: string | null
          leads?: Json
          message_mode?: string
          messages?: Json
          name?: string
          pause_after_contacts?: number | null
          pause_minutes?: number | null
          pause_reason?: string | null
          paused_at_limit?: boolean | null
          resume_at?: string | null
          scheduled_at?: string | null
          sent_count?: number
          simulation_mode?: boolean | null
          started_at?: string | null
          status?: string
          total_leads?: number
          total_responses?: number | null
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string | null
          window_sent_count?: number | null
          window_unlocked_at?: string | null
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
          api_tier: string
          created_at: string
          daily_sent_count: number
          id: string
          instance_name: string | null
          is_connected: boolean
          last_health_check_at: string | null
          last_sent_at: string | null
          name: string
          phone_number: string | null
          proxy_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_tier?: string
          created_at?: string
          daily_sent_count?: number
          id?: string
          instance_name?: string | null
          is_connected?: boolean
          last_health_check_at?: string | null
          last_sent_at?: string | null
          name: string
          phone_number?: string | null
          proxy_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_tier?: string
          created_at?: string
          daily_sent_count?: number
          id?: string
          instance_name?: string | null
          is_connected?: boolean
          last_health_check_at?: string | null
          last_sent_at?: string | null
          name?: string
          phone_number?: string | null
          proxy_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numbers_proxy_id_fkey"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_proxies: {
        Row: {
          assigned_numbers_count: number
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          host: string
          id: string
          is_blocked: boolean
          label: string | null
          last_used_at: string | null
          password: string | null
          port: string
          protocol: string
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          assigned_numbers_count?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          host: string
          id?: string
          is_blocked?: boolean
          label?: string | null
          last_used_at?: string | null
          password?: string | null
          port: string
          protocol?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          assigned_numbers_count?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          host?: string
          id?: string
          is_blocked?: boolean
          label?: string | null
          last_used_at?: string | null
          password?: string | null
          port?: string
          protocol?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      wian_tool_calls: {
        Row: {
          created_at: string
          error: string | null
          id: string
          params: Json
          success: boolean
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          params?: Json
          success?: boolean
          tool: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          params?: Json
          success?: boolean
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      wiize_message_templates: {
        Row: {
          archived: boolean
          body: string
          category_id: string | null
          created_at: string
          id: string
          language: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          body: string
          category_id?: string | null
          created_at?: string
          id?: string
          language?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          body?: string
          category_id?: string | null
          created_at?: string
          id?: string
          language?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiize_message_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wiize_template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      wiize_template_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      support_cost_by_category: {
        Row: {
          avg_cost_per_call: number | null
          category: string | null
          tickets: number | null
          total_cost_usd: number | null
        }
        Relationships: []
      }
      support_cost_by_ticket: {
        Row: {
          ai_calls: number | null
          category: string | null
          created_at: string | null
          customer_type: string | null
          phase: string | null
          ticket_id: string | null
          ticket_number: string | null
          total_cost_usd: number | null
          total_tokens_in: number | null
          total_tokens_out: number | null
          user_id: string | null
        }
        Relationships: []
      }
      support_cost_by_user: {
        Row: {
          tickets: number | null
          total_cost_usd: number | null
          total_tokens_in: number | null
          total_tokens_out: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_searches_limit: {
        Args: { p_new_limit: number; p_user_email: string }
        Returns: undefined
      }
      check_and_reset_monthly_searches: {
        Args: { user_id: string }
        Returns: Json
      }
      check_partner_self_referral: {
        Args: { p_partner_id: string; p_user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      check_signup_fraud: {
        Args: { p_fingerprint: string; p_ip: string }
        Returns: Json
      }
      check_signup_fraud_strict: {
        Args: { p_cpf?: string; p_fingerprint: string; p_ip: string }
        Returns: Json
      }
      claim_partner_goal_prize: { Args: { p_goal_id: string }; Returns: Json }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      compute_partner_balance: { Args: { p_partner_id: string }; Returns: Json }
      compute_partner_mrr: { Args: { p_partner_id: string }; Returns: number }
      generate_partner_referral_code: {
        Args: { p_full_name: string }
        Returns: string
      }
      get_landing_page_stats: {
        Args: never
        Returns: {
          landing_page_id: string
          page_views: number
          purchases: number
          signup_clicks: number
          signup_completed: number
          trial_no_upgrade: number
        }[]
      }
      get_landing_page_stats_filtered: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          landing_page_id: string
          page_views: number
          purchases: number
          signup_clicks: number
          signup_completed: number
          trial_no_upgrade: number
        }[]
      }
      get_partner_commission_percent: {
        Args: { p_partner_id: string }
        Returns: number
      }
      get_phone_key: { Args: { phone_input: string }; Returns: string }
      has_feature_access: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_user_blocked: { Args: { p_user_id: string }; Returns: boolean }
      log_security_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: { p_action: string; p_details?: Json; p_table_name: string }
        Returns: undefined
      }
      match_faqs: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          title: string
          video_url: string
        }[]
      }
      match_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          auto_escalate: boolean
          category: string
          id: string
          min_confidence: number
          pains: string
          severity: string
          similarity: number
          solution: string
          title: string
        }[]
      }
      normalize_brazilian_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      partner_application_pre_check: {
        Args: { p_cpf: string; p_email: string }
        Returns: Json
      }
      release_pending_commissions: { Args: never; Returns: number }
      request_partner_withdrawal: {
        Args: { p_amount_cents: number }
        Returns: Json
      }
      revenue_score_to_bucket: {
        Args: { p_score: number }
        Returns: Database["public"]["Enums"]["revenue_status_bucket"]
      }
      seed_revenue_score_rules: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      unaccent_simple: { Args: { input: string }; Returns: string }
      update_partner_goal_progress: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      verify_webhook_signature: {
        Args: { p_payload: string; p_secret_name: string; p_signature: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "partner"
      commission_status:
        | "pending"
        | "review"
        | "available"
        | "requested"
        | "paid"
        | "cancelled"
      email_status: "queued" | "sent" | "failed"
      email_type:
        | "CAMPAIGN_SCHEDULED_STARTED"
        | "WEEKLY_SUMMARY"
        | "NUMBER_DISCONNECTED"
        | "CAMPAIGN_FAILED_TO_START"
        | "ADMIN_BROADCAST"
        | "CAMPAIGN_COMPLETED"
        | "SUBSCRIPTION_RENEWAL"
        | "AGENT_HUMAN_HANDOFF"
        | "AGENT_OBJECTIVE_COMPLETED"
      partner_goal_prize_status: "not_claimed" | "requested" | "paid"
      partner_goal_status: "active" | "completed" | "expired" | "cancelled"
      partner_goal_type: "revenue" | "paid_clients" | "leads" | "mrr"
      partner_level: "bronze" | "silver" | "gold" | "platinum"
      partner_status: "active" | "inactive" | "blocked"
      revenue_risk_state: "OK" | "COOLING" | "AT_RISK"
      revenue_status_bucket: "COLD" | "ENGAGED" | "HOT" | "VERY_HOT"
      wa_flow_node_type:
        | "entry"
        | "message"
        | "buttons"
        | "condition"
        | "wait"
        | "action"
        | "handoff"
        | "end"
        | "ai_agent"
        | "data_collect"
        | "ab_test"
        | "random_split"
        | "google_sheets"
        | "google_calendar"
        | "gmail"
      wa_flow_status: "draft" | "active" | "paused" | "archived"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      app_role: ["admin", "moderator", "user", "partner"],
      commission_status: [
        "pending",
        "review",
        "available",
        "requested",
        "paid",
        "cancelled",
      ],
      email_status: ["queued", "sent", "failed"],
      email_type: [
        "CAMPAIGN_SCHEDULED_STARTED",
        "WEEKLY_SUMMARY",
        "NUMBER_DISCONNECTED",
        "CAMPAIGN_FAILED_TO_START",
        "ADMIN_BROADCAST",
        "CAMPAIGN_COMPLETED",
        "SUBSCRIPTION_RENEWAL",
        "AGENT_HUMAN_HANDOFF",
        "AGENT_OBJECTIVE_COMPLETED",
      ],
      partner_goal_prize_status: ["not_claimed", "requested", "paid"],
      partner_goal_status: ["active", "completed", "expired", "cancelled"],
      partner_goal_type: ["revenue", "paid_clients", "leads", "mrr"],
      partner_level: ["bronze", "silver", "gold", "platinum"],
      partner_status: ["active", "inactive", "blocked"],
      revenue_risk_state: ["OK", "COOLING", "AT_RISK"],
      revenue_status_bucket: ["COLD", "ENGAGED", "HOT", "VERY_HOT"],
      wa_flow_node_type: [
        "entry",
        "message",
        "buttons",
        "condition",
        "wait",
        "action",
        "handoff",
        "end",
        "ai_agent",
        "data_collect",
        "ab_test",
        "random_split",
        "google_sheets",
        "google_calendar",
        "gmail",
      ],
      wa_flow_status: ["draft", "active", "paused", "archived"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
