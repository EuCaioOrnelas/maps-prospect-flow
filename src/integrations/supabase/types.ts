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
          email: string | null
          id: string
          usage_level: string | null
          user_id: string
        }
        Insert: {
          additional_comments?: string | null
          cancellation_reason: string
          created_at?: string
          email?: string | null
          id?: string
          usage_level?: string | null
          user_id: string
        }
        Update: {
          additional_comments?: string | null
          cancellation_reason?: string
          created_at?: string
          email?: string | null
          id?: string
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
          checkout_completed: boolean
          checkout_completed_at: string | null
          checkout_started_at: string
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          plan_attempted: string
          stripe_session_id: string | null
          tax_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          checkout_completed?: boolean
          checkout_completed_at?: string | null
          checkout_started_at?: string
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          plan_attempted: string
          stripe_session_id?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          checkout_completed?: boolean
          checkout_completed_at?: string | null
          checkout_started_at?: string
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          plan_attempted?: string
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
          admin_assigned_plan: boolean
          avatar_url: string | null
          chat_onboarding_seen: boolean
          cpf: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          fraud_flags: Json | null
          id: string
          is_blocked: boolean | null
          last_searches_reset: string | null
          name: string | null
          payment_provider: string | null
          phone: string | null
          plan: string
          searches_limit: number
          searches_used: number
          signup_ip: string | null
          subscription_current_period_end: string | null
          terms_accepted_at: string | null
          trial_messages_sent: number | null
          trial_start_at: string | null
          updated_at: string
        }
        Insert: {
          admin_assigned_plan?: boolean
          avatar_url?: string | null
          chat_onboarding_seen?: boolean
          cpf?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          fraud_flags?: Json | null
          id: string
          is_blocked?: boolean | null
          last_searches_reset?: string | null
          name?: string | null
          payment_provider?: string | null
          phone?: string | null
          plan?: string
          searches_limit?: number
          searches_used?: number
          signup_ip?: string | null
          subscription_current_period_end?: string | null
          terms_accepted_at?: string | null
          trial_messages_sent?: number | null
          trial_start_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_assigned_plan?: boolean
          avatar_url?: string | null
          chat_onboarding_seen?: boolean
          cpf?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          fraud_flags?: Json | null
          id?: string
          is_blocked?: boolean | null
          last_searches_reset?: string | null
          name?: string | null
          payment_provider?: string | null
          phone?: string | null
          plan?: string
          searches_limit?: number
          searches_used?: number
          signup_ip?: string | null
          subscription_current_period_end?: string | null
          terms_accepted_at?: string | null
          trial_messages_sent?: number | null
          trial_start_at?: string | null
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
          conversation_ended: boolean
          created_at: string
          id: string
          last_message_at: string | null
          last_message_sent: string | null
          last_response_at: string | null
          lead_id: string | null
          lead_name: string | null
          lead_phone: string
          messages_received: number
          messages_sent: number
          status: string
          updated_at: string
          user_id: string
          warming_level: number
          warming_session_id: string
        }
        Insert: {
          conversation_ended?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_sent?: string | null
          last_response_at?: string | null
          lead_id?: string | null
          lead_name?: string | null
          lead_phone: string
          messages_received?: number
          messages_sent?: number
          status?: string
          updated_at?: string
          user_id: string
          warming_level: number
          warming_session_id: string
        }
        Update: {
          conversation_ended?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_sent?: string | null
          last_response_at?: string | null
          lead_id?: string | null
          lead_name?: string | null
          lead_phone?: string
          messages_received?: number
          messages_sent?: number
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
    }
    Views: {
      [_ in never]: never
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
      cleanup_rate_limits: { Args: never; Returns: undefined }
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
      get_phone_key: { Args: { phone_input: string }; Returns: string }
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
      normalize_brazilian_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      revenue_score_to_bucket: {
        Args: { p_score: number }
        Returns: Database["public"]["Enums"]["revenue_status_bucket"]
      }
      seed_revenue_score_rules: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      verify_webhook_signature: {
        Args: { p_payload: string; p_secret_name: string; p_signature: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      wa_flow_status: "draft" | "active" | "paused" | "archived"
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
      ],
      wa_flow_status: ["draft", "active", "paused", "archived"],
    },
  },
} as const
