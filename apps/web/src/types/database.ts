export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      automation_logs: {
        Row: {
          id: string
          founder_id: string
          integration_id: string | null
          rule_name: string
          trigger_event: string
          action_taken: string
          status: "triggered" | "success" | "failed"
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          integration_id?: string | null
          rule_name: string
          trigger_event: string
          action_taken: string
          status?: "triggered" | "success" | "failed"
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          integration_id?: string | null
          rule_name?: string
          trigger_event?: string
          action_taken?: string
          status?: "triggered" | "success" | "failed"
          metadata?: Json
          created_at?: string
        }
      }
      founders: {
        Row: {
          id: string
          full_name: string
          display_name: string | null
          avatar_url: string | null
          timezone: string
          technical_level: "beginner" | "intermediate" | "advanced"
          weekly_hours_available: number
          primary_goal: string | null
          onboarding_completed: boolean
          current_startup_id: string | null
          momentum_score: number
          last_standup_at: string | null
          streak_days: number
          communication_tone: "formal" | "casual" | "direct"
          preferred_agent_speed: "fast" | "thorough"
          created_at: string
          updated_at: string
          last_journey_view: string | null
          onboarding_step: number
          onboarding_completed_at: string | null
        }
        Insert: {
          id: string
          full_name: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          technical_level?: "beginner" | "intermediate" | "advanced"
          weekly_hours_available?: number
          primary_goal?: string | null
          onboarding_completed?: boolean
          current_startup_id?: string | null
          momentum_score?: number
          last_standup_at?: string | null
          streak_days?: number
          communication_tone?: "formal" | "casual" | "direct"
          preferred_agent_speed?: "fast" | "thorough"
          created_at?: string
          updated_at?: string
          last_journey_view?: string | null
          onboarding_step?: number
          onboarding_completed_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          display_name?: string | null
          avatar_url?: string | null
          timezone?: string
          technical_level?: "beginner" | "intermediate" | "advanced"
          weekly_hours_available?: number
          primary_goal?: string | null
          onboarding_completed?: boolean
          current_startup_id?: string | null
          momentum_score?: number
          last_standup_at?: string | null
          streak_days?: number
          communication_tone?: "formal" | "casual" | "direct"
          preferred_agent_speed?: "fast" | "thorough"
          created_at?: string
          updated_at?: string
          last_journey_view?: string | null
          onboarding_step?: number
          onboarding_completed_at?: string | null
        }
      }
      startups: {
        Row: {
          id: string
          founder_id: string
          name: string
          tagline: string | null
          description: string | null
          industry: string | null
          target_audience: string | null
          stage: "ideation" | "validation" | "building" | "launching" | "growing"
          is_active: boolean
          website_url: string | null
          github_repo_url: string | null
          landing_page_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          name: string
          tagline?: string | null
          description?: string | null
          industry?: string | null
          target_audience?: string | null
          stage?: "ideation" | "validation" | "building" | "launching" | "growing"
          is_active?: boolean
          website_url?: string | null
          github_repo_url?: string | null
          landing_page_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          name?: string
          tagline?: string | null
          description?: string | null
          industry?: string | null
          target_audience?: string | null
          stage?: "ideation" | "validation" | "building" | "launching" | "growing"
          is_active?: boolean
          website_url?: string | null
          github_repo_url?: string | null
          landing_page_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ideas: {
        Row: {
          id: string
          startup_id: string
          founder_id: string
          title: string
          pain_description: string
          problem_statement: string | null
          proposed_solution: string | null
          pain_intensity_score: number | null
          market_size_score: number | null
          buildability_score: number | null
          overall_score: number | null
          product_brief: Json
          icp_document: Json
          competitive_landscape: Json
          status: Database["public"]["Enums"]["idea_status"]
          selected_at: string | null
          rejected_reason: string | null
          generated_by: string | null
          agent_run_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id: string
          title: string
          pain_description: string
          problem_statement?: string | null
          proposed_solution?: string | null
          pain_intensity_score?: number | null
          market_size_score?: number | null
          buildability_score?: number | null
          overall_score?: number | null
          product_brief?: Json
          icp_document?: Json
          competitive_landscape?: Json
          status?: Database["public"]["Enums"]["idea_status"]
          selected_at?: string | null
          rejected_reason?: string | null
          generated_by?: string | null
          agent_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string
          title?: string
          pain_description?: string
          problem_statement?: string | null
          proposed_solution?: string | null
          pain_intensity_score?: number | null
          market_size_score?: number | null
          buildability_score?: number | null
          overall_score?: number | null
          product_brief?: Json
          icp_document?: Json
          competitive_landscape?: Json
          status?: Database["public"]["Enums"]["idea_status"]
          selected_at?: string | null
          rejected_reason?: string | null
          generated_by?: string | null
          agent_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roadmaps: {
        Row: {
          id: string
          startup_id: string
          founder_id: string
          title: string
          version: number
          is_active: boolean
          phases: Json
          current_phase: Database["public"]["Enums"]["roadmap_phase"]
          founder_capacity_hours: number | null
          technical_level: string | null
          budget_monthly: number | null
          generated_by: string | null
          agent_run_id: string | null
          start_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id: string
          title?: string
          version?: number
          is_active?: boolean
          phases: Json
          current_phase?: Database["public"]["Enums"]["roadmap_phase"]
          founder_capacity_hours?: number | null
          technical_level?: string | null
          budget_monthly?: number | null
          generated_by?: string | null
          agent_run_id?: string | null
          start_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string
          title?: string
          version?: number
          is_active?: boolean
          phases?: Json
          current_phase?: Database["public"]["Enums"]["roadmap_phase"]
          founder_capacity_hours?: number | null
          technical_level?: string | null
          budget_monthly?: number | null
          generated_by?: string | null
          agent_run_id?: string | null
          start_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sprints: {
        Row: {
          id: string
          roadmap_id: string
          founder_id: string
          sprint_number: number
          title: string
          week_start: string
          week_end: string
          goals: Json
          focus_area: string | null
          capacity_hours: number | null
          status: Database["public"]["Enums"]["sprint_status"]
          completion_percentage: number
          retro_notes: string | null
          lessons_learned: Json
          generated_by: string | null
          agent_run_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          roadmap_id: string
          founder_id: string
          sprint_number: number
          title: string
          week_start: string
          week_end: string
          goals?: Json
          focus_area?: string | null
          capacity_hours?: number | null
          status?: Database["public"]["Enums"]["sprint_status"]
          completion_percentage?: number
          retro_notes?: string | null
          lessons_learned?: Json
          generated_by?: string | null
          agent_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          roadmap_id?: string
          founder_id?: string
          sprint_number?: number
          title?: string
          week_start?: string
          week_end?: string
          goals?: Json
          focus_area?: string | null
          capacity_hours?: number | null
          status?: Database["public"]["Enums"]["sprint_status"]
          completion_percentage?: number
          retro_notes?: string | null
          lessons_learned?: Json
          generated_by?: string | null
          agent_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          sprint_id: string
          founder_id: string
          title: string
          description: string | null
          priority: number
          estimated_hours: number | null
          actual_hours: number | null
          category: "build" | "research" | "outreach" | "content" | "design" | "finance" | "legal" | "other"
          delegated_to_agent: string | null
          agent_run_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          completed_at: string | null
          blocked_reason: string | null
          definition_of_done: string | null
          created_at: string
          updated_at: string
          agent_config: Json
          agent_output: Json
          execute_label: string | null
          auto_executable: boolean
          execution_started_at: string | null
          execution_completed_at: string | null
        }
        Insert: {
          id?: string
          sprint_id: string
          founder_id: string
          title: string
          description?: string | null
          priority?: number
          estimated_hours?: number | null
          actual_hours?: number | null
          category?: "build" | "research" | "outreach" | "content" | "design" | "finance" | "legal" | "other"
          delegated_to_agent?: string | null
          agent_run_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          completed_at?: string | null
          blocked_reason?: string | null
          definition_of_done?: string | null
          created_at?: string
          updated_at?: string
          agent_config?: Json
          agent_output?: Json
          execute_label?: string | null
          auto_executable?: boolean
          execution_started_at?: string | null
          execution_completed_at?: string | null
        }
        Update: {
          id?: string
          sprint_id?: string
          founder_id?: string
          title?: string
          description?: string | null
          priority?: number
          estimated_hours?: number | null
          actual_hours?: number | null
          category?: "build" | "research" | "outreach" | "content" | "design" | "finance" | "legal" | "other"
          delegated_to_agent?: string | null
          agent_run_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          completed_at?: string | null
          blocked_reason?: string | null
          definition_of_done?: string | null
          created_at?: string
          updated_at?: string
          agent_config?: Json
          agent_output?: Json
          execute_label?: string | null
          auto_executable?: boolean
          execution_started_at?: string | null
          execution_completed_at?: string | null
        }
      }
      agent_runs: {
        Row: {
          id: string
          founder_id: string
          agent_id: string
          agent_version: string
          status: Database["public"]["Enums"]["agent_status"]
          input: Json
          triggered_by: string
          parent_run_id: string | null
          chain_id: string | null
          started_at: string | null
          completed_at: string | null
          duration_ms: number | null
          tokens_input: number
          tokens_output: number
          tokens_total: number
          llm_model: string | null
          tools_called: string[]
          integrations_called: string[]
          error_message: string | null
          error_type: string | null
          retry_count: number
          credits_consumed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          agent_id: string
          agent_version?: string
          status?: Database["public"]["Enums"]["agent_status"]
          input?: Json
          triggered_by?: string
          parent_run_id?: string | null
          chain_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number
          llm_model?: string | null
          tools_called?: string[]
          integrations_called?: string[]
          error_message?: string | null
          error_type?: string | null
          retry_count?: number
          credits_consumed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          agent_id?: string
          agent_version?: string
          status?: Database["public"]["Enums"]["agent_status"]
          input?: Json
          triggered_by?: string
          parent_run_id?: string | null
          chain_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          tokens_input?: number
          tokens_output?: number
          tokens_total?: number
          llm_model?: string | null
          tools_called?: string[]
          integrations_called?: string[]
          error_message?: string | null
          error_type?: string | null
          retry_count?: number
          credits_consumed?: number
          created_at?: string
          updated_at?: string
        }
      }
      agent_outputs: {
        Row: {
          id: string
          agent_run_id: string
          founder_id: string
          output_type: string
          output: Json
          confidence: Database["public"]["Enums"]["confidence_level"]
          confidence_rationale: string | null
          suggested_next_agent: string | null
          handoff_context: Json | null
          memory_updates: Json
          has_flags: boolean
          flags: Json
          created_at: string
        }
        Insert: {
          id?: string
          agent_run_id: string
          founder_id: string
          output_type: string
          output: Json
          confidence?: Database["public"]["Enums"]["confidence_level"]
          confidence_rationale?: string | null
          suggested_next_agent?: string | null
          handoff_context?: Json | null
          memory_updates?: Json
          has_flags?: boolean
          flags?: Json
          created_at?: string
        }
        Update: {
          id?: string
          agent_run_id?: string
          founder_id?: string
          output_type?: string
          output?: Json
          confidence?: Database["public"]["Enums"]["confidence_level"]
          confidence_rationale?: string | null
          suggested_next_agent?: string | null
          handoff_context?: Json | null
          memory_updates?: Json
          has_flags?: boolean
          flags?: Json
          created_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          founder_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          status: Database["public"]["Enums"]["integration_status"]
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          scopes: string[]
          metadata: Json
          connected_at: string | null
          last_used_at: string | null
          created_at: string
          updated_at: string
          automation_rules: Json
          display_name: string | null
          description: string | null
          icon_url: string | null
          is_featured: boolean | null
        }
        Insert: {
          id?: string
          founder_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          metadata?: Json
          connected_at?: string | null
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
          automation_rules?: Json
          display_name?: string | null
          description?: string | null
          icon_url?: string | null
          is_featured?: boolean | null
        }
        Update: {
          id?: string
          founder_id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"]
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          scopes?: string[]
          metadata?: Json
          connected_at?: string | null
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
          automation_rules?: Json
          display_name?: string | null
          description?: string | null
          icon_url?: string | null
          is_featured?: boolean | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          founder_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          started_at: string
          expires_at: string
          renewed_at: string | null
          cancelled_at: string | null
          tasks_used_this_cycle: number
          tasks_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          started_at?: string
          expires_at: string
          renewed_at?: string | null
          cancelled_at?: string | null
          tasks_used_this_cycle?: number
          tasks_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          started_at?: string
          expires_at?: string
          renewed_at?: string | null
          cancelled_at?: string | null
          tasks_used_this_cycle?: number
          tasks_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          founder_id: string
          subscription_id: string | null
          oxapay_track_id: string
          oxapay_order_id: string
          amount_usd: number
          currency: Database["public"]["Enums"]["stablecoin_currency"]
          amount_crypto: number | null
          status: Database["public"]["Enums"]["payment_status"]
          plan: Database["public"]["Enums"]["subscription_plan"]
          period_start: string | null
          period_end: string | null
          webhook_received_at: string | null
          raw_webhook_payload: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          subscription_id?: string | null
          oxapay_track_id: string
          oxapay_order_id: string
          amount_usd: number
          currency: Database["public"]["Enums"]["stablecoin_currency"]
          amount_crypto?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          plan: Database["public"]["Enums"]["subscription_plan"]
          period_start?: string | null
          period_end?: string | null
          webhook_received_at?: string | null
          raw_webhook_payload?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          subscription_id?: string | null
          oxapay_track_id?: string
          oxapay_order_id?: string
          amount_usd?: number
          currency?: Database["public"]["Enums"]["stablecoin_currency"]
          amount_crypto?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          plan?: Database["public"]["Enums"]["subscription_plan"]
          period_start?: string | null
          period_end?: string | null
          webhook_received_at?: string | null
          raw_webhook_payload?: Json
          created_at?: string
          updated_at?: string
        }
      }
      renewal_reminders: {
        Row: {
          id: string
          founder_id: string
          subscription_id: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at: string
          payment_link: string
          payment_link_expires: string
          opened: boolean
          converted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          subscription_id: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string
          payment_link: string
          payment_link_expires: string
          opened?: boolean
          converted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          subscription_id?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string
          payment_link?: string
          payment_link_expires?: string
          opened?: boolean
          converted?: boolean
          created_at?: string
        }
      }
      founder_memory: {
        Row: {
          id: string
          founder_id: string
          namespace: string
          key: string
          value: Json
          tags: string[]
          ttl: string | null
          access_count: number
          last_accessed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          namespace: string
          key: string
          value: Json
          tags?: string[]
          ttl?: string | null
          access_count?: number
          last_accessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          namespace?: string
          key?: string
          value?: Json
          tags?: string[]
          ttl?: string | null
          access_count?: number
          last_accessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      decisions: {
        Row: {
          id: string
          startup_id: string
          founder_id: string
          title: string
          description: string
          rationale: string | null
          alternatives_considered: Json
          category: "product" | "technical" | "market" | "financial" | "team" | "strategy" | "pivot" | null
          reversibility: Database["public"]["Enums"]["decision_reversibility"]
          confidence: Database["public"]["Enums"]["confidence_level"]
          expected_outcome: string | null
          actual_outcome: string | null
          outcome_reviewed_at: string | null
          outcome_matched: boolean | null
          related_agent_run_id: string | null
          related_milestone_id: string | null
          tags: string[]
          decided_at: string | null
          review_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id: string
          title: string
          description: string
          rationale?: string | null
          alternatives_considered?: Json
          category?: "product" | "technical" | "market" | "financial" | "team" | "strategy" | "pivot" | null
          reversibility?: Database["public"]["Enums"]["decision_reversibility"]
          confidence?: Database["public"]["Enums"]["confidence_level"]
          expected_outcome?: string | null
          actual_outcome?: string | null
          outcome_reviewed_at?: string | null
          outcome_matched?: boolean | null
          related_agent_run_id?: string | null
          related_milestone_id?: string | null
          tags?: string[]
          decided_at?: string | null
          review_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string
          title?: string
          description?: string
          rationale?: string | null
          alternatives_considered?: Json
          category?: "product" | "technical" | "market" | "financial" | "team" | "strategy" | "pivot" | null
          reversibility?: Database["public"]["Enums"]["decision_reversibility"]
          confidence?: Database["public"]["Enums"]["confidence_level"]
          expected_outcome?: string | null
          actual_outcome?: string | null
          outcome_reviewed_at?: string | null
          outcome_matched?: boolean | null
          related_agent_run_id?: string | null
          related_milestone_id?: string | null
          tags?: string[]
          decided_at?: string | null
          review_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      milestones: {
        Row: {
          id: string
          roadmap_id: string
          founder_id: string
          title: string
          description: string | null
          phase: Database["public"]["Enums"]["roadmap_phase"]
          target_date: string | null
          target_metric: string | null
          target_value: number | null
          current_value: number | null
          status: Database["public"]["Enums"]["milestone_status"]
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          roadmap_id: string
          founder_id: string
          title: string
          description?: string | null
          phase: Database["public"]["Enums"]["roadmap_phase"]
          target_date?: string | null
          target_metric?: string | null
          target_value?: number | null
          current_value?: number | null
          status?: Database["public"]["Enums"]["milestone_status"]
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          roadmap_id?: string
          founder_id?: string
          title?: string
          description?: string | null
          phase?: Database["public"]["Enums"]["roadmap_phase"]
          target_date?: string | null
          target_metric?: string | null
          target_value?: number | null
          current_value?: number | null
          status?: Database["public"]["Enums"]["milestone_status"]
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      outreach_campaigns: {
        Row: {
          id: string
          startup_id: string
          founder_id: string
          name: string
          goal: string
          channel: "email" | "linkedin" | "both" | null
          message_templates: Json
          status: Database["public"]["Enums"]["campaign_status"]
          approved_at: string | null
          total_contacts: number
          sent_count: number
          opened_count: number
          replied_count: number
          bounced_count: number
          generated_by: string | null
          agent_run_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id: string
          name: string
          goal: string
          channel?: "email" | "linkedin" | "both" | null
          message_templates?: Json
          status?: Database["public"]["Enums"]["campaign_status"]
          approved_at?: string | null
          total_contacts?: number
          sent_count?: number
          opened_count?: number
          replied_count?: number
          bounced_count?: number
          generated_by?: string | null
          agent_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string
          name?: string
          goal?: string
          channel?: "email" | "linkedin" | "both" | null
          message_templates?: Json
          status?: Database["public"]["Enums"]["campaign_status"]
          approved_at?: string | null
          total_contacts?: number
          sent_count?: number
          opened_count?: number
          replied_count?: number
          bounced_count?: number
          generated_by?: string | null
          agent_run_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      outreach_contacts: {
        Row: {
          id: string
          campaign_id: string
          founder_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          company: string | null
          title: string | null
          linkedin_url: string | null
          personalization_data: Json
          status: Database["public"]["Enums"]["contact_status"]
          current_step: number
          last_sent_at: string | null
          opened_at: string | null
          replied_at: string | null
          reply_sentiment: "positive" | "neutral" | "negative" | "unsubscribe" | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          founder_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          title?: string | null
          linkedin_url?: string | null
          personalization_data?: Json
          status?: Database["public"]["Enums"]["contact_status"]
          current_step?: number
          last_sent_at?: string | null
          opened_at?: string | null
          replied_at?: string | null
          reply_sentiment?: "positive" | "neutral" | "negative" | "unsubscribe" | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          founder_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          title?: string | null
          linkedin_url?: string | null
          personalization_data?: Json
          status?: Database["public"]["Enums"]["contact_status"]
          current_step?: number
          last_sent_at?: string | null
          opened_at?: string | null
          replied_at?: string | null
          reply_sentiment?: "positive" | "neutral" | "negative" | "unsubscribe" | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_agent_credit: {
        Args: {
          p_founder_id: string
        }
        Returns: number
      }
      acquire_integration_lock: {
        Args: {
          p_founder_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_status: "queued" | "running" | "success" | "partial" | "error" | "cancelled" | "timeout"
      subscription_plan: "starter" | "builder" | "founder" | "studio"
      subscription_status: "trialing" | "pending_payment" | "active" | "expiring_soon" | "expired" | "cancelled"
      stablecoin_currency: "USDT" | "USDC"
      payment_status: "pending" | "confirming" | "confirmed" | "expired" | "failed"
      reminder_type: "5_day" | "1_day" | "expired"
      task_status: "todo" | "in_progress" | "done" | "blocked" | "deferred"
      sprint_status: "planned" | "active" | "completed" | "cancelled"
      contact_status: "pending" | "draft_created" | "sent" | "opened" | "replied" | "bounced" | "unsubscribed"
      campaign_status: "draft" | "pending_approval" | "approved" | "sending" | "active" | "paused" | "completed"
      integration_provider: "github" | "gmail" | "linkedin" | "stripe [v2 - deferred]" | "notion" | "airtable" | "posthog" | "calcom"
      integration_status: "active" | "expired" | "revoked" | "error"
      milestone_status: "not_started" | "in_progress" | "at_risk" | "completed" | "missed"
      idea_status: "hypothesis" | "exploring" | "validated" | "rejected" | "selected"
      roadmap_phase: "phase_1" | "phase_2" | "phase_3"
      decision_reversibility: "easily_reversible" | "hard_to_reverse" | "irreversible"
      confidence_level: "low" | "medium" | "high"
    }
  }
}

// Custom defined interfaces for application use
export interface TaskAgentConfig {
  agent_id: string;
  pre_populated_input: Record<string, unknown>;
  context_summary: string;
  estimated_duration_seconds: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;
