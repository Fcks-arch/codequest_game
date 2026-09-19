const ISLAND_ONE_OUTPUTS = {
  1: {
    match: /System\s*\.\s*out\s*\.\s*println\s*\(\s*["']Hello, Golem!["']\s*\)/,
    dialogue: 'Hello, Golem!',
    consoleOutput: 'Hello, Golem!',
    action: 'unlock-golem-gate',
  },
  2: {
    match: /int\s+doorCode\s*=\s*42\s*;/,
    dialogue: 'Door code set to 42!',
    consoleOutput: '[Variable stored] doorCode = 42',
    action: 'activate-archive-door',
  },
  3: {
    match: /int\s+litLanterns\s*=\s*0\s*;/,
    dialogue: 'Lantern counter ready!',
    consoleOutput: '[Variable stored] litLanterns = 0',
    action: 'clear-bridge-fog',
  },
  4: {
    match: /if\s*\(\s*litLanterns\s*>\s*0\s*\)[\s\S]*System\s*\.\s*out\s*\.\s*println\s*\(\s*["']Path is lit!["']\s*\)/,
    dialogue: 'Checking lantern light...',
    consoleOutput: 'Path is lit!',
    action: 'illuminate-flowchart',
  },
  5: {
    match: /String\s+keyname\s*=\s*["']Pip["']\s*;/,
    dialogue: 'Key forged for Pip!',
    consoleOutput: '[Variable stored] keyname = "Pip"',
    action: 'forge-pip-key',
  },
  6: {
    match: /System\s*\.\s*out\s*\.\s*println\s*\(\s*["']Bridge online["']\s*\)/,
    dialogue: 'Bridge online!',
    consoleOutput: 'Bridge online',
    action: 'extend-bug-chasm-bridge',
  },
}

function levelNumber(lessonId) {
  const numericId = Number(lessonId)
  return Number.isInteger(numericId) && numericId >= 1 && numericId <= 6 ? numericId : null
}

export function getLevelOutput(code, lessonId) {
  const level = levelNumber(lessonId)
  const output = level ? ISLAND_ONE_OUTPUTS[level] : null
  if (!output || !output.match.test(String(code || ''))) return null
  return {
    level,
    dialogue: output.dialogue,
    consoleOutput: output.consoleOutput,
    action: output.action,
    event: { type: 'levelOutput', level, action: output.action, text: output.dialogue },
  }
}