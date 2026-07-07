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
      assessment_leads: {
        Row: {
          consented_at: string | null
          created_at: string
          ecosystem: string
          ecosystem_confidence: number
          evidence: Json
          email: string
          final_url: string | null
          frameworks: string[]
          certificate_risk: Json
          id: string
          page_description: string | null
          page_title: string | null
          recommendation: string
          scan_version: string
          source_ip: string | null
          status: string
          summary: string
          updated_at: string
          website_domain: string
          website_url: string
        }
        Insert: {
          consented_at?: string | null
          created_at?: string
          ecosystem: string
          ecosystem_confidence?: number
          evidence?: Json
          email: string
          final_url?: string | null
          frameworks?: string[]
          certificate_risk?: Json
          id?: string
          page_description?: string | null
          page_title?: string | null
          recommendation: string
          scan_version?: string
          source_ip?: string | null
          status?: string
          summary: string
          updated_at?: string
          website_domain: string
          website_url: string
        }
        Update: {
          consented_at?: string | null
          created_at?: string
          ecosystem?: string
          ecosystem_confidence?: number
          evidence?: Json
          email?: string
          final_url?: string | null
          frameworks?: string[]
          certificate_risk?: Json
          id?: string
          page_description?: string | null
          page_title?: string | null
          recommendation?: string
          scan_version?: string
          source_ip?: string | null
          status?: string
          summary?: string
          updated_at?: string
          website_domain?: string
          website_url?: string
        }
        Relationships: []
      }
      agent_baselines: {
        Row: {
          action_type_distribution: Json
          agent_id: string
          avg_events_per_hour: number
          avg_risk_by_action_type: Json
          created_at: string
          established_at: string
          events_analyzed: number
          id: string
          p50_risk_score: number
          p95_risk_score: number
          source: string
          tenant_id: string
        }
        Insert: {
          action_type_distribution?: Json
          agent_id: string
          avg_events_per_hour?: number
          avg_risk_by_action_type?: Json
          created_at?: string
          established_at?: string
          events_analyzed?: number
          id?: string
          p50_risk_score?: number
          p95_risk_score?: number
          source?: string
          tenant_id: string
        }
        Update: {
          action_type_distribution?: Json
          agent_id?: string
          avg_events_per_hour?: number
          avg_risk_by_action_type?: Json
          created_at?: string
          established_at?: string
          events_analyzed?: number
          id?: string
          p50_risk_score?: number
          p95_risk_score?: number
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_baselines_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_baselines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_drift_scores: {
        Row: {
          agent_id: string
          computed_at: string
          contributing_factors: Json
          drift_band: string
          drift_score: number
          id: string
          tenant_id: string
          window_days: number
        }
        Insert: {
          agent_id: string
          computed_at?: string
          contributing_factors?: Json
          drift_band: string
          drift_score: number
          id?: string
          tenant_id: string
          window_days?: number
        }
        Update: {
          agent_id?: string
          computed_at?: string
          contributing_factors?: Json
          drift_band?: string
          drift_score?: number
          id?: string
          tenant_id?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_drift_scores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_drift_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_event_counts: {
        Row: {
          agent_id: string
          event_count: number
          month: string
          tenant_id: string
        }
        Insert: {
          agent_id: string
          event_count?: number
          month: string
          tenant_id: string
        }
        Update: {
          agent_id?: string
          event_count?: number
          month?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_event_counts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_event_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_report_counts: {
        Row: {
          agent_id: string
          month: string
          report_count: number
          tenant_id: string
        }
        Insert: {
          agent_id: string
          month: string
          report_count?: number
          tenant_id: string
        }
        Update: {
          agent_id?: string
          month?: string
          report_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_report_counts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_report_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          description: string | null
          environment: string
          id: string
          inbox_address: string | null
          inbox_status: string | null
          metadata: Json
          model: string | null
          model_hash: string | null
          name: string
          status: string
          tenant_id: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          inbox_address?: string | null
          inbox_status?: string | null
          metadata?: Json
          model?: string | null
          model_hash?: string | null
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          inbox_address?: string | null
          inbox_status?: string | null
          metadata?: Json
          model?: string | null
          model_hash?: string | null
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          environment: string
          id: string
          key_hash: string
          key_prefix: string
          name: string
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          key_hash: string
          key_prefix: string
          name: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string
          actor_type: string
          affected_id: string | null
          created_at: string
          description: string
          entry_hash: string | null
          environment: string
          event_type: string
          id: string
          metadata: Json
          tenant_id: string | null
        }
        Insert: {
          actor_id: string
          actor_type: string
          affected_id?: string | null
          created_at?: string
          description: string
          entry_hash?: string | null
          environment?: string
          event_type: string
          id?: string
          metadata?: Json
          tenant_id?: string | null
        }
        Update: {
          actor_id?: string
          actor_type?: string
          affected_id?: string | null
          created_at?: string
          description?: string
          entry_hash?: string | null
          environment?: string
          event_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_access: {
        Row: {
          accessed_by: string
          actor_type: string
          created_at: string
          filters: Json
          id: string
          purpose: string
          row_count: number
          tenant_id: string
        }
        Insert: {
          accessed_by: string
          actor_type: string
          created_at?: string
          filters?: Json
          id?: string
          purpose: string
          row_count?: number
          tenant_id: string
        }
        Update: {
          accessed_by?: string
          actor_type?: string
          created_at?: string
          filters?: Json
          id?: string
          purpose?: string
          row_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_events: {
        Row: {
          action_type: string
          agent_id: string
          chain_id: string | null
          created_at: string
          environment: string
          factors: string[]
          id: string
          occurred_at: string
          payload: Json
          risk_band: string
          risk_score: number
          source_ip: string | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          agent_id: string
          chain_id?: string | null
          created_at?: string
          environment?: string
          factors?: string[]
          id?: string
          occurred_at?: string
          payload?: Json
          risk_band: string
          risk_score: number
          source_ip?: string | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          agent_id?: string
          chain_id?: string | null
          created_at?: string
          environment?: string
          factors?: string[]
          id?: string
          occurred_at?: string
          payload?: Json
          risk_band?: string
          risk_score?: number
          source_ip?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_events_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "decision_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          agent_id: string
          certificate_pem: string
          created_at: string
          environment: string
          expires_at: string
          halt_receipt: Json | null
          id: string
          issued_at: string
          kms_key_arn: string
          revocation_reason: string | null
          revoked_at: string | null
          serial_number: string
          status: string
          tenant_id: string
          vc_jwt: string | null
        }
        Insert: {
          agent_id: string
          certificate_pem: string
          created_at?: string
          environment?: string
          expires_at?: string
          halt_receipt?: Json | null
          id?: string
          issued_at?: string
          kms_key_arn: string
          revocation_reason?: string | null
          revoked_at?: string | null
          serial_number: string
          status?: string
          tenant_id: string
          vc_jwt?: string | null
        }
        Update: {
          agent_id?: string
          certificate_pem?: string
          created_at?: string
          environment?: string
          expires_at?: string
          halt_receipt?: Json | null
          id?: string
          issued_at?: string
          kms_key_arn?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string
          vc_jwt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          escalation_reason: string | null
          id: string
          model_used: string | null
          needs_human_review: boolean | null
          role: string
          tenant_id: string
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          escalation_reason?: string | null
          id?: string
          model_used?: string | null
          needs_human_review?: boolean | null
          role: string
          tenant_id: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          escalation_reason?: string | null
          id?: string
          model_used?: string | null
          needs_human_review?: boolean | null
          role?: string
          tenant_id?: string
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          agent_id: string | null
          created_at: string
          environment: string
          id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          status: string
          summary: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          environment?: string
          id?: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          status?: string
          summary?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          environment?: string
          id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          status?: string
          summary?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          external_message_id: string | null
          external_thread_id: string | null
          id: string
          last_message_at: string
          source: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          external_message_id?: string | null
          external_thread_id?: string | null
          id?: string
          last_message_at?: string
          source?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          external_message_id?: string | null
          external_thread_id?: string | null
          id?: string
          last_message_at?: string
          source?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crl_cache: {
        Row: {
          der_hex: string
          generated_at: string
          id: number
          next_update_at: string
          revoked_count: number
        }
        Insert: {
          der_hex: string
          generated_at?: string
          id?: number
          next_update_at: string
          revoked_count?: number
        }
        Update: {
          der_hex?: string
          generated_at?: string
          id?: number
          next_update_at?: string
          revoked_count?: number
        }
        Relationships: []
      }
      decision_chains: {
        Row: {
          chain_hash: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          event_count: number | null
          id: string
          metadata: Json
          name: string
          status: string
          tenant_id: string
        }
        Insert: {
          chain_hash?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          event_count?: number | null
          id?: string
          metadata?: Json
          name: string
          status?: string
          tenant_id: string
        }
        Update: {
          chain_hash?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          event_count?: number | null
          id?: string
          metadata?: Json
          name?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          agentmail_enabled: boolean
          autonomous_reply_enabled: boolean
          created_at: string
          debug_chat_enabled: boolean
          id: string
          max_agents: number
          reports_enabled: boolean
          tenant_id: string
          updated_at: string
          webhooks_enabled: boolean
        }
        Insert: {
          agentmail_enabled?: boolean
          autonomous_reply_enabled?: boolean
          created_at?: string
          debug_chat_enabled?: boolean
          id?: string
          max_agents?: number
          reports_enabled?: boolean
          tenant_id: string
          updated_at?: string
          webhooks_enabled?: boolean
        }
        Update: {
          agentmail_enabled?: boolean
          autonomous_reply_enabled?: boolean
          created_at?: string
          debug_chat_enabled?: boolean
          id?: string
          max_agents?: number
          reports_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          webhooks_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          api_key_enc: string | null
          config: Json
          created_at: string
          enabled: boolean
          endpoint_url: string | null
          error_message: string | null
          headers_enc: string | null
          id: string
          last_sync: string | null
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key_enc?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          endpoint_url?: string | null
          error_message?: string | null
          headers_enc?: string | null
          id?: string
          last_sync?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key_enc?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          endpoint_url?: string | null
          error_message?: string | null
          headers_enc?: string | null
          id?: string
          last_sync?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_alert_channels: {
        Row: {
          channel_type: string
          config: Json
          created_at: string
          credentials_enc: string
          id: string
          is_active: boolean
          tenant_id: string
        }
        Insert: {
          channel_type: string
          config?: Json
          created_at?: string
          credentials_enc: string
          id?: string
          is_active?: boolean
          tenant_id: string
        }
        Update: {
          channel_type?: string
          config?: Json
          created_at?: string
          credentials_enc?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_alert_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          discord_guild_id: string | null
          email: string
          id: string
          name: string
          plan: string
          plan_tier: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_agent_limit: number
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_guild_id?: string | null
          email: string
          id?: string
          name: string
          plan?: string
          plan_tier?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_agent_limit?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_guild_id?: string | null
          email?: string
          id?: string
          name?: string
          plan?: string
          plan_tier?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_agent_limit?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trust_signals: {
        Row: {
          fetched_at: string
          id: string
          published_at: string | null
          risk_cls: string
          source: string | null
          title: string
          url: string
        }
        Insert: {
          fetched_at?: string
          id?: string
          published_at?: string | null
          risk_cls?: string
          source?: string | null
          title: string
          url: string
        }
        Update: {
          fetched_at?: string
          id?: string
          published_at?: string | null
          risk_cls?: string
          source?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          tenant_id: string
          webhook_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          tenant_id: string
          webhook_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          tenant_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          environment: string
          events: string[]
          id: string
          secret_enc: string
          secret_hash: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          environment?: string
          events: string[]
          id?: string
          secret_enc?: string
          secret_hash: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          environment?: string
          events?: string[]
          id?: string
          secret_enc?: string
          secret_hash?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_overview_summary: {
        Args: { p_since: string; p_tenant_id: string }
        Returns: {
          active_certs: number
          debug_chat_enabled: boolean
          events_today: number
          high_risk_count: number
          total_agents: number
        }[]
      }
      increment_event_count: {
        Args: { p_agent_id: string; p_month: string; p_tenant_id: string }
        Returns: undefined
      }
      increment_report_count: {
        Args: { p_agent_id: string; p_month: string; p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// ── Domain enums (hand-maintained — not generated from the DB schema) ───────
export type ActionType =
  | 'api_call'
  | 'authentication_attempt'
  | 'authentication_failure'
  | 'data_access'
  | 'data_mutation'
  | 'transaction_initiated'
  | 'transaction_anomaly'
  | 'unauthorized_access_attempt'
  | 'message_signed'
  | 'message_verification_failed'
  | 'kill_switch_activated';

export type RiskBand = 'low' | 'medium' | 'high';

export type AgentStatus = 'pending' | 'active' | 'suspended' | 'retired';

export type ActorType = 'user' | 'agent' | 'system';
