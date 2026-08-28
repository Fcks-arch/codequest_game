import * as acorn from 'acorn'

/* Control-flow signals for break/continue.
   These are thrown like exceptions and caught by the nearest
   enclosing loop (ForStatement / WhileStatement) — this is the
   standard technique for implementing break/continue in a
   hand-written tree-walking interpreter. */
class BreakSignal extends Error {}
class ContinueSignal extends Error {}

export class GameAPI {
  constructor(onEvent) {
    this.onEvent = onEvent
    this.steps   = 0
    this.max     = 2000
  }
  guard() {
    if (++this.steps > this.max)
      throw new Error('Step limit hit — check for an infinite loop.')
  }
  moveRight(n) {
    this.guard()
    if (typeof n !== 'number' || isNaN(n))
      throw new Error('moveRight() needs a number.')
    this.onEvent({ type: 'moveRight', amount: n })
  }
  jump(h = 0) {
    this.guard()
    if (typeof h !== 'number' || isNaN(h))
      throw new Error('jump() only accepts a number when you want a forward leap.')
    this.onEvent({ type: 'jump', amount: h })
  }
  say(m) {
    this.guard()
    this.onEvent({ type: 'say', text: String(m) })
  }
}

export function interpret(src, api) {
  let ast
  try { ast = acorn.parse(src, { ecmaVersion: 2020 }) }
  catch (e) { return { error: 'Syntax error: ' + e.message } }

  const allowed = new Set(['moveRight', 'jump', 'say'])

  function lk(sc, n) {
    let s = sc
    while (s) { if (s.vars.has(n)) return s; s = s.parent }
    return null
  }

  function ev(node, sc) {
    switch (node.type) {
      case 'Literal': return node.value
      case 'Identifier': {
        const s = lk(sc, node.name)
        if (!s) throw new Error(`"${node.name}" is not defined.`)
        return s.vars.get(node.name)
      }
      case 'BinaryExpression': {
        const l = ev(node.left, sc), r = ev(node.right, sc)
        switch (node.operator) {
          case '+': return l + r; case '-': return l - r
          case '*': return l * r; case '/': return l / r; case '%': return l % r
          case '<': return l < r; case '>': return l > r
          case '<=': return l <= r; case '>=': return l >= r
          case '===': case '==': return l === r
          case '!==': case '!=': return l !== r
          default: throw new Error(`Operator "${node.operator}" not supported yet.`)
        }
      }
      case 'UnaryExpression': {
        const v = ev(node.argument, sc)
        if (node.operator === '-') return -v
        if (node.operator === '!') return !v
        throw new Error('Unsupported unary operator.')
      }
      case 'UpdateExpression': {
        if (node.argument.type !== 'Identifier')
          throw new Error('++ and -- only work on variables.')
        const s = lk(sc, node.argument.name)
        if (!s) throw new Error(`"${node.argument.name}" is not defined.`)
        const old = s.vars.get(node.argument.name)
        const next = node.operator === '++' ? old + 1 : old - 1
        s.vars.set(node.argument.name, next)
        return node.prefix ? next : old
      }
      case 'AssignmentExpression': {
        if (node.left.type !== 'Identifier')
          throw new Error('Assignment only works on variables.')
        const s = lk(sc, node.left.name)
        if (!s) throw new Error(`"${node.left.name}" is not defined.`)
        const rv = ev(node.right, sc)
        let nv
        switch (node.operator) {
          case '=': nv = rv; break
          case '+=': nv = s.vars.get(node.left.name) + rv; break
          case '-=': nv = s.vars.get(node.left.name) - rv; break
          case '*=': nv = s.vars.get(node.left.name) * rv; break
          case '/=': nv = s.vars.get(node.left.name) / rv; break
          default: throw new Error(`"${node.operator}" not supported.`)
        }
        s.vars.set(node.left.name, nv)
        return nv
      }
      case 'LogicalExpression': {
        const l = ev(node.left, sc)
        if (node.operator === '&&') return l ? ev(node.right, sc) : l
        if (node.operator === '||') return l ? l : ev(node.right, sc)
        throw new Error('Unsupported logical operator.')
      }
      case 'TemplateLiteral': {
        let out = ''
        node.quasis.forEach((q, i) => {
          out += q.value.cooked
          if (node.expressions[i]) out += String(ev(node.expressions[i], sc))
        })
        return out
      }
      case 'CallExpression': {
        if (node.callee.type !== 'Identifier')
          throw new Error('Only direct calls like moveRight() are supported.')
        const fn = node.callee.name
        if (!allowed.has(fn))
          throw new Error(`"${fn}()" is not available. Try moveRight(), jump(), or say().`)
        return api[fn](...node.arguments.map(a => ev(a, sc)))
      }
      default:
        throw new Error(`"${node.type}" is not supported yet.`)
    }
  }

  function ex(node, sc) {
    switch (node.type) {
      case 'VariableDeclaration':
        node.declarations.forEach(d => {
          sc.vars.set(d.id.name, d.init ? ev(d.init, sc) : undefined)
        })
        return
      case 'ExpressionStatement': ev(node.expression, sc); return
      case 'BlockStatement': node.body.forEach(s => ex(s, sc)); return
      case 'IfStatement':
        if (ev(node.test, sc)) ex(node.consequent, sc)
        else if (node.alternate) ex(node.alternate, sc)
        return

      case 'BreakStatement':    throw new BreakSignal()
      case 'ContinueStatement': throw new ContinueSignal()

      case 'ForStatement': {
        const ls = { vars: new Map(), parent: sc }
        if (node.init) ex(node.init, ls)
        let g = 0
        while (!node.test || ev(node.test, ls)) {
          api.guard()
          try {
            ex(node.body, ls)
          } catch (e) {
            if (e instanceof BreakSignal) break
            if (!(e instanceof ContinueSignal)) throw e
            // ContinueSignal: fall through to the update expression below
          }
          if (node.update) ev(node.update, ls)
          if (++g > 1000) throw new Error('Loop ran too many times.')
        }
        return
      }

      case 'WhileStatement': {
        let g = 0
        while (ev(node.test, sc)) {
          api.guard()
          try {
            ex(node.body, sc)
          } catch (e) {
            if (e instanceof BreakSignal) break
            if (!(e instanceof ContinueSignal)) throw e
          }
          if (++g > 1000) throw new Error('Loop ran too many times.')
        }
        return
      }

      case 'DoWhileStatement': {
        let g = 0
        do {
          api.guard()
          try {
            ex(node.body, sc)
          } catch (e) {
            if (e instanceof BreakSignal) break
            if (!(e instanceof ContinueSignal)) throw e
          }
          if (++g > 1000) throw new Error('Loop ran too many times.')
        } while (ev(node.test, sc))
        return
      }

      case 'EmptyStatement': return
      default:
        throw new Error(`Statement "${node.type}" not supported yet.`)
    }
  }

  try {
    const sc = { vars: new Map(), parent: null }
    ast.body.forEach(n => ex(n, sc))
  } catch (e) {
    if (e instanceof BreakSignal)    return { error: `"break" can only be used inside a loop.` }
    if (e instanceof ContinueSignal) return { error: `"continue" can only be used inside a loop.` }
    return { error: e.message }
  }
  return { error: null }
}
