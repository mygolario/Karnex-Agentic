export interface FounderProfile {
  identity: {
    fullName: string
    displayName: string
    timezone: string
    workingHours: string // e.g. "9am-5pm"
    feedbackStyle: 'gentle' | 'direct' | 'brutal'
    technicalLevel: 'technical' | 'non-technical' | 'hybrid'
    startupExperience: 'first-time' | '1-2 before' | 'serial'
  }
  venture: {
    idea: string
    stage: 'ideation' | 'validation' | 'building' | 'launching' | 'growing'
    domain: string
    painOrigin: string
    productName?: string
    hasName: boolean
  }
  market: {
    targetCustomer: {
      jobTitle: string
      companySize: string
      type: 'B2B' | 'B2C'
    }
    competitors: string[]
    positioningAdvantage: string
    hasCustomerConversations: boolean
  }
  execution: {
    cyclePosition: 'pre-validation' | 'building-mvp' | 'seeking-revenue'
    bottleneck: 'unclear-idea' | 'no-users' | 'no-time-to-build' | 'struggling-to-sell' | 'need-funding'
    tools: string[] // github, notion, stripe, etc.
    weeklyAvailability: '<5 hrs' | '5-15 hrs' | '15+ hrs'
    fundingPath: 'bootstrapping' | 'vc-funding'
  }
  voice: {
    writingSamples?: string[]
    contentChannels: string[] // twitter, linkedin, blog, none
    communicationStyle: string // description of how Karnex should speak
  }
  momentum: {
    score: number // seed score set to 50
    lastUpdated: string
  }
  completenessScore: number
}

export function calculateCompletenessScore(profile: Partial<FounderProfile>): number {
  let score = 0

  // 1. Identity Stage (max 30 points)
  if (profile.identity?.fullName) score += 5
  if (profile.identity?.displayName) score += 5
  if (profile.identity?.timezone) score += 4
  if (profile.identity?.workingHours) score += 3
  if (profile.identity?.feedbackStyle) score += 5
  if (profile.identity?.technicalLevel) score += 4
  if (profile.identity?.startupExperience) score += 4

  // 2. Venture Stage (max 25 points)
  if (profile.venture?.idea) score += 10
  if (profile.venture?.stage) score += 4
  if (profile.venture?.domain) score += 3
  if (profile.venture?.painOrigin) score += 5
  if (profile.venture?.productName) score += 3

  // 3. Market Stage (max 20 points)
  if (profile.market?.targetCustomer?.jobTitle || profile.market?.targetCustomer?.companySize) score += 8
  if (profile.market?.competitors && profile.market.competitors.length > 0) score += 5
  if (profile.market?.positioningAdvantage) score += 4
  if (profile.market?.hasOwnProperty('hasCustomerConversations')) score += 3

  // 4. Execution Stage (max 20 points)
  if (profile.execution?.cyclePosition) score += 4
  if (profile.execution?.bottleneck) score += 5
  if (profile.execution?.tools && profile.execution.tools.length > 0) score += 3
  if (profile.execution?.weeklyAvailability) score += 4
  if (profile.execution?.fundingPath) score += 4

  // 5. Voice Stage (max 5 points)
  if (profile.voice?.writingSamples && profile.voice.writingSamples.length > 0) score += 2
  if (profile.voice?.contentChannels && profile.voice.contentChannels.length > 0) score += 2
  if (profile.voice?.communicationStyle) score += 1

  return Math.min(100, score)
}
