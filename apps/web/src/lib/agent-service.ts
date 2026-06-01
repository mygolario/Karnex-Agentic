/** Same-origin agent API (proxied via /api/agent/*). Avoids CORS and NEXT_PUBLIC bake issues. */

export function getAgentApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `/api/agent/${normalized}`
}

export async function readAgentError(response: Response): Promise<string> {
  let detail = response.statusText || 'Request failed'
  try {
    const body = (await response.json()) as {
      detail?: string | unknown
      error?: string
      message?: string
    }
    if (typeof body.detail === 'string') {
      detail = body.detail
    } else if (body.detail != null) {
      detail = JSON.stringify(body.detail)
    } else if (body.error) {
      detail = body.error
    } else if (body.message) {
      detail = body.message
    }
  } catch {
    // non-JSON body
  }
  return `${response.status}: ${detail}`
}
