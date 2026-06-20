import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { FounderProfile, calculateCompletenessScore } from '@/types/profile'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export interface OnboardingState {
  currentStep: number
  profile: Partial<FounderProfile>
  isSubmitting: boolean
  painDumpSuggestions: string[]
  isLoadingSuggestions: boolean
  
  // Actions
  setStep: (step: number) => void
  updateProfile: (updates: Partial<FounderProfile> | ((prev: Partial<FounderProfile>) => Partial<FounderProfile>)) => void
  saveProgressToDb: () => Promise<void>
  loadProgressFromDb: () => Promise<boolean>
  resetStore: () => void
  setPainDumpSuggestions: (suggestions: string[]) => void
  setIsLoadingSuggestions: (loading: boolean) => void
}

const initialProfile: Partial<FounderProfile> = {
  identity: {
    fullName: '',
    displayName: '',
    timezone: typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York',
    workingHours: '9am - 5pm',
    feedbackStyle: 'direct',
    technicalLevel: 'intermediate' as any,
    startupExperience: 'first-time'
  },
  venture: {
    idea: '',
    stage: 'ideation',
    domain: '',
    painOrigin: '',
    productName: '',
    hasName: false
  },
  market: {
    targetCustomer: {
      jobTitle: '',
      companySize: '1-10',
      type: 'B2B'
    },
    competitors: [],
    positioningAdvantage: '',
    hasCustomerConversations: false
  },
  execution: {
    cyclePosition: 'pre-validation',
    bottleneck: 'unclear-idea',
    tools: [],
    weeklyAvailability: '5-15 hrs',
    fundingPath: 'bootstrapping'
  },
  voice: {
    writingSamples: [],
    contentChannels: [],
    communicationStyle: ''
  },
  momentum: {
    score: 50,
    lastUpdated: new Date().toISOString()
  },
  completenessScore: 0
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      profile: initialProfile,
      isSubmitting: false,
      painDumpSuggestions: [],
      isLoadingSuggestions: false,

      setStep: (step: number) => set({ currentStep: step }),

      updateProfile: (updates) => {
        set((state) => {
          const newProfile = typeof updates === 'function' ? updates(state.profile) : {
            ...state.profile,
            ...updates,
            // Deep merge for nested objects if present in updates
            identity: updates.identity ? { ...state.profile.identity, ...updates.identity } : state.profile.identity,
            venture: updates.venture ? { ...state.profile.venture, ...updates.venture } : state.profile.venture,
            market: updates.market ? { ...state.profile.market, ...updates.market } : state.profile.market,
            execution: updates.execution ? { ...state.profile.execution, ...updates.execution } : state.profile.execution,
            voice: updates.voice ? { ...state.profile.voice, ...updates.voice } : state.profile.voice
          } as Partial<FounderProfile>

          const completeness = calculateCompletenessScore(newProfile)
          newProfile.completenessScore = completeness

          return { profile: newProfile }
        })
      },

      saveProgressToDb: async () => {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const currentStep = get().currentStep
        const profile = get().profile

        // Save current onboarding state
        await supabase
          .from('founder_memory')
          .upsert({
            founder_id: user.id,
            namespace: 'onboarding',
            key: 'onboarding_progress_state',
            value: {
              currentStep,
              profile,
              updatedAt: new Date().toISOString()
            }
          }, { onConflict: 'founder_id,namespace,key' })
      },

      loadProgressFromDb: async () => {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const { data: memory } = await supabase
          .from('founder_memory')
          .select('value')
          .eq('founder_id', user.id)
          .eq('namespace', 'onboarding')
          .eq('key', 'onboarding_progress_state')
          .maybeSingle()

        if (memory?.value) {
          const val = memory.value as { currentStep: number; profile: Partial<FounderProfile> }
          set({
            currentStep: val.currentStep || 1,
            profile: {
              ...initialProfile,
              ...val.profile,
              completenessScore: calculateCompletenessScore(val.profile || {})
            }
          })
          return true
        }
        return false
      },

      resetStore: () => set({ currentStep: 1, profile: initialProfile, painDumpSuggestions: [] }),
      setPainDumpSuggestions: (suggestions) => set({ painDumpSuggestions: suggestions }),
      setIsLoadingSuggestions: (loading) => set({ isLoadingSuggestions: loading })
    }),
    {
      name: 'karnex-onboarding-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
