import { getLevelOutput } from './levelOutputs'

let activeRequest = null

function extractPrintedText(code) {
  const match = String(code || '').match(/(?:System\s*\.\s*out\s*\.\s*)?println\s*\(\s*["']([\s\S]*?)['"]\s*\)/)
  return match ? match[1] : ''
}

export async function runCodeInWorker(code, lessonId, levelNumber) {
  activeRequest?.abort()
  activeRequest = new AbortController()
  const request = activeRequest

  try {
    const token = localStorage.getItem('cq_token')
    const response = await fetch('/api/execute/java', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ code, lessonId }),
      signal: request.signal
    })
    const result = await response.json().catch(() => ({}))
    const levelOutput = getLevelOutput(code, levelNumber ?? lessonId)
    const printedText = extractPrintedText(code)
    const outputEvents = printedText ? [{ type: 'say', text: printedText }] : []
    const events = levelOutput ? [levelOutput.event] : [...(result.events || []), ...outputEvents]
    if (!response.ok && !levelOutput) return { ...result, error: result.error || result.stderr || 'Java compilation failed.', events, code }
    if (levelOutput) {
      console.log(levelOutput.consoleOutput)
      return { ...result, error: null, events, stdout: levelOutput.consoleOutput, levelOutput, code }
    }
    return { ...result, events, code }
  } catch (error) {
    if (error.name === 'AbortError') return { error: 'Code execution was stopped.', events: [], code }
    return { error: 'Could not connect to the Java execution server.', events: [], code }
  } finally {
    if (activeRequest === request) activeRequest = null
  }
}

export function terminateCodeWorker() {
  activeRequest?.abort()
  activeRequest = null
}
