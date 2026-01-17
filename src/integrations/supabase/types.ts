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
        }
        Insert: {
          agent_id: string
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
        }
        Update: {
          agent_id?: string
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
          status: string
          system_prompt: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          agent_objective?: string | null
          communication_style?: string
          created_at?: string
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
          status?: string
          system_prompt?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          agent_objective?: string | null
          communication_style?: string
          created_at?: string
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
          status?: string
          system_prompt?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string | null
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
      contacts: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          notes: string | null
          origin: string | null
          phone: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          origin?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          avatar_url: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          group_name: string | null
          id: string
          is_archived: boolean
          is_group: boolean | null
          last_message: string | null
          last_message_at: string | null
          manually_marked_unread: boolean | null
          phone: string
          pinned_at: string | null
          remote_jid: string
          unread_count: number
          updated_at: string
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          group_name?: string | null
          id?: string
          is_archived?: boolean
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          manually_marked_unread?: boolean | null
          phone: string
          pinned_at?: string | null
          remote_jid: string
          unread_count?: number
          updated_at?: string
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          group_name?: string | null
          id?: string
          is_archived?: boolean
          is_group?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          manually_marked_unread?: boolean | null
          phone?: string
          pinned_at?: string | null
          remote_jid?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_member_avatars: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          phone?: string
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
          ai_score: number | null
          category: string | null
          city: string | null
          company_name: string | null
          contact_id: string | null
          contact_name: string | null
          conversation_id: string | null
          created_at: string
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
          origin: string | null
          phone: string
          pipeline_stage_id: string | null
          prospected_at: string | null
          region: string | null
          responded_at: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp_number_id: string | null
          whatsapp_status: string | null
        }
        Insert: {
          ai_score?: number | null
          category?: string | null
          city?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
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
          origin?: string | null
          phone: string
          pipeline_stage_id?: string | null
          prospected_at?: string | null
          region?: string | null
          responded_at?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp_number_id?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          ai_score?: number | null
          category?: string | null
          city?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
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
          origin?: string | null
          phone?: string
          pipeline_stage_id?: string | null
          prospected_at?: string | null
          region?: string | null
          responded_at?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp_number_id?: string | null
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
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
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          from_me: boolean
          id: string
          interactive: Json | null
          media_filename: string | null
          media_mimetype: string | null
          media_url: string | null
          message_id: string | null
          message_type: string
          quoted_message_id: string | null
          remote_jid: string
          sender_jid: string | null
          sender_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          from_me?: boolean
          id?: string
          interactive?: Json | null
          media_filename?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          quoted_message_id?: string | null
          remote_jid: string
          sender_jid?: string | null
          sender_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          from_me?: boolean
          id?: string
          interactive?: Json | null
          media_filename?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string
          quoted_message_id?: string | null
          remote_jid?: string
          sender_jid?: string | null
          sender_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          fraud_flags: Json | null
          id: string
          is_blocked: boolean | null
          last_searches_reset: string | null
          name: string | null
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
          avatar_url?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          fraud_flags?: Json | null
          id: string
          is_blocked?: boolean | null
          last_searches_reset?: string | null
          name?: string | null
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
          avatar_url?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          fraud_flags?: Json | null
          id?: string
          is_blocked?: boolean | null
          last_searches_reset?: string | null
          name?: string | null
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
      quick_replies: {
        Row: {
          audio_url: string | null
          created_at: string
          delay_seconds: number | null
          id: string
          image_url: string | null
          name: string
          tag: string
          text_content: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          delay_seconds?: number | null
          id?: string
          image_url?: string | null
          name: string
          tag: string
          text_content?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          delay_seconds?: number | null
          id?: string
          image_url?: string | null
          name?: string
          tag?: string
          text_content?: string | null
          updated_at?: string
          user_id?: string
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
          search_city: string | null
          search_query: string
          updated_at: string
          user_id: string
          warming_session_id: string | null
          whatsapp_number_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leads_count?: number | null
          search_city?: string | null
          search_query: string
          updated_at?: string
          user_id: string
          warming_session_id?: string | null
          whatsapp_number_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leads_count?: number | null
          search_city?: string | null
          search_query?: string
          updated_at?: string
          user_id?: string
          warming_session_id?: string | null
          whatsapp_number_id?: string
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
          last_message_at: string | null
          last_reset_date: string | null
          leads_limit: number
          leads_used: number
          messages_sent_today: number
          paused_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          warming_level: number
          warming_status: string
          whatsapp_number_id: string
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
          last_message_at?: string | null
          last_reset_date?: string | null
          leads_limit?: number
          leads_used?: number
          messages_sent_today?: number
          paused_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warming_level?: number
          warming_status?: string
          whatsapp_number_id: string
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
          last_message_at?: string | null
          last_reset_date?: string | null
          leads_limit?: number
          leads_used?: number
          messages_sent_today?: number
          paused_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warming_level?: number
          warming_status?: string
          whatsapp_number_id?: string
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
      normalize_brazilian_phone: {
        Args: { phone_input: string }
        Returns: string
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
