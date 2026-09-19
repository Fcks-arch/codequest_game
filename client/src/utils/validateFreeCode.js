export const FREE_CODE_SAFETY_MESSAGE = "Safety Shield: That syntax isn't unlocked for this level yet! Stick to statements taught in this lesson."

const FORBIDDEN_PATTERNS = [
  /\b(?:while|for|do|class|interface|enum|package|import|extends|implements|synchronized|native|reflect|reflection|Runtime|ProcessBuilder)\b/i,
  /\bThread\s*\.\s*sleep\b/i,
  /\bSystem\s*\.\s*exit\b/i,
  /\b(?:Class\s*\.\s*forName|getDeclared|setAccessible|exec\s*\()\b/i,
]

function withoutLiteralsAndComments(source) {
  return source
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ' ')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')
}

export function validateFreeCode(code) {
  if (typeof code !== 'string' || !code.trim()) {
    return { valid: false, message: FREE_CODE_SAFETY_MESSAGE }
  }
  if (code.length > 4000) {
    return { valid: false, message: FREE_CODE_SAFETY_MESSAGE }
  }

  const sanitized = withoutLiteralsAndComments(code)
  if (FORBIDDEN_PATTERNS.some(pattern => pattern.test(sanitized))) {
    return { valid: false, message: FREE_CODE_SAFETY_MESSAGE }
  }

  return { valid: true, message: '' }
}
