const { execFile } = require('child_process')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)
const EXECUTION_TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS) || 2000
const SECRET_KEYS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET',
  'GOOGLE_CLIENT_ID', 'EMAIL_USER', 'EMAIL_PASS', 'TEACHER_SIGNUP_CODE']
const CHILD_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !SECRET_KEYS.includes(key))
)
const FREE_CODE_SAFETY_MESSAGE = "Safety Shield: That syntax isn't unlocked for this level yet! Stick to statements taught in this lesson."
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

function validateFreeCode(code) {
  if (typeof code !== 'string' || !code.trim() || code.length > 4000) return false
  const sanitized = withoutLiteralsAndComments(code)
  return !FORBIDDEN_PATTERNS.some(pattern => pattern.test(sanitized))
}

const JAVA_WRAPPER = studentCode => `
public class Main {
    public static void main(String[] args) {
${studentCode}
    }
}
`

async function executeJava(req, res) {
  const { code, lessonId, mode = 'guided' } = req.body || {}
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Java code is required.', commands: [], events: [] })
  }
  if (mode === 'free' && !validateFreeCode(code)) {
    return res.status(422).json({ error: FREE_CODE_SAFETY_MESSAGE, commands: [], events: [], code })
  }

  let tempDir
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codequest-java-'))
    await fs.writeFile(path.join(tempDir, 'Main.java'), JAVA_WRAPPER(code), 'utf8')

    await execFileAsync('javac', ['Main.java'], {
      cwd: tempDir,
      env: CHILD_ENV
      timeout: EXECUTION_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    })

    const { stdout, stderr } = await execFileAsync('java', ['Main'], {
      cwd: tempDir,
      env: CHILD_ENV
      timeout: EXECUTION_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    })
    return res.json({ lessonId, commands: [], events: [], stdout, stderr: stderr || '', error: null })
  } catch (error) {
    const stderr = error.stderr || error.stdout || error.message || 'Java execution failed.'
    const timedOut = error.killed || error.code === 'ETIMEDOUT'
    return res.status(422).json({
      lessonId,
      commands: [],
      events: [],
      stdout: error.stdout || '',
      stderr,
      error: timedOut ? 'Java execution timed out. Check that your code can finish.' : stderr.trim()
    })
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

module.exports = { executeJava, validateFreeCode }