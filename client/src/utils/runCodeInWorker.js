let activeRequest = null

export async function runCodeInWorker(code, lessonId) {
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
    if (!response.ok) return { ...result, error: result.error || result.stderr || 'Java compilation failed.', events: [] , code }
    return { ...result, events: result.commands || result.events || [], code }
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
