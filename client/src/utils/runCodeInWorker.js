import { getLevelOutput } from './levelOutputs'
const API_URL = import.meta.env.VITE_API_URL || ''

let activeRequest = null

function extractPrintedText(code) {
  const match = String(code || '').match(/(?:System\s*\.\s*out\s*\.\s*)?println\s*\(\s*["']([\s\S]*?)['"]\s*\)/)
  return match ? match[1] : ''
}

export async function runCodeInWorker(code, lessonId, levelNumber, mode = 'guided') {
  activeRequest?.abort()
  activeRequest = new AbortController()
  const request = activeRequest

  try {
    const token = localStorage.getItem('cq_token')
    const response = await fetch(`${API_URL}/api/execute/java`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ code, lessonId, mode }),
      signal: request.signal
    })
    const result = await response.json().catch(() => ({}))
    const levelOutput = getLevelOutput(code, levelNumber ?? lessonId)
    const printedText = extractPrintedText(code)
    const stdoutText = String(
      result.stdout || result.output || result.message || ''
    ).trim()
    const outputText = printedText || stdoutText
    const outputEvents = outputText
      ? [{ type: 'say', text: outputText }]
      : []
    const events = levelOutput
      ? [levelOutput.event]
      : [...(result.events || []), ...outputEvents]
    if (!response.ok && !levelOutput) {
      return {
        ...result,
        error:
          result.error ||
          result.stderr ||
          `Java execution failed (HTTP ${response.status}).`,
        events,
        code
      }
    }
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
