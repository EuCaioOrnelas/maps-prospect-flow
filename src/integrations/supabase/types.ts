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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          owner_user_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          owner_user_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          owner_user_id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      account_members: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          last_login_at: string | null
          must_change_password: boolean
          name: string | null
          owner_user_id: string
          role: Database["public"]["Enums"]["account_role"]
          status: Database["public"]["Enums"]["account_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean
          name?: string | null
          owner_user_id: string
          role?: Database["public"]["Enums"]["account_role"]
          status?: Database["public"]["Enums"]["account_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          must_change_password?: boolean
          name?: string | null
          owner_user_id?: string
          role?: Database["public"]["Enums"]["account_role"]
          status?: Database["public"]["Enums"]["account_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          owner_user_id: string | null
          process_after: string | null
          reply_content: string | null
          reply_count: number | null
          reply_sent: boolean
          reply_sent_at: string | null
          response_content: string | null
          response_received: boolean
          response_received_at: string | null
          responsible_user_id: string | null
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
          owner_user_id?: string | null
          process_after?: string | null
          reply_content?: string | null
          reply_count?: number | null
          reply_sent?: boolean
          reply_sent_at?: string | null
          response_content?: string | null
          response_received?: boolean
          response_received_at?: string | null
          responsible_user_id?: string | null
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
          owner_user_id?: string | null
          process_after?: string | null
          reply_content?: string | null
          reply_count?: number | null
          reply_sent?: boolean
          reply_sent_at?: string | null
          response_content?: string | null
          response_received?: boolean
          response_received_at?: string | null
          responsible_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
      ai_usage_logs: {
        Row: {
          cost_usd: number
          created_at: string
          feature: string
          id: string
          metadata: Json
          model: string
          tokens_in: number
          tokens_out: number
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          feature: string
          id?: string
          metadata?: Json
          model: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json
          model?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ai_workforce: {
        Row: {
          avatar_url: string | null
          channel: string
          config: Json
          created_at: string
          description: string | null
          id: string
          language: string
          model: string
          name: string
          persona: string | null
          role: string | null
          status: string
          temperature: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          channel?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          model?: string
          name: string
          persona?: string | null
          role?: string | null
          status?: string
          temperature?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          channel?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          language?: string
          model?: string
          name?: string
          persona?: string | null
          role?: string | null
          status?: string
          temperature?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_workforce_canvas: {
        Row: {
          edges: Json
          id: string
          nodes: Json
          updated_at: string
          viewport: Json
          workforce_id: string
        }
        Insert: {
          edges?: Json
          id?: string
          nodes?: Json
          updated_at?: string
          viewport?: Json
          workforce_id: string
        }
        Update: {
          edges?: Json
          id?: string
          nodes?: Json
          updated_at?: string
          viewport?: Json
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_canvas_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_data_schema: {
        Row: {
          field_key: string
          field_label: string
          field_type: string
          id: string
          order_index: number
          required: boolean
          validation: Json
          workforce_id: string
        }
        Insert: {
          field_key: string
          field_label: string
          field_type?: string
          id?: string
          order_index?: number
          required?: boolean
          validation?: Json
          workforce_id: string
        }
        Update: {
          field_key?: string
          field_label?: string
          field_type?: string
          id?: string
          order_index?: number
          required?: boolean
          validation?: Json
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_data_schema_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_decisions: {
        Row: {
          id: string
          tree: Json
          updated_at: string
          workforce_id: string
        }
        Insert: {
          id?: string
          tree?: Json
          updated_at?: string
          workforce_id: string
        }
        Update: {
          id?: string
          tree?: Json
          updated_at?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_decisions_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_execution_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string
          execution_id: string
          id: string
          payload: Json
          phase: string
          step: number
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          execution_id: string
          id?: string
          payload?: Json
          phase: string
          step?: number
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          execution_id?: string
          id?: string
          payload?: Json
          phase?: string
          step?: number
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_executions: {
        Row: {
          attempts: number
          channel: string
          collected_data: Json
          completion_reason: string | null
          conversation_id: string | null
          finished_at: string | null
          goal_state: Json
          id: string
          lead_id: string | null
          started_at: string
          status: string
          user_id: string
          workforce_id: string
        }
        Insert: {
          attempts?: number
          channel?: string
          collected_data?: Json
          completion_reason?: string | null
          conversation_id?: string | null
          finished_at?: string | null
          goal_state?: Json
          id?: string
          lead_id?: string | null
          started_at?: string
          status?: string
          user_id: string
          workforce_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          collected_data?: Json
          completion_reason?: string | null
          conversation_id?: string | null
          finished_at?: string | null
          goal_state?: Json
          id?: string
          lead_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_executions_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_goals: {
        Row: {
          created_at: string
          description: string | null
          failure_criteria: Json
          id: string
          is_primary: boolean
          max_attempts: number
          order_index: number
          success_criteria: Json
          title: string
          workforce_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          failure_criteria?: Json
          id?: string
          is_primary?: boolean
          max_attempts?: number
          order_index?: number
          success_criteria?: Json
          title: string
          workforce_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          failure_criteria?: Json
          id?: string
          is_primary?: boolean
          max_attempts?: number
          order_index?: number
          success_criteria?: Json
          title?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_goals_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_knowledge: {
        Row: {
          content: string | null
          created_at: string
          id: string
          indexed: boolean
          metadata: Json
          source_type: string
          source_url: string | null
          title: string
          workforce_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          indexed?: boolean
          metadata?: Json
          source_type: string
          source_url?: string | null
          title: string
          workforce_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          indexed?: boolean
          metadata?: Json
          source_type?: string
          source_url?: string | null
          title?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_knowledge_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_outcomes: {
        Row: {
          collected_data: Json
          created_at: string
          execution_id: string
          id: string
          interest_level: string | null
          lead_score: number | null
          next_action: string | null
          outcome: string
          summary: string | null
          user_id: string
          workforce_id: string
        }
        Insert: {
          collected_data?: Json
          created_at?: string
          execution_id: string
          id?: string
          interest_level?: string | null
          lead_score?: number | null
          next_action?: string | null
          outcome: string
          summary?: string | null
          user_id: string
          workforce_id: string
        }
        Update: {
          collected_data?: Json
          created_at?: string
          execution_id?: string
          id?: string
          interest_level?: string | null
          lead_score?: number | null
          next_action?: string | null
          outcome?: string
          summary?: string | null
          user_id?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_outcomes_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_workforce_outcomes_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          priority: number
          rule: string
          workforce_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          priority?: number
          rule: string
          workforce_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          priority?: number
          rule?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_rules_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_templates: {
        Row: {
          blueprint: Json
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          install_count: number
          name: string
          updated_at: string
          visibility: string
        }
        Insert: {
          blueprint?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          install_count?: number
          name: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          blueprint?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          install_count?: number
          name?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      ai_workforce_test_conversations: {
        Row: {
          created_at: string
          id: string
          message_count: number
          title: string | null
          updated_at: string
          user_id: string
          workforce_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
          workforce_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_test_conversations_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_test_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
          workforce_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
          workforce_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_test_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce_test_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_tools: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          permissions: Json
          tool_key: string
          workforce_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          permissions?: Json
          tool_key: string
          workforce_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          permissions?: Json
          tool_key?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_tools_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workforce_versions: {
        Row: {
          created_at: string
          edges: Json
          id: string
          name: string
          nodes: Json
          notes: string | null
          user_id: string
          workforce_id: string
        }
        Insert: {
          created_at?: string
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          notes?: string | null
          user_id: string
          workforce_id: string
        }
        Update: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          notes?: string | null
          user_id?: string
          workforce_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_workforce_versions_workforce_id_fkey"
            columns: ["workforce_id"]
            isOneToOne: false
            referencedRelation: "ai_workforce"
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
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_attributions: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          post_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          post_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          post_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_attributions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          ai_entities: string[] | null
          ai_questions: Json | null
          ai_related_topics: string[] | null
          ai_short_answer: string | null
          ai_summary: string | null
          author_avatar_url: string | null
          author_bio: string | null
          author_name: string
          canonical_url: string | null
          category_id: string | null
          content: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          faq: Json | null
          featured: boolean
          id: string
          like_count: number
          og_image_url: string | null
          published_at: string | null
          reading_time_minutes: number | null
          robots_follow: boolean
          robots_index: boolean
          scheduled_for: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_entities?: string[] | null
          ai_questions?: Json | null
          ai_related_topics?: string[] | null
          ai_short_answer?: string | null
          ai_summary?: string | null
          author_avatar_url?: string | null
          author_bio?: string | null
          author_name?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          faq?: Json | null
          featured?: boolean
          id?: string
          like_count?: number
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          robots_follow?: boolean
          robots_index?: boolean
          scheduled_for?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_entities?: string[] | null
          ai_questions?: Json | null
          ai_related_topics?: string[] | null
          ai_short_answer?: string | null
          ai_summary?: string | null
          author_avatar_url?: string | null
          author_bio?: string | null
          author_name?: string
          canonical_url?: string | null
          category_id?: string | null
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          faq?: Json | null
          featured?: boolean
          id?: string
          like_count?: number
          og_image_url?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          robots_follow?: boolean
          robots_index?: boolean
          scheduled_for?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      calendar_email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          event_id: string | null
          id: string
          owner_user_id: string
          provider_message_id: string | null
          recipient_email: string | null
          recipient_role: string | null
          reminder_key: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          owner_user_id: string
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_role?: string | null
          reminder_key?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          owner_user_id?: string
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_role?: string | null
          reminder_key?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_user_id: string
          company_name: string | null
          conference_provider: string | null
          conference_url: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          event_type: Database["public"]["Enums"]["calendar_event_type"]
          external_calendar_provider: string | null
          external_event_id: string | null
          id: string
          lead_id: string | null
          lead_origin: string | null
          location: string | null
          metadata: Json
          notes: string | null
          owner_user_id: string
          reminder_sent_at: string | null
          reminders: Json
          sdr_agent_id: string | null
          source: Database["public"]["Enums"]["calendar_event_source"]
          starts_at: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_user_id: string
          company_name?: string | null
          conference_provider?: string | null
          conference_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          external_calendar_provider?: string | null
          external_event_id?: string | null
          id?: string
          lead_id?: string | null
          lead_origin?: string | null
          location?: string | null
          metadata?: Json
          notes?: string | null
          owner_user_id: string
          reminder_sent_at?: string | null
          reminders?: Json
          sdr_agent_id?: string | null
          source?: Database["public"]["Enums"]["calendar_event_source"]
          starts_at: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_user_id?: string
          company_name?: string | null
          conference_provider?: string | null
          conference_url?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          event_type?: Database["public"]["Enums"]["calendar_event_type"]
          external_calendar_provider?: string | null
          external_event_id?: string | null
          id?: string
          lead_id?: string | null
          lead_origin?: string | null
          location?: string | null
          metadata?: Json
          notes?: string | null
          owner_user_id?: string
          reminder_sent_at?: string | null
          reminders?: Json
          sdr_agent_id?: string | null
          source?: Database["public"]["Enums"]["calendar_event_source"]
          starts_at?: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_google_sync: {
        Row: {
          calendar_id: string
          calendar_name: string | null
          created_at: string
          default_event_type: string
          google_email: string | null
          google_token_id: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          owner_user_id: string | null
          pull_all_calendars: boolean
          pull_enabled: boolean
          push_enabled: boolean
          reminder_enabled: boolean
          reminder_minutes: number
          sync_enabled: boolean
          sync_window_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          default_event_type?: string
          google_email?: string | null
          google_token_id?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          owner_user_id?: string | null
          pull_all_calendars?: boolean
          pull_enabled?: boolean
          push_enabled?: boolean
          reminder_enabled?: boolean
          reminder_minutes?: number
          sync_enabled?: boolean
          sync_window_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          default_event_type?: string
          google_email?: string | null
          google_token_id?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          owner_user_id?: string | null
          pull_all_calendars?: boolean
          pull_enabled?: boolean
          push_enabled?: boolean
          reminder_enabled?: boolean
          reminder_minutes?: number
          sync_enabled?: boolean
          sync_window_days?: number
          updated_at?: string
          user_id?: string
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
      chat_ai_summary_usage: {
        Row: {
          count: number
          created_at: string
          day: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_auto_replies: {
        Row: {
          created_at: string
          enabled: boolean
          end_time: string
          id: string
          message: string
          once_per_day: boolean
          start_time: string
          timezone: string
          updated_at: string
          user_id: string
          waba_connection_id: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          end_time?: string
          id?: string
          message?: string
          once_per_day?: boolean
          start_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
          waba_connection_id: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          enabled?: boolean
          end_time?: string
          id?: string
          message?: string
          once_per_day?: boolean
          start_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          waba_connection_id?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "chat_auto_replies_waba_connection_id_fkey"
            columns: ["waba_connection_id"]
            isOneToOne: true
            referencedRelation: "user_waba_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversation_summaries: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_count: number
          summary: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_count?: number
          summary: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_count?: number
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          contact_name: string | null
          contact_phone: string
          contact_profile_pic: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          is_blocked: boolean
          is_muted: boolean | null
          is_pinned: boolean | null
          last_auto_reply_at: string | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_status: string | null
          last_message_text: string | null
          last_message_type: string | null
          owner_user_id: string | null
          phone_number_id: string | null
          pinned_at: string | null
          responsible_user_id: string | null
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
          is_blocked?: boolean
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_auto_reply_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_status?: string | null
          last_message_text?: string | null
          last_message_type?: string | null
          owner_user_id?: string | null
          phone_number_id?: string | null
          pinned_at?: string | null
          responsible_user_id?: string | null
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
          is_blocked?: boolean
          is_muted?: boolean | null
          is_pinned?: boolean | null
          last_auto_reply_at?: string | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_status?: string | null
          last_message_text?: string | null
          last_message_type?: string | null
          owner_user_id?: string | null
          phone_number_id?: string | null
          pinned_at?: string | null
          responsible_user_id?: string | null
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
          billing_amount: number | null
          billing_category: string | null
          billing_currency: string | null
          billing_source: string | null
          content: string | null
          conversation_id: string
          created_at: string
          deleted_for_all_at: string | null
          direction: string
          id: string
          media_caption: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string
          metadata: Json | null
          owner_user_id: string | null
          pricing_model: string | null
          reply_to_message_id: string | null
          status: string | null
          status_updated_at: string | null
          user_id: string
          waba_message_id: string | null
        }
        Insert: {
          billing_amount?: number | null
          billing_category?: string | null
          billing_currency?: string | null
          billing_source?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_for_all_at?: string | null
          direction: string
          id?: string
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          owner_user_id?: string | null
          pricing_model?: string | null
          reply_to_message_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          user_id: string
          waba_message_id?: string | null
        }
        Update: {
          billing_amount?: number | null
          billing_category?: string | null
          billing_currency?: string | null
          billing_source?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_for_all_at?: string | null
          direction?: string
          id?: string
          media_caption?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          owner_user_id?: string | null
          pricing_model?: string | null
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
      chat_quick_replies: {
        Row: {
          account_owner_id: string
          content: string
          created_at: string
          created_by_user_id: string
          id: string
          media_filename: string | null
          media_type: string | null
          media_url: string | null
          shortcut: string
          title: string | null
          updated_at: string
        }
        Insert: {
          account_owner_id: string
          content?: string
          created_at?: string
          created_by_user_id: string
          id?: string
          media_filename?: string | null
          media_type?: string | null
          media_url?: string | null
          shortcut: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          account_owner_id?: string
          content?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          media_filename?: string | null
          media_type?: string | null
          media_url?: string | null
          shortcut?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkout_leads: {
        Row: {
          address: string | null
          address_number: string | null
          asaas_authorization_id: string | null
          asaas_conciliation_id: string | null
          asaas_payment_id: string | null
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
          asaas_authorization_id?: string | null
          asaas_conciliation_id?: string | null
          asaas_payment_id?: string | null
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
          asaas_authorization_id?: string | null
          asaas_conciliation_id?: string | null
          asaas_payment_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_ticket?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_ticket?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
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
      crm_appointment_email_settings: {
        Row: {
          button_color: string
          created_at: string
          cta_label: string
          email_body: string
          email_title: string
          enabled: boolean
          header_color: string
          logo_url: string | null
          notify_client: boolean
          owner_user_id: string
          sender_local_part: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          button_color?: string
          created_at?: string
          cta_label?: string
          email_body?: string
          email_title?: string
          enabled?: boolean
          header_color?: string
          logo_url?: string | null
          notify_client?: boolean
          owner_user_id: string
          sender_local_part?: string
          sender_name?: string
          updated_at?: string
        }
        Update: {
          button_color?: string
          created_at?: string
          cta_label?: string
          email_body?: string
          email_title?: string
          enabled?: boolean
          header_color?: string
          logo_url?: string | null
          notify_client?: boolean
          owner_user_id?: string
          sender_local_part?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_renewal_notice_logs: {
        Row: {
          created_at: string
          deal_id: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          notice_type: string
          owner_user_id: string
          provider_message_id: string | null
          recipient_email: string | null
          recipient_role: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          notice_type: string
          owner_user_id: string
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_role?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          notice_type?: string
          owner_user_id?: string
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_role?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_renewal_notice_logs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "lead_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_renewal_settings: {
        Row: {
          button_color: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          cta_label: string
          email_intro: string
          email_title: string
          enabled: boolean
          header_color: string
          logo_url: string | null
          notice_days_4_6_months: number | null
          owner_user_id: string
          sender_local_part: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          button_color?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          cta_label?: string
          email_intro?: string
          email_title?: string
          enabled?: boolean
          header_color?: string
          logo_url?: string | null
          notice_days_4_6_months?: number | null
          owner_user_id: string
          sender_local_part?: string
          sender_name?: string
          updated_at?: string
        }
        Update: {
          button_color?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          cta_label?: string
          email_intro?: string
          email_title?: string
          enabled?: boolean
          header_color?: string
          logo_url?: string | null
          notice_days_4_6_months?: number | null
          owner_user_id?: string
          sender_local_part?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
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
      email_optout_tokens: {
        Row: {
          created_at: string
          email: string
          prospect_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          prospect_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          prospect_id?: string | null
          token?: string
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
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          prospect_id: string | null
          reason: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          prospect_id?: string | null
          reason?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          prospect_id?: string | null
          reason?: string
          source?: string
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
      followup_enrollments: {
        Row: {
          campaign_id: string | null
          context: Json
          created_at: string
          created_by: string | null
          current_step: number
          email: string
          end_reason: string | null
          ended_at: string | null
          first_body: string | null
          first_subject: string | null
          fit_level: string
          id: string
          last_sent_at: string | null
          max_steps: number
          memory: Json
          messages_sent: number
          next_run_at: string | null
          prospect_id: string | null
          recipient_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          context?: Json
          created_at?: string
          created_by?: string | null
          current_step?: number
          email: string
          end_reason?: string | null
          ended_at?: string | null
          first_body?: string | null
          first_subject?: string | null
          fit_level?: string
          id?: string
          last_sent_at?: string | null
          max_steps?: number
          memory?: Json
          messages_sent?: number
          next_run_at?: string | null
          prospect_id?: string | null
          recipient_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          context?: Json
          created_at?: string
          created_by?: string | null
          current_step?: number
          email?: string
          end_reason?: string | null
          ended_at?: string | null
          first_body?: string | null
          first_subject?: string | null
          fit_level?: string
          id?: string
          last_sent_at?: string | null
          max_steps?: number
          memory?: Json
          messages_sent?: number
          next_run_at?: string | null
          prospect_id?: string | null
          recipient_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      followup_events: {
        Row: {
          action: string
          created_at: string
          enrollment_id: string | null
          id: string
          payload: Json
          prospect_id: string | null
          reason: string | null
          step: number | null
        }
        Insert: {
          action: string
          created_at?: string
          enrollment_id?: string | null
          id?: string
          payload?: Json
          prospect_id?: string | null
          reason?: string | null
          step?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          enrollment_id?: string | null
          id?: string
          payload?: Json
          prospect_id?: string | null
          reason?: string | null
          step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "followup_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_sends: {
        Row: {
          enrollment_id: string
          provider_message_id: string | null
          sent_at: string
          step: number
        }
        Insert: {
          enrollment_id: string
          provider_message_id?: string | null
          sent_at?: string
          step: number
        }
        Update: {
          enrollment_id?: string
          provider_message_id?: string | null
          sent_at?: string
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "followup_sends_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "followup_enrollments"
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
      handoff_assignments: {
        Row: {
          account_owner_id: string
          assigned_at: string | null
          assigned_member_id: string | null
          attempts: Json
          closed_at: string | null
          conversation_id: string | null
          created_at: string
          distribution_type: string
          execution_id: string | null
          expires_at: string | null
          first_response_at: string | null
          flow_id: string | null
          id: string
          lead_phone: string | null
          max_wait_seconds: number | null
          no_agents_actions: string[]
          no_agents_message: string | null
          node_id: string | null
          post_message: string | null
          pre_message: string | null
          queued_at: string | null
          redirect_flow_id: string | null
          status: string
          team_member_ids: string[]
          updated_at: string
        }
        Insert: {
          account_owner_id: string
          assigned_at?: string | null
          assigned_member_id?: string | null
          attempts?: Json
          closed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          distribution_type?: string
          execution_id?: string | null
          expires_at?: string | null
          first_response_at?: string | null
          flow_id?: string | null
          id?: string
          lead_phone?: string | null
          max_wait_seconds?: number | null
          no_agents_actions?: string[]
          no_agents_message?: string | null
          node_id?: string | null
          post_message?: string | null
          pre_message?: string | null
          queued_at?: string | null
          redirect_flow_id?: string | null
          status?: string
          team_member_ids?: string[]
          updated_at?: string
        }
        Update: {
          account_owner_id?: string
          assigned_at?: string | null
          assigned_member_id?: string | null
          attempts?: Json
          closed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          distribution_type?: string
          execution_id?: string | null
          expires_at?: string | null
          first_response_at?: string | null
          flow_id?: string | null
          id?: string
          lead_phone?: string | null
          max_wait_seconds?: number | null
          no_agents_actions?: string[]
          no_agents_message?: string | null
          node_id?: string | null
          post_message?: string | null
          pre_message?: string | null
          queued_at?: string | null
          redirect_flow_id?: string | null
          status?: string
          team_member_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      handoff_audit_log: {
        Row: {
          account_owner_id: string
          assignment_id: string | null
          created_at: string
          event_type: string
          id: string
          member_id: string | null
          payload: Json
        }
        Insert: {
          account_owner_id: string
          assignment_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          member_id?: string | null
          payload?: Json
        }
        Update: {
          account_owner_id?: string
          assignment_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          member_id?: string | null
          payload?: Json
        }
        Relationships: []
      }
      ignored_contacts: {
        Row: {
          campaign_id: string | null
          created_at: string
          first_message_sent_at: string
          id: string
          owner_user_id: string | null
          phone: string
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          first_message_sent_at?: string
          id?: string
          owner_user_id?: string | null
          phone: string
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          first_message_sent_at?: string
          id?: string
          owner_user_id?: string | null
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
      influencer_ai_approaches: {
        Row: {
          admin_id: string | null
          analysis: Json
          channel: string | null
          created_at: string
          id: string
          message: string
          prospect_id: string
          research: Json
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_id?: string | null
          analysis?: Json
          channel?: string | null
          created_at?: string
          id?: string
          message: string
          prospect_id: string
          research?: Json
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_id?: string | null
          analysis?: Json
          channel?: string | null
          created_at?: string
          id?: string
          message?: string
          prospect_id?: string
          research?: Json
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_ai_approaches_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_analysis: {
        Row: {
          analysis_json: Json
          created_at: string
          id: string
          model: string
          prompt_version: string
          prospect_id: string
          search_id: string | null
        }
        Insert: {
          analysis_json?: Json
          created_at?: string
          id?: string
          model: string
          prompt_version: string
          prospect_id: string
          search_id?: string | null
        }
        Update: {
          analysis_json?: Json
          created_at?: string
          id?: string
          model?: string
          prompt_version?: string
          prospect_id?: string
          search_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_analysis_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_analysis_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "influencer_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_campaign_recipients: {
        Row: {
          attempts: number
          body_html: string
          campaign_id: string
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          email: string
          error_message: string | null
          failed_at: string | null
          id: string
          prospect_id: string
          provider_message_id: string | null
          replied_at: string | null
          reply_token: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          body_html: string
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          prospect_id: string
          provider_message_id?: string | null
          replied_at?: string | null
          reply_token?: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          body_html?: string
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          error_message?: string | null
          failed_at?: string | null
          id?: string
          prospect_id?: string
          provider_message_id?: string | null
          replied_at?: string | null
          reply_token?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "influencer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "influencer_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_campaign_recipients_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_campaigns: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          description: string | null
          finished_at: string | null
          id: string
          name: string
          started_at: string | null
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          finished_at?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          finished_at?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "influencer_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_contacts: {
        Row: {
          confidence: string
          created_at: string
          discovered_at: string
          id: string
          is_primary: boolean
          last_contacted_at: string | null
          normalized_value: string
          note: string | null
          prospect_id: string
          sources: Json
          status: string
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          discovered_at?: string
          id?: string
          is_primary?: boolean
          last_contacted_at?: string | null
          normalized_value: string
          note?: string | null
          prospect_id: string
          sources?: Json
          status?: string
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          confidence?: string
          created_at?: string
          discovered_at?: string
          id?: string
          is_primary?: boolean
          last_contacted_at?: string | null
          normalized_value?: string
          note?: string | null
          prospect_id?: string
          sources?: Json
          status?: string
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_email_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          detail: string | null
          event_type: string
          id: string
          payload: Json
          prospect_id: string | null
          recipient_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          payload?: Json
          prospect_id?: string | null
          recipient_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          payload?: Json
          prospect_id?: string | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "influencer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_email_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_email_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "influencer_campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_email_suppressions: {
        Row: {
          created_at: string
          email: string
          prospect_id: string | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          prospect_id?: string | null
          reason?: string
        }
        Update: {
          created_at?: string
          email?: string
          prospect_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_email_suppressions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_email_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      influencer_messages: {
        Row: {
          attachments: Json
          author_id: string | null
          body_html: string | null
          body_text: string
          campaign_id: string | null
          created_at: string
          direction: string
          from_email: string | null
          id: string
          prospect_id: string
          provider_message_id: string | null
          recipient_id: string | null
          subject: string | null
          to_email: string | null
        }
        Insert: {
          attachments?: Json
          author_id?: string | null
          body_html?: string | null
          body_text?: string
          campaign_id?: string | null
          created_at?: string
          direction: string
          from_email?: string | null
          id?: string
          prospect_id: string
          provider_message_id?: string | null
          recipient_id?: string | null
          subject?: string | null
          to_email?: string | null
        }
        Update: {
          attachments?: Json
          author_id?: string | null
          body_html?: string | null
          body_text?: string
          campaign_id?: string | null
          created_at?: string
          direction?: string
          from_email?: string | null
          id?: string
          prospect_id?: string
          provider_message_id?: string | null
          recipient_id?: string | null
          subject?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "influencer_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_messages_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "influencer_campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_prospects: {
        Row: {
          ai_reasoning: Json
          ai_recommendation: string | null
          ai_summary: string | null
          audience_fit_score: number | null
          avg_comments: number | null
          avg_likes: number | null
          avg_recent_views: number | null
          category_name: string | null
          channel_description: string | null
          channel_handle: string | null
          channel_name: string
          channel_url: string | null
          collected_at: string | null
          commercial_score: number | null
          contact_email: string | null
          contact_links: Json
          content_fit_score: number | null
          country: string | null
          created_at: string
          created_by: string | null
          engagement_rate: number | null
          fit_category: string | null
          fit_score: number | null
          following_count: number | null
          id: string
          instagram_url: string | null
          is_business_account: boolean | null
          is_private: boolean | null
          is_professional_account: boolean | null
          is_verified: boolean | null
          latest_video_at: string | null
          notes: string | null
          platform: string
          profile_id: string | null
          quality_score: number | null
          reach_score: number | null
          relevance_reason: string | null
          saved: boolean
          search_id: string | null
          status: string
          subscriber_count: number | null
          thumbnail_url: string | null
          total_view_count: number | null
          updated_at: string
          username: string | null
          video_count: number | null
          website_url: string | null
          youtube_channel_id: string
        }
        Insert: {
          ai_reasoning?: Json
          ai_recommendation?: string | null
          ai_summary?: string | null
          audience_fit_score?: number | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_recent_views?: number | null
          category_name?: string | null
          channel_description?: string | null
          channel_handle?: string | null
          channel_name: string
          channel_url?: string | null
          collected_at?: string | null
          commercial_score?: number | null
          contact_email?: string | null
          contact_links?: Json
          content_fit_score?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          engagement_rate?: number | null
          fit_category?: string | null
          fit_score?: number | null
          following_count?: number | null
          id?: string
          instagram_url?: string | null
          is_business_account?: boolean | null
          is_private?: boolean | null
          is_professional_account?: boolean | null
          is_verified?: boolean | null
          latest_video_at?: string | null
          notes?: string | null
          platform?: string
          profile_id?: string | null
          quality_score?: number | null
          reach_score?: number | null
          relevance_reason?: string | null
          saved?: boolean
          search_id?: string | null
          status?: string
          subscriber_count?: number | null
          thumbnail_url?: string | null
          total_view_count?: number | null
          updated_at?: string
          username?: string | null
          video_count?: number | null
          website_url?: string | null
          youtube_channel_id: string
        }
        Update: {
          ai_reasoning?: Json
          ai_recommendation?: string | null
          ai_summary?: string | null
          audience_fit_score?: number | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_recent_views?: number | null
          category_name?: string | null
          channel_description?: string | null
          channel_handle?: string | null
          channel_name?: string
          channel_url?: string | null
          collected_at?: string | null
          commercial_score?: number | null
          contact_email?: string | null
          contact_links?: Json
          content_fit_score?: number | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          engagement_rate?: number | null
          fit_category?: string | null
          fit_score?: number | null
          following_count?: number | null
          id?: string
          instagram_url?: string | null
          is_business_account?: boolean | null
          is_private?: boolean | null
          is_professional_account?: boolean | null
          is_verified?: boolean | null
          latest_video_at?: string | null
          notes?: string | null
          platform?: string
          profile_id?: string | null
          quality_score?: number | null
          reach_score?: number | null
          relevance_reason?: string | null
          saved?: boolean
          search_id?: string | null
          status?: string
          subscriber_count?: number | null
          thumbnail_url?: string | null
          total_view_count?: number | null
          updated_at?: string
          username?: string | null
          video_count?: number | null
          website_url?: string | null
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_prospects_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "influencer_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_searches: {
        Row: {
          admin_id: string
          country: string
          created_at: string
          error_message: string | null
          generated_queries: string[]
          id: string
          keywords: string[]
          language: string
          max_subscribers: number
          min_subscribers: number
          min_views: number | null
          platform: string
          query_description: string
          recency_days: number
          results_found: number
          results_requested: number
          stats: Json
          status: string
          terms: string[]
          updated_at: string
        }
        Insert: {
          admin_id: string
          country?: string
          created_at?: string
          error_message?: string | null
          generated_queries?: string[]
          id?: string
          keywords?: string[]
          language?: string
          max_subscribers?: number
          min_subscribers?: number
          min_views?: number | null
          platform?: string
          query_description: string
          recency_days?: number
          results_found?: number
          results_requested?: number
          stats?: Json
          status?: string
          terms?: string[]
          updated_at?: string
        }
        Update: {
          admin_id?: string
          country?: string
          created_at?: string
          error_message?: string | null
          generated_queries?: string[]
          id?: string
          keywords?: string[]
          language?: string
          max_subscribers?: number
          min_subscribers?: number
          min_views?: number | null
          platform?: string
          query_description?: string
          recency_days?: number
          results_found?: number
          results_requested?: number
          stats?: Json
          status?: string
          terms?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      influencer_videos: {
        Row: {
          comment_count: number | null
          created_at: string
          description: string | null
          id: string
          like_count: number | null
          prospect_id: string
          published_at: string | null
          title: string | null
          video_url: string | null
          view_count: number | null
          youtube_video_id: string
        }
        Insert: {
          comment_count?: number | null
          created_at?: string
          description?: string | null
          id?: string
          like_count?: number | null
          prospect_id: string
          published_at?: string | null
          title?: string | null
          video_url?: string | null
          view_count?: number | null
          youtube_video_id: string
        }
        Update: {
          comment_count?: number | null
          created_at?: string
          description?: string | null
          id?: string
          like_count?: number | null
          prospect_id?: string
          published_at?: string | null
          title?: string | null
          video_url?: string | null
          view_count?: number | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_videos_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "influencer_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_webhook_events: {
        Row: {
          connection_id: string | null
          created_at: string
          error: string | null
          event_type: string
          external_id: string | null
          id: string
          ig_user_id: string | null
          owner_user_id: string | null
          payload: Json
          processed: boolean
          sender_id: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          error?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          ig_user_id?: string | null
          owner_user_id?: string | null
          payload?: Json
          processed?: boolean
          sender_id?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          ig_user_id?: string | null
          owner_user_id?: string | null
          payload?: Json
          processed?: boolean
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_instagram_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_audit_log: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          endpoint: string
          error_code: string | null
          error_message: string | null
          filters: Json | null
          id: string
          ip: unknown
          modules: string[] | null
          processing_time_ms: number | null
          records_returned: number | null
          request_id: string | null
          status_code: number
          success: boolean
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          endpoint: string
          error_code?: string | null
          error_message?: string | null
          filters?: Json | null
          id?: string
          ip?: unknown
          modules?: string[] | null
          processing_time_ms?: number | null
          records_returned?: number | null
          request_id?: string | null
          status_code: number
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          endpoint?: string
          error_code?: string | null
          error_message?: string | null
          filters?: Json | null
          id?: string
          ip?: unknown
          modules?: string[] | null
          processing_time_ms?: number | null
          records_returned?: number | null
          request_id?: string | null
          status_code?: number
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      job_leases: {
        Row: {
          locked_until: string
          name: string
          updated_at: string
        }
        Insert: {
          locked_until: string
          name: string
          updated_at?: string
        }
        Update: {
          locked_until?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          owner_user_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          owner_user_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          contract_url: string | null
          created_at: string
          description: string | null
          expiration_date: string | null
          id: string
          lead_id: string
          notes: string | null
          notice_15d_sent_at: string | null
          notice_30d_sent_at: string | null
          notice_7d_sent_at: string | null
          owner_user_id: string | null
          payment_method: string | null
          receipt_url: string | null
          renewal_count: number
          renewed_at: string | null
          renewed_from_deal_id: string | null
          responsible_user_id: string | null
          sale_type: string
          start_date: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          closed_at?: string
          contract_months?: number
          contract_type?: string
          contract_url?: string | null
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          notice_15d_sent_at?: string | null
          notice_30d_sent_at?: string | null
          notice_7d_sent_at?: string | null
          owner_user_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          renewal_count?: number
          renewed_at?: string | null
          renewed_from_deal_id?: string | null
          responsible_user_id?: string | null
          sale_type?: string
          start_date?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          closed_at?: string
          contract_months?: number
          contract_type?: string
          contract_url?: string | null
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          notice_15d_sent_at?: string | null
          notice_30d_sent_at?: string | null
          notice_7d_sent_at?: string | null
          owner_user_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          renewal_count?: number
          renewed_at?: string | null
          renewed_from_deal_id?: string | null
          responsible_user_id?: string | null
          sale_type?: string
          start_date?: string
          status?: string
          title?: string | null
          updated_at?: string
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
          {
            foreignKeyName: "lead_deals_renewed_from_deal_id_fkey"
            columns: ["renewed_from_deal_id"]
            isOneToOne: false
            referencedRelation: "lead_deals"
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          owner_user_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          owner_user_id?: string | null
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
          owner_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
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
          archived_at: string | null
          category: string | null
          city: string | null
          closing_probability: string | null
          company_name: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          created_by_user_id: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          enrichment_data: Json | null
          estimated_value: number | null
          first_message_sent: boolean | null
          first_message_sent_at: string | null
          follow_up_delay_seconds: number | null
          follow_up_message: string | null
          follow_up_scheduled_at: string | null
          follow_up_sent_at: string | null
          follow_up_status: string | null
          google_maps_link: string | null
          has_responded: boolean | null
          id: string
          initial_template_id: string | null
          last_message_sent: string | null
          last_message_sent_at: string | null
          last_response: string | null
          last_response_at: string | null
          opportunity_level: string | null
          origin: string | null
          owner_user_id: string | null
          phone: string
          phone_numbers: Json | null
          pipeline_stage_id: string | null
          prospected_at: string | null
          rating: number | null
          region: string | null
          responded_at: string | null
          responsible_user_id: string | null
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
          archived_at?: string | null
          category?: string | null
          city?: string | null
          closing_probability?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          enrichment_data?: Json | null
          estimated_value?: number | null
          first_message_sent?: boolean | null
          first_message_sent_at?: string | null
          follow_up_delay_seconds?: number | null
          follow_up_message?: string | null
          follow_up_scheduled_at?: string | null
          follow_up_sent_at?: string | null
          follow_up_status?: string | null
          google_maps_link?: string | null
          has_responded?: boolean | null
          id?: string
          initial_template_id?: string | null
          last_message_sent?: string | null
          last_message_sent_at?: string | null
          last_response?: string | null
          last_response_at?: string | null
          opportunity_level?: string | null
          origin?: string | null
          owner_user_id?: string | null
          phone: string
          phone_numbers?: Json | null
          pipeline_stage_id?: string | null
          prospected_at?: string | null
          rating?: number | null
          region?: string | null
          responded_at?: string | null
          responsible_user_id?: string | null
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
          archived_at?: string | null
          category?: string | null
          city?: string | null
          closing_probability?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          enrichment_data?: Json | null
          estimated_value?: number | null
          first_message_sent?: boolean | null
          first_message_sent_at?: string | null
          follow_up_delay_seconds?: number | null
          follow_up_message?: string | null
          follow_up_scheduled_at?: string | null
          follow_up_sent_at?: string | null
          follow_up_status?: string | null
          google_maps_link?: string | null
          has_responded?: boolean | null
          id?: string
          initial_template_id?: string | null
          last_message_sent?: string | null
          last_message_sent_at?: string | null
          last_response?: string | null
          last_response_at?: string | null
          opportunity_level?: string | null
          origin?: string | null
          owner_user_id?: string | null
          phone?: string
          phone_numbers?: Json | null
          pipeline_stage_id?: string | null
          prospected_at?: string | null
          rating?: number | null
          region?: string | null
          responded_at?: string | null
          responsible_user_id?: string | null
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
      member_availability: {
        Row: {
          account_owner_id: string
          auto_offline_after_minutes: number | null
          created_at: string
          id: string
          last_seen_at: string | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
          work_days: number[]
          work_end: string
          work_start: string
        }
        Insert: {
          account_owner_id: string
          auto_offline_after_minutes?: number | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Update: {
          account_owner_id?: string
          auto_offline_after_minutes?: number | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      meta_campaigns: {
        Row: {
          campaign_name: string
          connection_id: string | null
          cost_currency: string
          cost_source: string
          cost_updated_at: string | null
          created_at: string
          error_details: Json | null
          estimated_cost: number
          failed_count: number
          id: string
          owner_user_id: string | null
          real_cost: number
          status: string
          success_count: number
          template_category: string | null
          template_language: string
          template_name: string
          total_cost: number
          total_recipients: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name: string
          connection_id?: string | null
          cost_currency?: string
          cost_source?: string
          cost_updated_at?: string | null
          created_at?: string
          error_details?: Json | null
          estimated_cost?: number
          failed_count?: number
          id?: string
          owner_user_id?: string | null
          real_cost?: number
          status?: string
          success_count?: number
          template_category?: string | null
          template_language?: string
          template_name: string
          total_cost?: number
          total_recipients?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          connection_id?: string | null
          cost_currency?: string
          cost_source?: string
          cost_updated_at?: string | null
          created_at?: string
          error_details?: Json | null
          estimated_cost?: number
          failed_count?: number
          id?: string
          owner_user_id?: string | null
          real_cost?: number
          status?: string
          success_count?: number
          template_category?: string | null
          template_language?: string
          template_name?: string
          total_cost?: number
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
      order_bump_events: {
        Row: {
          asaas_subscription_id: string | null
          bump_id: string
          created_at: string
          delta: number
          id: string
          metadata: Json | null
          new_quantity: number
          source: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          asaas_subscription_id?: string | null
          bump_id: string
          created_at?: string
          delta: number
          id?: string
          metadata?: Json | null
          new_quantity?: number
          source: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          asaas_subscription_id?: string | null
          bump_id?: string
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json | null
          new_quantity?: number
          source?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bump_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          attribution_source: string
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
          referral_code: string | null
          referral_link_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attributed_at?: string
          attribution_source?: string
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
          referral_code?: string | null
          referral_link_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attributed_at?: string
          attribution_source?: string
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
          referral_code?: string | null
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
          first_month_boost_enabled: boolean
          first_month_boost_percent: number
          first_month_boost_until: string | null
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
          first_month_boost_enabled?: boolean
          first_month_boost_percent?: number
          first_month_boost_until?: string | null
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
          first_month_boost_enabled?: boolean
          first_month_boost_percent?: number
          first_month_boost_until?: string | null
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
          verification_code: string | null
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
          verification_code?: string | null
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
          verification_code?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          account_role: Database["public"]["Enums"]["account_role"]
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
          extra_contacts_packs: number
          extra_numbers: number
          extra_opportunities_packs: number
          first_paid_at: string | null
          fraud_flags: Json | null
          id: string
          is_archived: boolean
          is_blocked: boolean | null
          is_custom_subscription: boolean
          last_searches_reset: string | null
          must_change_password: boolean
          name: string | null
          neighborhood: string | null
          parent_owner_id: string | null
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
          account_role?: Database["public"]["Enums"]["account_role"]
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
          extra_contacts_packs?: number
          extra_numbers?: number
          extra_opportunities_packs?: number
          first_paid_at?: string | null
          fraud_flags?: Json | null
          id: string
          is_archived?: boolean
          is_blocked?: boolean | null
          is_custom_subscription?: boolean
          last_searches_reset?: string | null
          must_change_password?: boolean
          name?: string | null
          neighborhood?: string | null
          parent_owner_id?: string | null
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
          account_role?: Database["public"]["Enums"]["account_role"]
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
          extra_contacts_packs?: number
          extra_numbers?: number
          extra_opportunities_packs?: number
          first_paid_at?: string | null
          fraud_flags?: Json | null
          id?: string
          is_archived?: boolean
          is_blocked?: boolean | null
          is_custom_subscription?: boolean
          last_searches_reset?: string | null
          must_change_password?: boolean
          name?: string | null
          neighborhood?: string | null
          parent_owner_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
          phone_e164: string
          responsible_user_id: string | null
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
          owner_user_id?: string | null
          phone_e164: string
          responsible_user_id?: string | null
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
          owner_user_id?: string | null
          phone_e164?: string
          responsible_user_id?: string | null
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
          owner_user_id: string | null
          updated_at: string
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          owner_user_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          owner_user_id?: string | null
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
          owner_user_id: string | null
          report_data: Json
          report_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id?: string | null
          report_data?: Json
          report_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
          score_value: number
          snapshot_date: string
          status_bucket: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          owner_user_id?: string | null
          score_value?: number
          snapshot_date?: string
          status_bucket?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
      sdr_agents: {
        Row: {
          ai: Json
          closing: Json
          created_at: string
          created_by: string | null
          id: string
          knowledge: Json
          name: string
          objective: string
          objective_custom: string | null
          owner_user_id: string
          personality: Json
          schedule: Json
          situations: Json
          status: string
          strategy: Json
          triggers: Json
          updated_at: string
          whatsapp_number_ids: string[]
        }
        Insert: {
          ai?: Json
          closing?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          knowledge?: Json
          name: string
          objective?: string
          objective_custom?: string | null
          owner_user_id: string
          personality?: Json
          schedule?: Json
          situations?: Json
          status?: string
          strategy?: Json
          triggers?: Json
          updated_at?: string
          whatsapp_number_ids?: string[]
        }
        Update: {
          ai?: Json
          closing?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          knowledge?: Json
          name?: string
          objective?: string
          objective_custom?: string | null
          owner_user_id?: string
          personality?: Json
          schedule?: Json
          situations?: Json
          status?: string
          strategy?: Json
          triggers?: Json
          updated_at?: string
          whatsapp_number_ids?: string[]
        }
        Relationships: []
      }
      sdr_runs: {
        Row: {
          agent_id: string
          analysis: Json
          created_at: string
          id: string
          inbound_message: string | null
          messages: Json
          owner_user_id: string
          session_id: string | null
          strategy: Json
          trigger_type: string
          validation: Json
        }
        Insert: {
          agent_id: string
          analysis?: Json
          created_at?: string
          id?: string
          inbound_message?: string | null
          messages?: Json
          owner_user_id: string
          session_id?: string | null
          strategy?: Json
          trigger_type?: string
          validation?: Json
        }
        Update: {
          agent_id?: string
          analysis?: Json
          created_at?: string
          id?: string
          inbound_message?: string | null
          messages?: Json
          owner_user_id?: string
          session_id?: string | null
          strategy?: Json
          trigger_type?: string
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sdr_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "sdr_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sdr_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_sessions: {
        Row: {
          agent_id: string
          closed_reason: string | null
          contact_name: string | null
          conversation_id: string | null
          created_at: string
          current_goal: string | null
          followup_reason: string | null
          followups_sent: number
          id: string
          last_message_at: string | null
          last_processed_at: string | null
          last_reply_at: string | null
          lead_id: string | null
          memory: Json
          messages_sent: number
          next_followup_at: string | null
          owner_user_id: string
          phone: string | null
          phone_number_id: string | null
          replies_received: number
          stage: string
          status: string
          updated_at: string
          user_id: string | null
          waba_connection_id: string | null
        }
        Insert: {
          agent_id: string
          closed_reason?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          current_goal?: string | null
          followup_reason?: string | null
          followups_sent?: number
          id?: string
          last_message_at?: string | null
          last_processed_at?: string | null
          last_reply_at?: string | null
          lead_id?: string | null
          memory?: Json
          messages_sent?: number
          next_followup_at?: string | null
          owner_user_id: string
          phone?: string | null
          phone_number_id?: string | null
          replies_received?: number
          stage?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          waba_connection_id?: string | null
        }
        Update: {
          agent_id?: string
          closed_reason?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          current_goal?: string | null
          followup_reason?: string | null
          followups_sent?: number
          id?: string
          last_message_at?: string | null
          last_processed_at?: string | null
          last_reply_at?: string | null
          lead_id?: string | null
          memory?: Json
          messages_sent?: number
          next_followup_at?: string | null
          owner_user_id?: string
          phone?: string | null
          phone_number_id?: string | null
          replies_received?: number
          stage?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          waba_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "sdr_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          keyword: string
          leads: Json | null
          location: string
          owner_user_id: string | null
          results_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          leads?: Json | null
          location: string
          owner_user_id?: string | null
          results_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          leads?: Json | null
          location?: string
          owner_user_id?: string | null
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
      suggestions: {
        Row: {
          account_owner_id: string | null
          category: string
          company_name: string | null
          created_at: string
          description: string
          id: string
          importance: string
          metadata: Json
          status: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          account_owner_id?: string | null
          category: string
          company_name?: string | null
          created_at?: string
          description: string
          id?: string
          importance: string
          metadata?: Json
          status?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          account_owner_id?: string | null
          category?: string
          company_name?: string | null
          created_at?: string
          description?: string
          id?: string
          importance?: string
          metadata?: Json
          status?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
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
          autoclose_followup_sent_at: string | null
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
          last_customer_reply_at: string | null
          last_support_reply_at: string | null
          name: string | null
          phase: string
          phone: string | null
          priority: string
          rating_email_sent_at: string | null
          rating_token: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string | null
          summary_message_count: number
          ticket_number: string | null
          updated_at: string
          user_id: string | null
          visitor_session: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_summary?: string | null
          autoclose_followup_sent_at?: string | null
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
          last_customer_reply_at?: string | null
          last_support_reply_at?: string | null
          name?: string | null
          phase?: string
          phone?: string | null
          priority?: string
          rating_email_sent_at?: string | null
          rating_token?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string | null
          summary_message_count?: number
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
          visitor_session?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_summary?: string | null
          autoclose_followup_sent_at?: string | null
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
          last_customer_reply_at?: string | null
          last_support_reply_at?: string | null
          name?: string | null
          phase?: string
          phone?: string | null
          priority?: string
          rating_email_sent_at?: string | null
          rating_token?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          api_key: string | null
          created_at: string
          encrypted_key: string | null
          id: string
          is_active: boolean
          key_hint: string | null
          last_validated_at: string | null
          model: string | null
          name: string
          owner_user_id: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          encrypted_key?: string | null
          id?: string
          is_active?: boolean
          key_hint?: string | null
          last_validated_at?: string | null
          model?: string | null
          name?: string
          owner_user_id?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          encrypted_key?: string | null
          id?: string
          is_active?: boolean
          key_hint?: string | null
          last_validated_at?: string | null
          model?: string | null
          name?: string
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
          refresh_token?: string
          scopes?: string[] | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_instagram_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          ig_name: string | null
          ig_user_id: string
          ig_username: string | null
          last_checked_at: string | null
          last_error: string | null
          owner_user_id: string
          page_id: string | null
          page_name: string | null
          profile_picture_url: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          ig_name?: string | null
          ig_user_id: string
          ig_username?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          owner_user_id: string
          page_id?: string | null
          page_name?: string | null
          profile_picture_url?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          ig_name?: string | null
          ig_user_id?: string
          ig_username?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          owner_user_id?: string
          page_id?: string | null
          page_name?: string | null
          profile_picture_url?: string | null
          status?: string
          token_expires_at?: string | null
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
      user_metric_state: {
        Row: {
          has_data: boolean
          metric_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          has_data?: boolean
          metric_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          has_data?: boolean
          metric_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_sessions: {
        Row: {
          expires_at: string
          ip_address: string | null
          session_id: string
          user_agent: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at?: string
          ip_address?: string | null
          session_id: string
          user_agent?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          ip_address?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string
        }
        Relationships: []
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
      user_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
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
      user_security: {
        Row: {
          created_at: string
          enabled_at: string | null
          failed_attempts: number
          last_verified_at: string | null
          locked_until: string | null
          pending_created_at: string | null
          pending_secret_encrypted: string | null
          totp_secret_encrypted: string | null
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          failed_attempts?: number
          last_verified_at?: string | null
          locked_until?: string | null
          pending_created_at?: string | null
          pending_secret_encrypted?: string | null
          totp_secret_encrypted?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          failed_attempts?: number
          last_verified_at?: string | null
          locked_until?: string | null
          pending_created_at?: string | null
          pending_secret_encrypted?: string | null
          totp_secret_encrypted?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_waba_connections: {
        Row: {
          access_token: string
          business_name: string | null
          created_at: string
          display_phone_number: string | null
          id: string
          nickname: string | null
          owner_user_id: string | null
          phone_number_id: string | null
          raw_signup_data: Json | null
          responsible_user_id: string | null
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
          owner_user_id?: string | null
          phone_number_id?: string | null
          raw_signup_data?: Json | null
          responsible_user_id?: string | null
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
          owner_user_id?: string | null
          phone_number_id?: string | null
          raw_signup_data?: Json | null
          responsible_user_id?: string | null
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
          channel: string
          created_at: string
          default_out_of_window_template: Json | null
          description: string | null
          id: string
          inactivity_action: string | null
          inactivity_message: string | null
          inactivity_reset_enabled: boolean
          inactivity_target_node_id: string | null
          inactivity_timeout_seconds: number | null
          instagram_connection_id: string | null
          name: string
          owner_user_id: string | null
          phone_number_id: string | null
          status: Database["public"]["Enums"]["wa_flow_status"]
          test_mode: boolean
          test_phone: string | null
          updated_at: string
          user_id: string
          version: number
          waba_connection_id: string | null
          whatsapp_number_id: string | null
        }
        Insert: {
          api_type?: string | null
          channel?: string
          created_at?: string
          default_out_of_window_template?: Json | null
          description?: string | null
          id?: string
          inactivity_action?: string | null
          inactivity_message?: string | null
          inactivity_reset_enabled?: boolean
          inactivity_target_node_id?: string | null
          inactivity_timeout_seconds?: number | null
          instagram_connection_id?: string | null
          name?: string
          owner_user_id?: string | null
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["wa_flow_status"]
          test_mode?: boolean
          test_phone?: string | null
          updated_at?: string
          user_id: string
          version?: number
          waba_connection_id?: string | null
          whatsapp_number_id?: string | null
        }
        Update: {
          api_type?: string | null
          channel?: string
          created_at?: string
          default_out_of_window_template?: Json | null
          description?: string | null
          id?: string
          inactivity_action?: string | null
          inactivity_message?: string | null
          inactivity_reset_enabled?: boolean
          inactivity_target_node_id?: string | null
          inactivity_timeout_seconds?: number | null
          instagram_connection_id?: string | null
          name?: string
          owner_user_id?: string | null
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["wa_flow_status"]
          test_mode?: boolean
          test_phone?: string | null
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
          channel: string
          channel_account_id: string | null
          collected_data: Json | null
          completed_at: string | null
          contact_ref: string | null
          created_at: string
          current_node_id: string | null
          current_node_name: string | null
          entry_data: Json | null
          exit_node_name: string | null
          flow_id: string
          id: string
          inactivity_processed_at: string | null
          last_error: string | null
          last_user_message_at: string | null
          lead_name: string | null
          lead_phone: string
          node_history: Json | null
          owner_user_id: string | null
          started_at: string
          status: string
          thread_ref: string | null
          trigger_data: Json
          trigger_type: string | null
          updated_at: string
          user_id: string
          wait_until: string | null
        }
        Insert: {
          awaiting_input_until?: string | null
          awaiting_node_id?: string | null
          channel?: string
          channel_account_id?: string | null
          collected_data?: Json | null
          completed_at?: string | null
          contact_ref?: string | null
          created_at?: string
          current_node_id?: string | null
          current_node_name?: string | null
          entry_data?: Json | null
          exit_node_name?: string | null
          flow_id: string
          id?: string
          inactivity_processed_at?: string | null
          last_error?: string | null
          last_user_message_at?: string | null
          lead_name?: string | null
          lead_phone: string
          node_history?: Json | null
          owner_user_id?: string | null
          started_at?: string
          status?: string
          thread_ref?: string | null
          trigger_data?: Json
          trigger_type?: string | null
          updated_at?: string
          user_id: string
          wait_until?: string | null
        }
        Update: {
          awaiting_input_until?: string | null
          awaiting_node_id?: string | null
          channel?: string
          channel_account_id?: string | null
          collected_data?: Json | null
          completed_at?: string | null
          contact_ref?: string | null
          created_at?: string
          current_node_id?: string | null
          current_node_name?: string | null
          entry_data?: Json | null
          exit_node_name?: string | null
          flow_id?: string
          id?: string
          inactivity_processed_at?: string | null
          last_error?: string | null
          last_user_message_at?: string | null
          lead_name?: string | null
          lead_phone?: string
          node_history?: Json | null
          owner_user_id?: string | null
          started_at?: string
          status?: string
          thread_ref?: string | null
          trigger_data?: Json
          trigger_type?: string | null
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
      wa_flow_ratings: {
        Row: {
          bucket: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          execution_id: string | null
          flow_id: string
          id: string
          lead_id: string | null
          node_id: string | null
          owner_user_id: string | null
          rating_name: string | null
          rating_type: string
          responded_at: string | null
          score_max: number | null
          score_numeric: number | null
          score_text: string | null
          sent_at: string | null
          suggestion_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          execution_id?: string | null
          flow_id: string
          id?: string
          lead_id?: string | null
          node_id?: string | null
          owner_user_id?: string | null
          rating_name?: string | null
          rating_type: string
          responded_at?: string | null
          score_max?: number | null
          score_numeric?: number | null
          score_text?: string | null
          sent_at?: string | null
          suggestion_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          execution_id?: string | null
          flow_id?: string
          id?: string
          lead_id?: string | null
          node_id?: string | null
          owner_user_id?: string | null
          rating_name?: string | null
          rating_type?: string
          responded_at?: string | null
          score_max?: number | null
          score_numeric?: number | null
          score_text?: string | null
          sent_at?: string | null
          suggestion_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_flow_ratings_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "wa_automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      waba_number_responsibles: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          owner_user_id: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          owner_user_id: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          owner_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waba_number_responsibles_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_waba_connections"
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
          phone_number: string | null
          proxy_id: string | null
          responsible_user_id: string | null
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
          owner_user_id?: string | null
          phone_number?: string | null
          proxy_id?: string | null
          responsible_user_id?: string | null
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
          owner_user_id?: string | null
          phone_number?: string | null
          proxy_id?: string | null
          responsible_user_id?: string | null
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
          owner_user_id: string | null
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
          owner_user_id?: string | null
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
          owner_user_id?: string | null
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
          owner_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
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
      accessible_owner_ids: { Args: never; Returns: string[] }
      account_get_member_activity_sessions: {
        Args: { _from: string; _to: string; _user_id: string }
        Returns: {
          active_seconds: number
          day: string
          event_count: number
          session_end: string
          session_start: string
        }[]
      }
      account_get_member_last_login: {
        Args: { _user_id: string }
        Returns: string
      }
      account_get_member_operational_stats: {
        Args: { _from: string; _to: string; _user_id: string }
        Returns: Json
      }
      account_get_members_usage_summary: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      account_mark_member_login: { Args: never; Returns: undefined }
      acquire_job_lease: {
        Args: { _name: string; _seconds: number }
        Returns: boolean
      }
      admin_create_partner_goal: {
        Args: {
          p_admin_id: string
          p_deadline_at: string
          p_description: string
          p_goal_type: Database["public"]["Enums"]["partner_goal_type"]
          p_internal_notes?: string
          p_partner_id: string
          p_prize_amount_cents: number
          p_referral_link_id?: string
          p_target_value: number
          p_title: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "partner_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_get_user_activity_sessions: {
        Args: { _from: string; _to: string; _user_id: string }
        Returns: {
          active_seconds: number
          day: string
          event_count: number
          session_end: string
          session_start: string
        }[]
      }
      admin_get_user_operational_stats: {
        Args: { _from: string; _to: string; _user_id: string }
        Returns: Json
      }
      admin_update_searches_limit: {
        Args: { p_new_limit: number; p_user_email: string }
        Returns: undefined
      }
      attribute_partner_lead: {
        Args: {
          p_click_id?: string
          p_email: string
          p_name?: string
          p_partner_id?: string
          p_referral_code?: string
          p_referral_link_id?: string
          p_source?: string
          p_user_id: string
        }
        Returns: Json
      }
      can_manage_calendar_event: {
        Args: { _assigned: string; _created_by: string; _owner: string }
        Returns: boolean
      }
      cancel_partner_commissions_for_customer: {
        Args: {
          p_customer_user_id: string
          p_only_recurring?: boolean
          p_reason?: string
        }
        Returns: Json
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
      count_account_members: { Args: { _owner: string }; Returns: number }
      current_account_owner: { Args: never; Returns: string }
      current_account_role: { Args: never; Returns: string }
      decrement_blog_post_like: {
        Args: { _post_id: string }
        Returns: undefined
      }
      generate_partner_referral_code: {
        Args: { p_full_name: string }
        Returns: string
      }
      generate_partner_verification_code: { Args: never; Returns: string }
      get_2fa_status: {
        Args: { _user_id?: string }
        Returns: {
          enabled_at: string
          two_factor_enabled: boolean
          user_id: string
        }[]
      }
      get_account_owner: { Args: { _uid: string }; Returns: string }
      get_account_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["account_role"]
      }
      get_account_seat_limit: { Args: { _owner: string }; Returns: number }
      get_auth_user_id_by_email: { Args: { _email: string }; Returns: string }
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
      get_template_avg_cost: {
        Args: { p_category: string; p_owner: string; p_template: string }
        Returns: number
      }
      has_active_access: { Args: { _user_id: string }; Returns: boolean }
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
      increment_blog_post_like: {
        Args: { _post_id: string }
        Returns: undefined
      }
      increment_blog_post_view: {
        Args: { _post_id: string }
        Returns: undefined
      }
      is_account_member: { Args: { _target_owner: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_downgrade_protected: { Args: { _user_id: string }; Returns: boolean }
      is_email_suppressed: { Args: { _email: string }; Returns: boolean }
      is_member_available: { Args: { _user_id: string }; Returns: boolean }
      is_my_account_member: { Args: { _uid: string }; Returns: boolean }
      is_user_blocked: { Args: { p_user_id: string }; Returns: boolean }
      log_plan_downgrade: {
        Args: {
          _metadata?: Json
          _new_plan?: string
          _previous_plan?: string
          _reason: string
          _user_id: string
        }
        Returns: undefined
      }
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
      lookup_active_partner_by_code: {
        Args: { _code: string }
        Returns: {
          partner_id: string
        }[]
      }
      lookup_active_referral_link: {
        Args: { _partner_id: string; _slug: string }
        Returns: {
          link_id: string
        }[]
      }
      mark_partner_sale_refunded: {
        Args: { p_external_reference: string; p_kind?: string }
        Returns: Json
      }
      mark_user_first_payment: {
        Args: { _paid_at?: string; _user_id: string }
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
      meta_fx_to_brl: {
        Args: { p_amount: number; p_currency: string }
        Returns: number
      }
      mfa_satisfied: { Args: never; Returns: boolean }
      normalize_brazilian_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      partner_application_pre_check: {
        Args: { p_cpf: string; p_email: string }
        Returns: Json
      }
      partner_create_referral_link: {
        Args: { _label: string; _video_title?: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "partner_referral_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      partner_set_referral_link_status: {
        Args: { _is_active: boolean; _link_id: string }
        Returns: boolean
      }
      purge_operational_logs: { Args: never; Returns: Json }
      recompute_meta_campaign_cost: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      recompute_partner_level: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      recompute_partner_referral_link_stats: {
        Args: { p_referral_link_id: string }
        Returns: undefined
      }
      recompute_partner_totals: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      refresh_my_partner_goals: { Args: never; Returns: undefined }
      register_partner_click: {
        Args: {
          _landing_page?: string
          _referral_code: string
          _referral_link_slug?: string
          _session_id?: string
          _user_agent?: string
          _utm_campaign?: string
          _utm_content?: string
          _utm_medium?: string
          _utm_source?: string
          _utm_term?: string
        }
        Returns: {
          click_id: string
          partner_id: string
          referral_link_id: string
        }[]
      }
      release_job_lease: { Args: { _name: string }; Returns: undefined }
      release_pending_commissions: { Args: never; Returns: number }
      request_partner_withdrawal: {
        Args: { p_amount_cents: number }
        Returns: Json
      }
      reset_rate_limit: {
        Args: { p_endpoint: string; p_identifier: string }
        Returns: undefined
      }
      resolve_partner_referral_link: {
        Args: { _slug: string }
        Returns: {
          referral_code: string
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }[]
      }
      revenue_score_to_bucket: {
        Args: { p_score: number }
        Returns: Database["public"]["Enums"]["revenue_status_bucket"]
      }
      seed_revenue_score_rules: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      storage_object_account_readable: {
        Args: { _name: string }
        Returns: boolean
      }
      unaccent_simple: { Args: { input: string }; Returns: string }
      update_partner_goal_progress: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      user_has_real_payment: { Args: { _user_id: string }; Returns: boolean }
      validate_partner_referral_code: { Args: { _code: string }; Returns: Json }
      verify_partner_public: {
        Args: { p_code: string }
        Returns: {
          company: string
          country: string
          full_name: string
          level: Database["public"]["Enums"]["partner_level"]
          partner_since: string
          status: Database["public"]["Enums"]["partner_status"]
          verification_code: string
        }[]
      }
      verify_webhook_signature: {
        Args: { p_payload: string; p_secret_name: string; p_signature: string }
        Returns: boolean
      }
    }
    Enums: {
      account_member_status: "active" | "inactive"
      account_role: "owner" | "admin" | "operational"
      app_role: "admin" | "moderator" | "user" | "partner"
      calendar_event_source: "manual" | "sdr" | "flow" | "import"
      calendar_event_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      calendar_event_type:
        | "meeting"
        | "demo"
        | "call"
        | "followup"
        | "visit"
        | "other"
        | "google"
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
        | "rating"
        | "instagram_entry"
        | "ig_reply_comment"
        | "ig_send_dm"
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
      account_member_status: ["active", "inactive"],
      account_role: ["owner", "admin", "operational"],
      app_role: ["admin", "moderator", "user", "partner"],
      calendar_event_source: ["manual", "sdr", "flow", "import"],
      calendar_event_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      calendar_event_type: [
        "meeting",
        "demo",
        "call",
        "followup",
        "visit",
        "other",
        "google",
      ],
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
        "rating",
        "instagram_entry",
        "ig_reply_comment",
        "ig_send_dm",
      ],
      wa_flow_status: ["draft", "active", "paused", "archived"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
