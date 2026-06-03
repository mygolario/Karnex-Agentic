import type { VaultCategory, VaultRecord } from './types'

const CODE_TYPES = new Set(['builder_output', 'code_artifact'])
const RESEARCH_TYPES = new Set(['research_brief'])
const CAMPAIGN_TYPES = new Set(['outreach_campaign'])
const BRIEF_TYPES = new Set(['product_hypothesis'])
const DOCUMENT_TYPES = new Set([
  '90_day_roadmap',
  'weekly_sprint_plan',
  'standup_summary',
])

export const VAULT_CATEGORIES: { id: VaultCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'code', label: 'Code' },
  { id: 'research', label: 'Research' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'documents', label: 'Documents' },
  { id: 'briefs', label: 'Briefs' },
]

export function getRecordCategory(record: VaultRecord): VaultCategory {
  const { outputType, agentId } = record

  if (CODE_TYPES.has(outputType) || agentId === 'builder-v1') return 'code'
  if (RESEARCH_TYPES.has(outputType)) return 'research'
  if (CAMPAIGN_TYPES.has(outputType)) return 'campaigns'
  if (BRIEF_TYPES.has(outputType)) return 'briefs'
  if (DOCUMENT_TYPES.has(outputType)) return 'documents'

  return 'documents'
}

export function filterByCategory(
  records: VaultRecord[],
  category: VaultCategory
): VaultRecord[] {
  if (category === 'all') return records
  return records.filter((r) => getRecordCategory(r) === category)
}

export function countByCategory(records: VaultRecord[]): Record<VaultCategory, number> {
  const counts: Record<VaultCategory, number> = {
    all: records.length,
    code: 0,
    research: 0,
    campaigns: 0,
    documents: 0,
    briefs: 0,
  }

  for (const record of records) {
    counts[getRecordCategory(record)] += 1
  }

  return counts
}
