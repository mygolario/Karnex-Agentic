import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ── Types ── */

export interface ForgeProject {
  id: string
  name: string
  techStack: { framework: string; styling: string; database: string }
  status: string
  currentVersion: number
  deploymentUrl?: string
  githubRepoUrl?: string
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'forge' | 'system' | 'design' | 'database' | 'builder' | 'github'
  content: string
  timestamp: string
  type?: 'text' | 'code' | 'status' | 'plan'
}

export interface GeneratedFile {
  path: string
  content: string
  language: string
  description: string
}

export interface BuilderOutput {
  files: GeneratedFile[]
  summary: string
  setup_instructions: string[]
  tests_included: boolean
  deployment_ready: boolean
  suggested_improvements: string[]
  pr_url?: string
}

export interface BuildVersion {
  id: string
  versionNumber: number
  prompt: string
  fileCount: number
  timestamp: string
  mode: string
  diffSummary?: string
}

/* ── Store Interface ── */

export interface ForgeState {
  // Project
  project: ForgeProject | null
  projects: ForgeProject[]

  // Build State
  loading: boolean
  currentRunId: string | null
  currentRunStatus: string | null
  currentStage: number
  builderOutput: BuilderOutput | null
  buildStartTime: number | null
  buildDuration: number | null
  selectedFileIdx: number

  // UI State
  activeTab: 'preview' | 'code' | 'database' | 'deploy'
  activePanel: 'prompt' | 'context' | 'status'
  forgeMode: string
  autonomy: string
  projectType: string
  selectedModelId: string | null
  autoModel: boolean
  maxMode: boolean
  showVisualEdit: boolean
  previewViewport: 'desktop' | 'tablet' | 'mobile'
  showVersions: boolean
  inspectMode: boolean
  showContextPanel: boolean
  projectName: string
  draft: string

  // Chat
  chatMessages: ChatMessage[]

  // Tech Stack
  framework: string
  styling: string
  database: string

  // Versions
  versions: BuildVersion[]

  // Selected element (visual edit)
  selectedElement: { selector: string; text: string } | null

  // Actions
  setProject: (project: ForgeProject | null) => void
  setProjects: (projects: ForgeProject[]) => void
  setLoading: (loading: boolean) => void
  setCurrentRun: (runId: string | null, status: string | null) => void
  setCurrentStage: (stage: number) => void
  setBuilderOutput: (output: BuilderOutput | null) => void
  setBuildStartTime: (time: number | null) => void
  setBuildDuration: (duration: number | null) => void
  setSelectedFileIdx: (idx: number) => void
  setActiveTab: (tab: ForgeState['activeTab']) => void
  setActivePanel: (panel: ForgeState['activePanel']) => void
  setForgeMode: (mode: string) => void
  setAutonomy: (autonomy: string) => void
  setProjectType: (type: string) => void
  setModelConfig: (config: { modelId?: string; autoModel?: boolean; maxMode?: boolean }) => void
  setShowVisualEdit: (show: boolean) => void
  setPreviewViewport: (viewport: ForgeState['previewViewport']) => void
  setShowVersions: (show: boolean) => void
  setInspectMode: (inspect: boolean) => void
  setShowContextPanel: (show: boolean) => void
  setProjectName: (name: string) => void
  setDraft: (draft: string) => void
  setSelectedElement: (element: { selector: string; text: string } | null) => void
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  clearChat: () => void
  setTechStack: (stack: { framework?: string; styling?: string; database?: string }) => void
  setVersions: (versions: BuildVersion[]) => void
  reset: () => void
}

/* ── Default State ── */

const defaultState = {
  project: null,
  projects: [],
  loading: false,
  currentRunId: null,
  currentRunStatus: null,
  currentStage: 0,
  builderOutput: null,
  buildStartTime: null,
  buildDuration: null,
  selectedFileIdx: 0,
  activeTab: 'preview' as const,
  activePanel: 'prompt' as const,
  forgeMode: 'auto',
  autonomy: 'founder',
  projectType: 'auto',
  selectedModelId: null,
  autoModel: false,
  maxMode: false,
  showVisualEdit: false,
  previewViewport: 'desktop' as const,
  showVersions: false,
  inspectMode: false,
  showContextPanel: true,
  projectName: '',
  draft: '',
  chatMessages: [] as ChatMessage[],
  framework: 'nextjs',
  styling: 'tailwind',
  database: 'supabase',
  versions: [] as BuildVersion[],
  selectedElement: null,
}

/* ── Store ── */

export const useForgeStore = create<ForgeState>()(
  persist(
    (set) => ({
      ...defaultState,

      setProject: (project) => set({ project }),
      setProjects: (projects) => set({ projects }),
      setLoading: (loading) => set({ loading }),
      setCurrentRun: (runId, status) => set({ currentRunId: runId, currentRunStatus: status }),
      setCurrentStage: (stage) => set({ currentStage: stage }),
      setBuilderOutput: (output) => set({ builderOutput: output }),
      setBuildStartTime: (time) => set({ buildStartTime: time }),
      setBuildDuration: (duration) => set({ buildDuration: duration }),
      setSelectedFileIdx: (idx) => set({ selectedFileIdx: idx }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActivePanel: (panel) => set({ activePanel: panel }),
      setForgeMode: (mode) => set({ forgeMode: mode }),
      setAutonomy: (autonomy) => set({ autonomy: autonomy }),
      setProjectType: (type) => set({ projectType: type }),
      setModelConfig: (config) =>
        set((state) => ({
          selectedModelId: config.modelId ?? state.selectedModelId,
          autoModel: config.autoModel ?? state.autoModel,
          maxMode: config.maxMode ?? state.maxMode,
        })),
      setShowVisualEdit: (show) => set({ showVisualEdit: show }),
      setPreviewViewport: (viewport) => set({ previewViewport: viewport }),
      setShowVersions: (show) => set({ showVersions: show }),
      setInspectMode: (inspect) => set({ inspectMode: inspect }),
      setShowContextPanel: (show) => set({ showContextPanel: show }),
      setProjectName: (name) => set({ projectName: name }),
      setDraft: (draft) => set({ draft }),
      setSelectedElement: (element) => set({ selectedElement: element }),

      addChatMessage: (message) =>
        set((state) => {
          if (state.chatMessages.some((m) => m.id === message.id)) return state
          return { chatMessages: [...state.chatMessages, message] }
        }),

      setChatMessages: (messages) => set({ chatMessages: messages }),

      clearChat: () =>
        set({
          chatMessages: [
            {
              id: 'welcome',
              sender: 'system',
              content: 'Welcome to Karnex Forge. Describe your idea below to begin.',
              timestamp: new Date().toISOString(),
              type: 'text',
            },
          ],
        }),

      setTechStack: (stack) =>
        set((state) => ({
          framework: stack.framework ?? state.framework,
          styling: stack.styling ?? state.styling,
          database: stack.database ?? state.database,
        })),

      setVersions: (versions) => set({ versions }),

      reset: () => set({ ...defaultState }),
    }),
    {
      name: 'karnex-forge-store',
      partialize: (state) => ({
        // Persist only UI preferences and project info, not transient build state
        activeTab: state.activeTab,
        forgeMode: state.forgeMode,
        autonomy: state.autonomy,
        framework: state.framework,
        styling: state.styling,
        database: state.database,
        maxMode: state.maxMode,
        autoModel: state.autoModel,
        previewViewport: state.previewViewport,
        showContextPanel: state.showContextPanel,
        projectName: state.projectName,
      }),
    }
  )
)
