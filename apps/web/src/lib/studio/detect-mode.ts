import type { ForgeMode } from './forge-types'

const STACK_RE = /Traceback|Error:|at .+\(.+:\d+/i

export function detectForgeModeClient(specification: string): {
  mode: Exclude<ForgeMode, 'auto'>
  reason: string
} {
  const spec = specification.trim()
  const lower = spec.toLowerCase()

  if (STACK_RE.test(spec) || lower.startsWith('error:') || lower.includes('stack trace')) {
    return { mode: 'debug', reason: 'Detected error/stack trace' }
  }

  if (
    ['scan codebase', 'find bugs', 'proactive', 'static analysis', 'lint the project'].some((p) =>
      lower.includes(p)
    )
  ) {
    return { mode: 'debug', reason: 'Proactive/debug scan request' }
  }

  if (
    ['how does', 'what is', 'explain', 'why ', 'should i', 'help me understand'].some((p) =>
      lower.includes(p)
    ) &&
    !['build', 'create', 'scaffold', 'implement', 'generate', 'add '].some((p) => lower.includes(p))
  ) {
    return { mode: 'ask', reason: 'Question or explanation request' }
  }

  if (
    ['plan ', 'architecture', 'file list', 'before you code', 'outline', 'roadmap for this feature'].some(
      (p) => lower.includes(p)
    )
  ) {
    return { mode: 'plan', reason: 'Planning request' }
  }

  return { mode: 'build', reason: 'Build/scaffold intent' }
}
