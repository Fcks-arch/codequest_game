import { GameAPI, interpret } from './interpreter'

self.onmessage = event => {
  const { code, requestId } = event.data || {}
  const events = []
  const api = new GameAPI(item => events.push(item))
  const result = interpret(String(code || ''), api)
  self.postMessage({ ...result, events, code: String(code || ''), requestId })
}
