import React, { useEffect, useState } from 'react'

/*
  Island 8 intro: the "Memory Corridor".
  The Null Sovereign wiped Pip's memory. The player walks back through one memory
  per island, then the orbs shatter and the boss fight begins.

  To change a memory, edit the MEMORIES list below (one entry per orb).
  Backgrounds must exist in client/public/assets/landscapes/.
*/
export const MEMORIES = [
  { island: 'Island 1', title: 'The First Word',     bg: '/assets/landscapes/terrain1.png',
    caption: 'You made the computer speak.',
    code: 'System.out.println("Hello");' },
  { island: 'Island 2', title: 'The Program Shell',  bg: '/assets/landscapes/oakheart1.png',
    caption: 'Every Java program lives in a class and starts at main.',
    code: 'public static void main(String[] args)' },
  { island: 'Island 3', title: 'The Literal Gate',   bg: '/assets/landscapes/cathedral-level3.png',
    caption: 'You learned values: int, double, char, String, boolean.',
    code: "char grade = 'A';" },
  { island: 'Island 4', title: 'The Remainder Rune', bg: '/assets/landscapes/level4_bg.png',
    caption: 'You combined values with operators.',
    code: 'int leftover = 17 % 5;' },
  { island: 'Island 5', title: 'The Listening Scroll', bg: '/assets/landscapes/forge-level5.png',
    caption: 'You made programs listen to the player.',
    code: 'int num = scan.nextInt();' },
  { island: 'Island 6', title: 'The Matching Seal',  bg: '/assets/landscapes/library.png',
    caption: 'You made decisions and compared text.',
    code: 'word.equals("java")' },
  { island: 'Island 7', title: 'The Skipping Loop',  bg: '/assets/landscapes/level9.png',
    caption: 'You repeated work with loops.',
    code: 'for (int i = 0; i < 6; i++)' },
]

const ORB_COLORS = ['#22C55E', '#4F46E5', '#F97316', '#EF4444', '#0EA5E9', '#EAB308', '#A855F7']

const CSS = `
@keyframes cq-orb-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes cq-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes cq-shatter {
  0%   { transform: translate(0,0) scale(1) rotate(0); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(.2) rotate(var(--rot)); opacity: 0; }
}
@keyframes cq-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.cq-fade { animation: cq-fade-in .5s ease both; }
@media (prefers-reduced-motion: reduce) {
  .cq-fade, .cq-orb-big, .cq-shard, .cq-shake { animation: none !important; }
}
`

// Small row of orbs shown during the fight. `lit` = how many memories are restored.
export function MemoryOrbs({ lit = 0, total = MEMORIES.length }) {
  return (
    <div
      aria-label={`${lit} of ${total} memories restored`}
      style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, padding: '6px 12px', borderRadius: 999,
        background: 'rgba(15,23,42,.65)', zIndex: 20, pointerEvents: 'none'
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 14, height: 14, borderRadius: '50%',
            background: i < lit ? ORB_COLORS[i % ORB_COLORS.length] : 'rgba(148,163,184,.35)',
            boxShadow: i < lit ? `0 0 10px ${ORB_COLORS[i % ORB_COLORS.length]}` : 'none',
            transition: 'all .4s'
          }}
        />
      ))}
    </div>
  )
}

export default function RecallCutscene({ onDone }) {
  const [step, setStep] = useState(0)            // 0..MEMORIES.length-1 = memories, MEMORIES.length = shatter
  const shattering = step >= MEMORIES.length
  const memory = MEMORIES[Math.min(step, MEMORIES.length - 1)]

  // After the orbs shatter, hand control back to the lesson page.
  useEffect(() => {
    if (!shattering) return undefined
    const t = setTimeout(() => onDone?.(), 2600)
    return () => clearTimeout(t)
  }, [shattering, onDone])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memory Corridor"
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center',
        background: '#020617', color: '#F8FAFC', overflow: 'hidden'
      }}
    >
      <style>{CSS}</style>

      <div
        key={memory.bg}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${memory.bg})`, backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: shattering ? 0.15 : 0.45, filter: 'grayscale(.5) blur(1px)', transition: 'opacity .6s'
        }}
      />

      <button
        type="button"
        onClick={() => onDone?.()}
        style={{
          position: 'absolute', top: 14, right: 14, zIndex: 2, padding: '8px 14px',
          borderRadius: 10, border: '1px solid rgba(248,250,252,.4)', background: 'rgba(15,23,42,.6)',
          color: '#F8FAFC', fontSize: 13, fontWeight: 700, cursor: 'pointer'
        }}
      >
        Skip
      </button>

      {!shattering ? (
        <div key={step} className="cq-fade" style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24, maxWidth: 560 }}>
          <div style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .8 }}>
            Memory {step + 1} of {MEMORIES.length} · {memory.island}
          </div>
          <div
            className="cq-orb-big"
            style={{
              width: 96, height: 96, margin: '18px auto', borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, #fff, ${ORB_COLORS[step % ORB_COLORS.length]} 60%)`,
              boxShadow: `0 0 40px ${ORB_COLORS[step % ORB_COLORS.length]}`,
              animation: 'cq-orb-pulse 1.6s ease-in-out infinite'
            }}
          />
          <h2 style={{ margin: '0 0 8px', fontSize: 26 }}>{memory.title}</h2>
          <p style={{ margin: '0 0 14px', fontSize: 16, lineHeight: 1.5 }}>{memory.caption}</p>
          <code
            style={{
              display: 'inline-block', padding: '8px 14px', borderRadius: 8, maxWidth: '100%',
              background: 'rgba(2,6,23,.8)', border: '1px solid rgba(248,250,252,.25)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 14, overflowWrap: 'anywhere'
            }}
          >
            {memory.code}
          </code>
          <div style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              style={{
                padding: '11px 26px', borderRadius: 12, border: 'none', background: '#10B981',
                color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer'
              }}
            >
              {step === MEMORIES.length - 1 ? 'The orbs tremble...' : 'Next memory'}
            </button>
          </div>
        </div>
      ) : (
        <div className="cq-fade" style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24 }}>
          <div style={{ position: 'relative', width: 0, height: 0, margin: '0 auto' }}>
            {MEMORIES.map((_, i) => {
              const angle = (i / MEMORIES.length) * Math.PI * 2
              return (
                <span
                  key={i}
                  className="cq-shard"
                  style={{
                    position: 'absolute', left: -9, top: -9, width: 18, height: 18, borderRadius: '50%',
                    background: ORB_COLORS[i % ORB_COLORS.length],
                    '--dx': `${Math.cos(angle) * 160}px`, '--dy': `${Math.sin(angle) * 110}px`, '--rot': `${i * 70}deg`,
                    animation: `cq-shatter 1.4s ${i * 0.08}s ease-out forwards`
                  }}
                />
              )
            })}
          </div>
          <h2 className="cq-shake" style={{ margin: '90px 0 8px', fontSize: 30, color: '#FBBF24', animation: 'cq-shake .4s 1.2s 3' }}>
            THE NULL SOVEREIGN
          </h2>
          <p style={{ margin: 0, fontSize: 16 }}>
            &ldquo;Your memories are mine. Prove they are yours.&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
