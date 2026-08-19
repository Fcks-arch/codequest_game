import React, { useRef } from 'react'
import { C } from './UI'

export default function CodeEditor({ value, onChange, fillHeight }) {
  const lines = value.split('\n').length
  const ta    = useRef(null)
  const nums  = useRef(null)

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
          fontFamily:"'JetBrains Mono',monospace", flexShrink:0
        }}
      >
        {Array.from({ length: Math.max(lines, 12) }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Editor */}
      <textarea
        ref={ta}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={() => {
          if (nums.current && ta.current)
            nums.current.scrollTop = ta.current.scrollTop
        }}
        spellCheck={false}
        style={{
          flex:1, background:'transparent', color:'#E2E8F0',
          border:'none', resize:'none', fontSize:13, lineHeight:'21px',
          padding:'12px 14px', fontFamily:"'JetBrains Mono',monospace",
          outline:'none'
        }}
      />
    </div>
  )
}
