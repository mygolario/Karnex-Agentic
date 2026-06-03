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
      agent_outputs: {
        Row: {
          agent_run_id: string
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          confidence_rationale: string | null
          created_at: string
          flags: Json | null
          founder_id: string
          handoff_context: Json | null
          has_flags: boolean | null
          id: string
          memory_updates: Json | null
          output: Json
          output_type: string
          suggested_next_agent: string | null
        }
        Insert: {
          agent_run_id: string
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          confidence_rationale?: string | null
          created_at?: string
          flags?: Json | null
          founder_id: string
          handoff_context?: Json | null
          has_flags?: boolean | null
          id?: string
          memory_updates?: Json | null
          output: Json
          output_type: string
          suggested_next_agent?: string | null
        }
        Update: {
          agent_run_id?: string
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          confidence_rationale?: string | null
          created_at?: string
          flags?: Json | null
          founder_id?: string
          handoff_context?: Json | null
          has_flags?: boolean | null
          id?: string
          memory_updates?: Json | null
          output?: Json
          output_type?: string
          suggested_next_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: true
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_outputs_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          agent_version: string
          chain_id: string | null
          completed_at: string | null
          created_at: string
          credits_consumed: number | null
          duration_ms: number | null
          error_message: string | null
          error_type: string | null
          founder_id: string
          id: string
          input: Json
          integrations_called: string[] | null
          llm_model: string | null
          logs: Json | null
          parent_run_id: string | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          tools_called: string[] | null
          triggered_by: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          agent_version?: string
          chain_id?: string | null
          completed_at?: string | null
          created_at?: string
          credits_consumed?: number | null
          duration_ms?: number | null
          error_message?: string | null
          error_type?: string | null
          founder_id: string
          id?: string
          input?: Json
          integrations_called?: string[] | null
          llm_model?: string | null
          logs?: Json | null
          parent_run_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          tools_called?: string[] | null
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          agent_version?: string
          chain_id?: string | null
          completed_at?: string | null
          created_at?: string
          credits_consumed?: number | null
          duration_ms?: number | null
          error_message?: string | null
          error_type?: string | null
          founder_id?: string
          id?: string
          input?: Json
          integrations_called?: string[] | null
          llm_model?: string | null
          logs?: Json | null
          parent_run_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          tools_called?: string[] | null
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          action_taken: string
          created_at: string
          founder_id: string
          id: string
          integration_id: string | null
          metadata: Json | null
          rule_name: string
          status: string | null
          trigger_event: string
        }
        Insert: {
          action_taken: string
          created_at?: string
          founder_id: string
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          rule_name: string
          status?: string | null
          trigger_event: string
        }
        Update: {
          action_taken?: string
          created_at?: string
          founder_id?: string
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          rule_name?: string
          status?: string | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_recipe_catalog: {
        Row: {
          action_description: string
          created_at: string
          id: string
          required_providers: string[]
          sort_order: number
          title: string
          trigger_config: Json
          trigger_description: string
          trigger_type: string
        }
        Insert: {
          action_description: string
          created_at?: string
          id: string
          required_providers?: string[]
          sort_order?: number
          title: string
          trigger_config?: Json
          trigger_description: string
          trigger_type: string
        }
        Update: {
          action_description?: string
          created_at?: string
          id?: string
          required_providers?: string[]
          sort_order?: number
          title?: string
          trigger_config?: Json
          trigger_description?: string
          trigger_type?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          actual_outcome: string | null
          alternatives_considered: Json | null
          category: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          decided_at: string | null
          description: string
          expected_outcome: string | null
          founder_id: string
          id: string
          outcome_matched: boolean | null
          outcome_reviewed_at: string | null
          rationale: string | null
          related_agent_run_id: string | null
          related_milestone_id: string | null
          reversibility:
            | Database["public"]["Enums"]["decision_reversibility"]
            | null
          review_by: string | null
          startup_id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_outcome?: string | null
          alternatives_considered?: Json | null
          category?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          decided_at?: string | null
          description: string
          expected_outcome?: string | null
          founder_id: string
          id?: string
          outcome_matched?: boolean | null
          outcome_reviewed_at?: string | null
          rationale?: string | null
          related_agent_run_id?: string | null
          related_milestone_id?: string | null
          reversibility?:
            | Database["public"]["Enums"]["decision_reversibility"]
            | null
          review_by?: string | null
          startup_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_outcome?: string | null
          alternatives_considered?: Json | null
          category?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          decided_at?: string | null
          description?: string
          expected_outcome?: string | null
          founder_id?: string
          id?: string
          outcome_matched?: boolean | null
          outcome_reviewed_at?: string | null
          rationale?: string | null
          related_agent_run_id?: string | null
          related_milestone_id?: string | null
          reversibility?:
            | Database["public"]["Enums"]["decision_reversibility"]
            | null
          review_by?: string | null
          startup_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_related_agent_run_id_fkey"
            columns: ["related_agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_decisions_milestone"
            columns: ["related_milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_memory: {
        Row: {
          access_count: number | null
          created_at: string
          founder_id: string
          id: string
          key: string
          last_accessed_at: string | null
          namespace: string
          tags: string[] | null
          ttl: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          access_count?: number | null
          created_at?: string
          founder_id: string
          id?: string
          key: string
          last_accessed_at?: string | null
          namespace: string
          tags?: string[] | null
          ttl?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          access_count?: number | null
          created_at?: string
          founder_id?: string
          id?: string
          key?: string
          last_accessed_at?: string | null
          namespace?: string
          tags?: string[] | null
          ttl?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "founder_memory_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          avatar_url: string | null
          communication_tone: string | null
          created_at: string
          current_startup_id: string | null
          display_name: string | null
          full_name: string
          id: string
          last_journey_view: string | null
          last_standup_at: string | null
          momentum_score: number | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          preferred_agent_speed: string | null
          primary_goal: string | null
          streak_days: number | null
          technical_level: string | null
          timezone: string | null
          updated_at: string
          weekly_hours_available: number | null
        }
        Insert: {
          avatar_url?: string | null
          communication_tone?: string | null
          created_at?: string
          current_startup_id?: string | null
          display_name?: string | null
          full_name: string
          id: string
          last_journey_view?: string | null
          last_standup_at?: string | null
          momentum_score?: number | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          preferred_agent_speed?: string | null
          primary_goal?: string | null
          streak_days?: number | null
          technical_level?: string | null
          timezone?: string | null
          updated_at?: string
          weekly_hours_available?: number | null
        }
        Update: {
          avatar_url?: string | null
          communication_tone?: string | null
          created_at?: string
          current_startup_id?: string | null
          display_name?: string | null
          full_name?: string
          id?: string
          last_journey_view?: string | null
          last_standup_at?: string | null
          momentum_score?: number | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          preferred_agent_speed?: string | null
          primary_goal?: string | null
          streak_days?: number | null
          technical_level?: string | null
          timezone?: string | null
          updated_at?: string
          weekly_hours_available?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_founders_current_startup"
            columns: ["current_startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          agent_run_id: string | null
          buildability_score: number | null
          competitive_landscape: Json | null
          created_at: string
          founder_id: string
          generated_by: string | null
          icp_document: Json | null
          id: string
          market_size_score: number | null
          overall_score: number | null
          pain_description: string
          pain_intensity_score: number | null
          problem_statement: string | null
          product_brief: Json | null
          proposed_solution: string | null
          rejected_reason: string | null
          selected_at: string | null
          startup_id: string
          status: Database["public"]["Enums"]["idea_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_run_id?: string | null
          buildability_score?: number | null
          competitive_landscape?: Json | null
          created_at?: string
          founder_id: string
          generated_by?: string | null
          icp_document?: Json | null
          id?: string
          market_size_score?: number | null
          overall_score?: number | null
          pain_description: string
          pain_intensity_score?: number | null
          problem_statement?: string | null
          product_brief?: Json | null
          proposed_solution?: string | null
          rejected_reason?: string | null
          selected_at?: string | null
          startup_id: string
          status?: Database["public"]["Enums"]["idea_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_run_id?: string | null
          buildability_score?: number | null
          competitive_landscape?: Json | null
          created_at?: string
          founder_id?: string
          generated_by?: string | null
          icp_document?: Json | null
          id?: string
          market_size_score?: number | null
          overall_score?: number | null
          pain_description?: string
          pain_intensity_score?: number | null
          problem_statement?: string | null
          product_brief?: Json | null
          proposed_solution?: string | null
          rejected_reason?: string | null
          selected_at?: string | null
          startup_id?: string
          status?: Database["public"]["Enums"]["idea_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token_encrypted: string | null
          automation_rules: Json | null
          connected_at: string | null
          created_at: string
          description: string | null
          display_name: string | null
          founder_id: string
          icon_url: string | null
          id: string
          is_featured: boolean | null
          last_used_at: string | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted: string | null
          scopes: string[] | null
          status: Database["public"]["Enums"]["integration_status"] | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          automation_rules?: Json | null
          connected_at?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          founder_id: string
          icon_url?: string | null
          id?: string
          is_featured?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          automation_rules?: Json | null
          connected_at?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          founder_id?: string
          icon_url?: string | null
          id?: string
          is_featured?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["integration_status"] | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string | null
          founder_id: string
          id: string
          phase: Database["public"]["Enums"]["roadmap_phase"]
          roadmap_id: string
          status: Database["public"]["Enums"]["milestone_status"] | null
          target_date: string | null
          target_metric: string | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          founder_id: string
          id?: string
          phase: Database["public"]["Enums"]["roadmap_phase"]
          roadmap_id: string
          status?: Database["public"]["Enums"]["milestone_status"] | null
          target_date?: string | null
          target_metric?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          founder_id?: string
          id?: string
          phase?: Database["public"]["Enums"]["roadmap_phase"]
          roadmap_id?: string
          status?: Database["public"]["Enums"]["milestone_status"] | null
          target_date?: string | null
          target_metric?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          agent_run_id: string | null
          approved_at: string | null
          bounced_count: number | null
          channel: string | null
          created_at: string
          founder_id: string
          generated_by: string | null
          goal: string
          id: string
          message_templates: Json
          name: string
          opened_count: number | null
          replied_count: number | null
          sent_count: number | null
          startup_id: string
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_contacts: number | null
          updated_at: string
        }
        Insert: {
          agent_run_id?: string | null
          approved_at?: string | null
          bounced_count?: number | null
          channel?: string | null
          created_at?: string
          founder_id: string
          generated_by?: string | null
          goal: string
          id?: string
          message_templates?: Json
          name: string
          opened_count?: number | null
          replied_count?: number | null
          sent_count?: number | null
          startup_id: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_contacts?: number | null
          updated_at?: string
        }
        Update: {
          agent_run_id?: string | null
          approved_at?: string | null
          bounced_count?: number | null
          channel?: string | null
          created_at?: string
          founder_id?: string
          generated_by?: string | null
          goal?: string
          id?: string
          message_templates?: Json
          name?: string
          opened_count?: number | null
          replied_count?: number | null
          sent_count?: number | null
          startup_id?: string
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_contacts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaigns_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaigns_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_contacts: {
        Row: {
          campaign_id: string
          company: string | null
          created_at: string
          current_step: number | null
          email: string | null
          first_name: string | null
          founder_id: string
          id: string
          last_name: string | null
          last_sent_at: string | null
          linkedin_url: string | null
          opened_at: string | null
          personalization_data: Json | null
          replied_at: string | null
          reply_sentiment: string | null
          status: Database["public"]["Enums"]["contact_status"] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          company?: string | null
          created_at?: string
          current_step?: number | null
          email?: string | null
          first_name?: string | null
          founder_id: string
          id?: string
          last_name?: string | null
          last_sent_at?: string | null
          linkedin_url?: string | null
          opened_at?: string | null
          personalization_data?: Json | null
          replied_at?: string | null
          reply_sentiment?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          company?: string | null
          created_at?: string
          current_step?: number | null
          email?: string | null
          first_name?: string | null
          founder_id?: string
          id?: string
          last_name?: string | null
          last_sent_at?: string | null
          linkedin_url?: string | null
          opened_at?: string | null
          personalization_data?: Json | null
          replied_at?: string | null
          reply_sentiment?: string | null
          status?: Database["public"]["Enums"]["contact_status"] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_crypto: number | null
          amount_usd: number
          created_at: string
          currency: Database["public"]["Enums"]["stablecoin_currency"]
          founder_id: string
          id: string
          oxapay_order_id: string
          oxapay_track_id: string
          period_end: string | null
          period_start: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          raw_webhook_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          updated_at: string
          webhook_received_at: string | null
        }
        Insert: {
          amount_crypto?: number | null
          amount_usd: number
          created_at?: string
          currency: Database["public"]["Enums"]["stablecoin_currency"]
          founder_id: string
          id?: string
          oxapay_order_id: string
          oxapay_track_id: string
          period_end?: string | null
          period_start?: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          raw_webhook_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          webhook_received_at?: string | null
        }
        Update: {
          amount_crypto?: number | null
          amount_usd?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["stablecoin_currency"]
          founder_id?: string
          id?: string
          oxapay_order_id?: string
          oxapay_track_id?: string
          period_end?: string | null
          period_start?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          raw_webhook_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          updated_at?: string
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_reminders: {
        Row: {
          converted: boolean
          created_at: string
          founder_id: string
          id: string
          opened: boolean
          payment_link: string
          payment_link_expires: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at: string
          subscription_id: string
        }
        Insert: {
          converted?: boolean
          created_at?: string
          founder_id: string
          id?: string
          opened?: boolean
          payment_link: string
          payment_link_expires: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string
          subscription_id: string
        }
        Update: {
          converted?: boolean
          created_at?: string
          founder_id?: string
          id?: string
          opened?: boolean
          payment_link?: string
          payment_link_expires?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_reminders_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          agent_run_id: string | null
          budget_monthly: number | null
          created_at: string
          current_phase: Database["public"]["Enums"]["roadmap_phase"] | null
          founder_capacity_hours: number | null
          founder_id: string
          generated_by: string | null
          id: string
          is_active: boolean | null
          phases: Json
          start_date: string | null
          startup_id: string
          technical_level: string | null
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          agent_run_id?: string | null
          budget_monthly?: number | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["roadmap_phase"] | null
          founder_capacity_hours?: number | null
          founder_id: string
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          phases: Json
          start_date?: string | null
          startup_id: string
          technical_level?: string | null
          title?: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          agent_run_id?: string | null
          budget_monthly?: number | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["roadmap_phase"] | null
          founder_capacity_hours?: number | null
          founder_id?: string
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          phases?: Json
          start_date?: string | null
          startup_id?: string
          technical_level?: string | null
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmaps_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          agent_run_id: string | null
          capacity_hours: number | null
          completion_percentage: number | null
          created_at: string
          focus_area: string | null
          founder_id: string
          generated_by: string | null
          goals: Json
          id: string
          lessons_learned: Json | null
          retro_notes: string | null
          roadmap_id: string
          sprint_number: number
          status: Database["public"]["Enums"]["sprint_status"] | null
          title: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          agent_run_id?: string | null
          capacity_hours?: number | null
          completion_percentage?: number | null
          created_at?: string
          focus_area?: string | null
          founder_id: string
          generated_by?: string | null
          goals?: Json
          id?: string
          lessons_learned?: Json | null
          retro_notes?: string | null
          roadmap_id: string
          sprint_number: number
          status?: Database["public"]["Enums"]["sprint_status"] | null
          title: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          agent_run_id?: string | null
          capacity_hours?: number | null
          completion_percentage?: number | null
          created_at?: string
          focus_area?: string | null
          founder_id?: string
          generated_by?: string | null
          goals?: Json
          id?: string
          lessons_learned?: Json | null
          retro_notes?: string | null
          roadmap_id?: string
          sprint_number?: number
          status?: Database["public"]["Enums"]["sprint_status"] | null
          title?: string
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          created_at: string
          description: string | null
          founder_id: string
          github_repo_url: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          landing_page_url: string | null
          name: string
          stage: string | null
          tagline: string | null
          target_audience: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          founder_id: string
          github_repo_url?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          landing_page_url?: string | null
          name: string
          stage?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          founder_id?: string
          github_repo_url?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          landing_page_url?: string | null
          name?: string
          stage?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string
          founder_id: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          renewed_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tasks_limit: number
          tasks_used_this_cycle: number
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at: string
          founder_id: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          renewed_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tasks_limit?: number
          tasks_used_this_cycle?: number
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string
          founder_id?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          renewed_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tasks_limit?: number
          tasks_used_this_cycle?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          agent_config: Json | null
          agent_output: Json | null
          agent_run_id: string | null
          auto_executable: boolean | null
          blocked_reason: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          definition_of_done: string | null
          delegated_to_agent: string | null
          description: string | null
          estimated_hours: number | null
          execute_label: string | null
          execution_completed_at: string | null
          execution_started_at: string | null
          founder_id: string
          id: string
          priority: number | null
          sprint_id: string
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          agent_config?: Json | null
          agent_output?: Json | null
          agent_run_id?: string | null
          auto_executable?: boolean | null
          blocked_reason?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          definition_of_done?: string | null
          delegated_to_agent?: string | null
          description?: string | null
          estimated_hours?: number | null
          execute_label?: string | null
          execution_completed_at?: string | null
          execution_started_at?: string | null
          founder_id: string
          id?: string
          priority?: number | null
          sprint_id: string
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          agent_config?: Json | null
          agent_output?: Json | null
          agent_run_id?: string | null
          auto_executable?: boolean | null
          blocked_reason?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          definition_of_done?: string | null
          delegated_to_agent?: string | null
          description?: string | null
          estimated_hours?: number | null
          execute_label?: string | null
          execution_completed_at?: string | null
          execution_started_at?: string | null
          founder_id?: string
          id?: string
          priority?: number | null
          sprint_id?: string
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_integration_lock: {
        Args: { p_founder_id: string }
        Returns: boolean
      }
      deduct_agent_credit: { Args: { p_founder_id: string }; Returns: number }
    }
    Enums: {
      agent_status:
        | "queued"
        | "running"
        | "success"
        | "partial"
        | "error"
        | "cancelled"
        | "timeout"
      campaign_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sending"
        | "active"
        | "paused"
        | "completed"
      confidence_level: "low" | "medium" | "high"
      contact_status:
        | "pending"
        | "draft_created"
        | "sent"
        | "opened"
        | "replied"
        | "bounced"
        | "unsubscribed"
      decision_reversibility:
        | "easily_reversible"
        | "hard_to_reverse"
        | "irreversible"
      idea_status:
        | "hypothesis"
        | "exploring"
        | "validated"
        | "rejected"
        | "selected"
      integration_provider:
        | "github"
        | "gmail"
        | "linkedin"
        | "stripe [v2 - deferred]"
        | "notion"
        | "airtable"
        | "posthog"
        | "calcom"
        | "vercel"
        | "resend"
        | "zapier"
        | "karnex_hub"
      integration_status: "active" | "expired" | "revoked" | "error"
      milestone_status:
        | "not_started"
        | "in_progress"
        | "at_risk"
        | "completed"
        | "missed"
      payment_status:
        | "pending"
        | "confirming"
        | "confirmed"
        | "expired"
        | "failed"
      reminder_type: "5_day" | "1_day" | "expired"
      roadmap_phase: "phase_1" | "phase_2" | "phase_3"
      sprint_status: "planned" | "active" | "completed" | "cancelled"
      stablecoin_currency: "USDT" | "USDC"
      subscription_plan: "starter" | "builder" | "founder" | "studio"
      subscription_status:
        | "trialing"
        | "pending_payment"
        | "active"
        | "expiring_soon"
        | "expired"
        | "cancelled"
      task_status:
        | "todo"
        | "in_progress"
        | "done"
        | "blocked"
        | "deferred"
        | "pending_approval"
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
      agent_status: [
        "queued",
        "running",
        "success",
        "partial",
        "error",
        "cancelled",
        "timeout",
      ],
      campaign_status: [
        "draft",
        "pending_approval",
        "approved",
        "sending",
        "active",
        "paused",
        "completed",
      ],
      confidence_level: ["low", "medium", "high"],
      contact_status: [
        "pending",
        "draft_created",
        "sent",
        "opened",
        "replied",
        "bounced",
        "unsubscribed",
      ],
      decision_reversibility: [
        "easily_reversible",
        "hard_to_reverse",
        "irreversible",
      ],
      idea_status: [
        "hypothesis",
        "exploring",
        "validated",
        "rejected",
        "selected",
      ],
      integration_provider: [
        "github",
        "gmail",
        "linkedin",
        "stripe [v2 - deferred]",
        "notion",
        "airtable",
        "posthog",
        "calcom",
        "vercel",
        "resend",
        "zapier",
        "karnex_hub",
      ],
      integration_status: ["active", "expired", "revoked", "error"],
      milestone_status: [
        "not_started",
        "in_progress",
        "at_risk",
        "completed",
        "missed",
      ],
      payment_status: [
        "pending",
        "confirming",
        "confirmed",
        "expired",
        "failed",
      ],
      reminder_type: ["5_day", "1_day", "expired"],
      roadmap_phase: ["phase_1", "phase_2", "phase_3"],
      sprint_status: ["planned", "active", "completed", "cancelled"],
      stablecoin_currency: ["USDT", "USDC"],
      subscription_plan: ["starter", "builder", "founder", "studio"],
      subscription_status: [
        "trialing",
        "pending_payment",
        "active",
        "expiring_soon",
        "expired",
        "cancelled",
      ],
      task_status: [
        "todo",
        "in_progress",
        "done",
        "blocked",
        "deferred",
        "pending_approval",
      ],
    },
  },
} as const

export interface AutomationRecipeCatalog {
  id: string
  title: string
  trigger_description: string
  action_description: string
  required_providers: string[]
  trigger_type: string
  trigger_config: Json
  sort_order: number
  created_at?: string
}

export interface AutomationRule {
  recipe_id: string
  enabled: boolean
  updated_at?: string
}

export interface TaskAgentConfig {
  agent_id: string
  pre_populated_input: Record<string, unknown>
  context_summary: string
  estimated_duration_seconds: number
  step_labels?: string[]
}

export type OnboardingStep = 0 | 1 | 2 | 3 | 4
