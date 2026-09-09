const { execFile } = require('child_process')
const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)
const EXECUTION_TIMEOUT_MS = 3000

const JAVA_WRAPPER = studentCode => `
public class Main {
    private static void emit(String type, String value) {
        System.out.println("CODEQUEST:" + type + ":" + value);
    }

    public static void moveRight(int amount) {
        emit("moveRight", Integer.toString(amount));
    }

    public static void moveLeft(int amount) {
      emit("moveLeft", Integer.toString(amount));
    }

    public static void moveUp(int amount) {
      emit("moveUp", Integer.toString(amount));
    }

    public static void moveDown(int amount) {
      emit("moveDown", Integer.toString(amount));
    }

    public static void jump(int amount) {
        emit("jump", Integer.toString(amount));
    }

    public static void jump() {
      jump(1);
    }

    public static void attack() {
        emit("attack", "");
    }

    public static void pullLever() {
        emit("pullLever", "");
    }

    public static void collectKey() {
        emit("collectKey", "");
    }

    public static void useItem(String itemName) {
        emit("useItem", itemName == null ? "" : itemName);
    }

    public static void defend() {
        emit("defend", "");
    }

    public static void say(String message) {
        emit("say", message.replace("\\n", " "));
    }

    public static void say(int message) {
      say(Integer.toString(message));
    }

    public static void say(boolean message) {
      say(Boolean.toString(message));
    }

    public static void say(double message) {
      say(Double.toString(message));
    }

    public static void speak(String message) {
      say(message);
    }

    public static class Pip {
        public void moveRight(int amount) { Main.moveRight(amount); }
        public void moveLeft(int amount) { Main.moveLeft(amount); }
        public void moveUp(int amount) { Main.moveUp(amount); }
        public void moveDown(int amount) { Main.moveDown(amount); }
        public void jump(int amount) { Main.jump(amount); }
        public void jump() { Main.jump(); }
        public void attack() { Main.attack(); }
        public void pullLever() { Main.pullLever(); }
        public void collectKey() { Main.collectKey(); }
        public void useItem(String itemName) { Main.useItem(itemName); }
        public void defend() { Main.defend(); }
        public void say(String message) { Main.say(message); }
        public void say(int message) { Main.say(message); }
        public void say(boolean message) { Main.say(message); }
        public void say(double message) { Main.say(message); }
        public void speak(String message) { Main.speak(message); }
    }

    public static void main(String[] args) {
        Pip pip = new Pip();
${studentCode}
    }
}
`

function parseCommands(stdout) {
  return stdout.split(/\r?\n/).flatMap(line => {
    if (!line.startsWith('CODEQUEST:')) return []
    const [, type, ...parts] = line.split(':')
    const value = parts.join(':')
    if (type === 'say') return [{ type, text: value }]
    if (['moveRight', 'moveLeft', 'moveUp', 'moveDown', 'jump'].includes(type)) {
      const amount = Number(value)
      if (Number.isFinite(amount)) return [{ type, amount }]
    }
    if (['attack', 'pullLever', 'collectKey', 'defend'].includes(type)) return [{ type }]
    if (type === 'useItem') return [{ type, item: value }]
    return []
  })
}

async function executeJava(req, res) {
  const { code, lessonId } = req.body || {}
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Java code is required.', commands: [], events: [] })
  }

  let tempDir
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codequest-java-'))
    await fs.writeFile(path.join(tempDir, 'Main.java'), JAVA_WRAPPER(code), 'utf8')

    await execFileAsync('javac', ['Main.java'], {
      cwd: tempDir,
      timeout: EXECUTION_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    })

    const { stdout, stderr } = await execFileAsync('java', ['Main'], {
      cwd: tempDir,
      timeout: EXECUTION_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    })
    const commands = parseCommands(stdout)
    return res.json({ lessonId, commands, events: commands, stdout, stderr: stderr || '', error: null })
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

module.exports = { executeJava }