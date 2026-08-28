import React from 'react'

const C = {
  purple:'#4F46E5', purpleLight:'#EEF0FF', purpleDark:'#3730C7',
  emerald:'#22C55E', emeraldLight:'#E8FCEF', emeraldDark:'#16A34A',
  amber:'#F59E0B', amberLight:'#FFF6E5', amberDark:'#B45309',
  onyx:'#0F172A', onyx600:'#334155', onyx400:'#64748B',
  onyx100:'#E2E8F0', onyx50:'#F4F6FA',
}

export { C }

export function Pill({ children, bg, col }) {
  return (
    <span style={{ background:bg, color:col, fontSize:12, fontWeight:600,
      padding:'4px 10px', borderRadius:999, display:'inline-flex', alignItems:'center', gap:4 }}>
      {children}
    </span>
  )
}

export function Ico({ n, s = 18, c = 'currentColor' }) {
  const p = {
    bolt:      'M13 2L4 14h6l-1 8 9-12h-6z',
    star:      'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z',
    flame:     'M12 2c1 3-3 4-3 7a3 3 0 006 0c0-1-.5-1.7-1-2.3.6.2 3 1.8 3 5.3a5 5 0 11-10 0c0-4 3-6 5-10z',
    check:     'M5 13l4 4L19 7',
    play:      'M6 4l14 8-14 8z',
    book:      'M4 4h7a3 3 0 013 3v13a3 3 0 00-3-3H4zM20 4h-7a3 3 0 00-3 3v13a3 3 0 013-3h7z',
    code:      'M9 6l-6 6 6 6M15 6l6 6-6 6',
    medal:     'M12 14a5 5 0 100-10 5 5 0 000 10zM8.5 13l-2 7 5.5-3 5.5 3-2-7',
    trophy:    'M7 4h10v3a5 5 0 01-10 0V4zM9 13v3a3 3 0 006 0v-3M5 4H3a3 3 0 003 4M19 4h2a3 3 0 01-3 4M8 20h8',
    chevRight: 'M9 6l6 6-6 6',
    tip:       'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.5c.5.4 1 1.3 1 2.5h6c0-1.2.5-2.1 1-2.5A7 7 0 0012 2z',
    refresh:   'M3 12a9 9 0 0115-6.7L21 8M21 12a9 9 0 01-15 6.7L3 16',
    lock:      'M12 17a1 1 0 100-2 1 1 0 000 2zM5 11V7a7 7 0 0114 0v4M3 11h18v11H3z',
    unlock:    'M8 11V7a4 4 0 018 0M3 11h18v11H3z',
    eye:       'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zM12 15a3 3 0 100-6 3 3 0 000 6z',
    eyeOff:    'M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.9 4.24A10.9 10.9 0 0112 4c7 0 11 7 11 7a17.5 17.5 0 01-3.22 4.02M6.1 6.1C3.5 7.9 1 12 1 12s2.5 4.9 6.1 6.6',
    logout:    'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1',
    user:      'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={p[n] || p.star} />
    </svg>
  )
}

export function Toast({ msg, tone }) {
  const bg = tone === 'emerald' ? C.emerald : C.purple
  return (
    <div className="toast-pop" style={{
      position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
      background:bg, color:'#fff', padding:'12px 22px', borderRadius:999,
      fontSize:14, fontWeight:600, boxShadow:'0 10px 30px rgba(15,23,42,.25)',
      display:'flex', alignItems:'center', gap:8, zIndex:50, whiteSpace:'nowrap'
    }}>
      <Ico n="bolt" s={15} c="#fff" /> {msg}
    </div>
  )
}

export function XpBar({ xp }) {
  const into = xp % 100
  return (
    <div>
      <div style={{ height:8, background:C.onyx100, borderRadius:999, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${into}%`,
          background:`linear-gradient(90deg,${C.purple},${C.emerald})`,
          borderRadius:999, transition:'width .6s ease' }} />
      </div>
      <div style={{ fontSize:11, color:C.onyx400, marginTop:5, fontWeight:500 }}>
        {into} / 100 XP to next level
      </div>
    </div>
  )
}
