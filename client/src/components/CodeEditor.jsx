import React, { useEffect, useMemo, useRef, useState } from 'react'
import { C } from './UI'

const TOKEN_PATTERN = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/|\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|record|return|short|static|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|true|false|String|var)\b|\b\d+(?:\.\d+)?\b|===|!==|==|!=|<=|>=|\+\+|--|&&|\|\||[+*/%=<>!-]|\b[A-Za-z_$][\w$]*\b)/g
const KEYWORDS = new Set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new null package private protected public record return short static super switch synchronized this throw throws transient try void volatile while true false String var'.split(' '))
const COMMON_TYPOS = {
  booleean: 'boolean',
  clas: 'class',
  contnue: 'continue',
  els: 'else',
  pritn: 'print',
  publc: 'public',
  retrun: 'return',
  stattic: 'static',
  Strng: 'String',
  thro: 'throw',
  whlie: 'while',
  moveRigt: 'moveRight',
  jmp: 'jump',
  saay: 'say'
}

function highlightJava(source) {
  const output = []
  let cursor = 0
  let match
  TOKEN_PATTERN.lastIndex = 0
  while ((match = TOKEN_PATTERN.exec(source))) {
    if (match.index > cursor) output.push(source.slice(cursor, match.index))
    const token = match[0]
    let type = 'operator'
    if (token.startsWith('//') || token.startsWith('/*')) type = 'comment'
    else if (token.startsWith('"') || token.startsWith("'")) type = 'string'
    else if (/^\d/.test(token)) type = 'number'
    else if (KEYWORDS.has(token)) type = 'keyword'
    else if (/^[A-Za-z_$]/.test(token)) type = 'variable'
    output.push(<span key={`${match.index}-${token}`} className={`cq-token cq-token--${type}`}>{token}</span>)
    cursor = match.index + token.length
  }
  if (cursor < source.length) output.push(source.slice(cursor))
  return output
}

export function lintJava(source) {
  const diagnostics = []
  const lines = source.split('\n')
  let braces = 0
  let parentheses = 0
  let inBlockComment = false

  lines.forEach((line, index) => {
    let code = line
    if (inBlockComment) {
      const end = code.indexOf('*/')
      if (end < 0) return
      code = code.slice(end + 2)
      inBlockComment = false
    }
    const commentStart = code.indexOf('/*')
    if (commentStart >= 0 && code.indexOf('*/', commentStart + 2) < 0) {
      inBlockComment = true
      code = code.slice(0, commentStart)
    }
    const withoutStrings = code.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""').replace(/\/\/.*$/, '')
    const openBraces = (withoutStrings.match(/{/g) || []).length
    const closeBraces = (withoutStrings.match(/}/g) || []).length
    const openParens = (withoutStrings.match(/\(/g) || []).length
    const closeParens = (withoutStrings.match(/\)/g) || []).length
    braces += openBraces - closeBraces
    parentheses += openParens - closeParens
    const trimmed = code.trim()
    const codeWithoutStrings = code.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')
    if (!/^for\s*\(/.test(trimmed) && /;;/.test(codeWithoutStrings)) {
      diagnostics.push({ line: index, message: 'There is an extra semicolon. Keep only one ; at the end of the statement.' })
    } else if (trimmed === ';') {
      diagnostics.push({ line: index, message: 'This is an empty statement. Remove the extra semicolon.' })
    }
    const typoMatch = codeWithoutStrings.match(/\b[A-Za-z_$][\w$]*\b/g)?.find(word => COMMON_TYPOS[word])
    if (typoMatch) {
      diagnostics.push({ line: index, message: `Did you mean ${COMMON_TYPOS[typoMatch]}? Check the spelling.` })
    }

    if (/"(?:\\.|[^"\\])*"$/.test(code.trim()) || /\b(?:String|char)\s+\w+\s*=\s*["'](?:\\.|[^"'\\])*$/.test(code)) {
      diagnostics.push({ line: index, message: 'This string is not closed. Add the matching quote.' })
    }
    const looksLikeStatement = /^(?:(?:int|double|float|long|short|byte|char|boolean|String|var)\b|(?:return|throw|break|continue)\b|[A-Za-z_$][\w$]*\s*(?:=|\+=|-=|\+\+|--|\())/.test(trimmed)
    const isControlLine = /^(?:if|for|while|switch|catch|class|public|private|protected|else)\b/.test(trimmed)
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*') && looksLikeStatement && !isControlLine && !/[;{},:]$/.test(trimmed)) {
      diagnostics.push({ line: index, message: 'This statement needs a semicolon at the end.' })
    }
    if (closeBraces > openBraces || closeParens > openParens) {
      diagnostics.push({ line: index, message: 'There is a closing bracket without a matching opening bracket.' })
    }
  })

  if (braces > 0) diagnostics.push({ line: lines.length - 1, message: 'A curly brace is still open. Add } to close the block.' })
  if (parentheses > 0) diagnostics.push({ line: lines.length - 1, message: 'A parenthesis is still open. Add ) to finish the expression.' })
  if (/"(?:\\.|[^"\\])*$/m.test(source) && !/"(?:\\.|[^"\\])*"/m.test(source)) {
    diagnostics.push({ line: lines.length - 1, message: 'A string literal is not closed. Add the missing quote.' })
  }
  return diagnostics
}

export default function CodeEditor({ value, onChange, fillHeight }) {
  const lines = value.split('\n').length
  const ta    = useRef(null)
  const nums  = useRef(null)
  const codeLayer = useRef(null)
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDiagnostics(lintJava(value)), 400)
    return () => window.clearTimeout(timer)
  }, [value])

  const highlighted = useMemo(() => highlightJava(value), [value])
  const diagnosticsByLine = useMemo(() => new Map(diagnostics.map(item => [item.line, item])), [diagnostics])
  const syncScroll = () => {
    if (!ta.current) return
    if (nums.current) nums.current.scrollTop = ta.current.scrollTop
    if (codeLayer.current) {
      codeLayer.current.scrollTop = ta.current.scrollTop
      codeLayer.current.scrollLeft = ta.current.scrollLeft
    }
  }

  return (
    <div style={{
      display:'flex',
      background:'#0B1220',
      borderRadius: fillHeight ? 0 : 12,
      overflow:'hidden',
      border: fillHeight ? 'none' : `1px solid ${C.onyx700}`,
      height: fillHeight ? '100%' : 240,
    }}>
      {/* Line numbers */}
      <div
        ref={nums}
        style={{
          background:'#0B1220', color:'#374151', fontSize:12,
          lineHeight:'21px', padding:'12px 8px', textAlign:'right',
          userSelect:'none', overflow:'hidden', minWidth:34,
          fontFamily:"'JetBrains Mono',monospace", flexShrink:0, zIndex:3
        }}
      >
        {Array.from({ length: Math.max(lines, 12) }, (_, i) => (
          <div key={i} title={diagnosticsByLine.get(i)?.message || ''} style={{ color: diagnosticsByLine.has(i) ? '#F87171' : '#374151' }}>
            {diagnosticsByLine.has(i) ? '!' : ''}{i + 1}
          </div>
        ))}
      </div>

      <div style={{ position:'relative', flex:1, minWidth:0, overflow:'hidden' }}>
        <pre ref={codeLayer} aria-hidden="true" className="cq-code-highlight">{highlighted}{value.endsWith('\n') ? '\n' : ''}</pre>
      <textarea
        ref={ta}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        aria-label="Java code editor"
        style={{
          position:'absolute', inset:0, width:'100%', height:'100%', background:'transparent', color:'transparent',
          caretColor:'#F8FAFC',
          border:'none', resize:'none', fontSize:13, lineHeight:'21px',
          padding:'12px 14px', fontFamily:"'JetBrains Mono',monospace", whiteSpace:'pre', overflow:'auto',
          outline:'none'
        }}
      />
      </div>
    </div>
  )
}
