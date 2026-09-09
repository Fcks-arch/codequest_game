import React from 'react'
import { C, Ico } from './UI'

export default function IslandClearedModal({ islandName, xpGained, onReturn }) {
  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="island-cleared-title">
      <div style={styles.modal}>
        <div style={styles.badge}>
          <Ico n="trophy" s={30} c={C.amberDark} />
        </div>
        <div style={styles.eyebrow}>Island mastered</div>
        <h2 id="island-cleared-title" style={styles.title}>Congratulations!</h2>
        <p style={styles.message}>You&apos;ve mastered {islandName || 'this island'} and cleared every level.</p>
        <div style={styles.reward}>
          <Ico n="bolt" s={18} c={C.amberDark} />
          <strong>+{xpGained || 0} XP earned</strong>
        </div>
        <button type="button" onClick={onReturn} style={styles.button}>
          Return to Map
          <Ico n="chevRight" s={14} c="#fff" />
        </button>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position:'fixed', inset:0, zIndex:50, display:'grid', placeItems:'center',
    padding:20, background:'rgba(2,6,23,.72)', backdropFilter:'blur(4px)'
  },
  modal: {
    width:'min(100%, 390px)', padding:'30px 28px 26px', borderRadius:16,
    background:'#fff', color:C.onyx, textAlign:'center',
    boxShadow:'0 24px 70px rgba(2,6,23,.4)'
  },
  badge: {
    width:64, height:64, margin:'0 auto 14px', borderRadius:'50%',
    display:'grid', placeItems:'center', background:C.amberLight,
    border:`1px solid ${C.amber}`
  },
  eyebrow: {
    color:C.emeraldDark, fontSize:11, fontWeight:800,
    letterSpacing:'.1em', textTransform:'uppercase'
  },
  title: { margin:'6px 0 8px', fontSize:25, color:C.onyx },
  message: { margin:'0 auto 18px', maxWidth:290, color:C.onyx600, fontSize:13, lineHeight:1.6 },
  reward: {
    display:'flex', alignItems:'center', justifyContent:'center', gap:7,
    marginBottom:20, padding:'10px 12px', borderRadius:9,
    background:C.amberLight, color:C.amberDark, fontSize:13
  },
  button: {
    width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
    border:0, borderRadius:9, padding:'12px 16px', background:C.emerald,
    color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer'
  }
}
