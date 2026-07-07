'use client'

import { useEffect, useRef } from 'react'

interface Props {
  leadName: string
  agentName?: string
  onClose: () => void
}

export default function WonCelebration({ leadName, agentName, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let confetti: any = null
    let frame = 0
    let animId: ReturnType<typeof setTimeout>

    async function run() {
      const mod = await import('canvas-confetti')
      confetti = mod.default

      const canvas = canvasRef.current
      if (!canvas) return

      const myConfetti = confetti.create(canvas, { resize: true, useWorker: false })

      // Burst 1 - sides
      const burst = (origin: { x: number; y: number }, angle: number) => {
        myConfetti({
          particleCount: 80,
          spread: 70,
          origin,
          angle,
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'],
          startVelocity: 55,
          gravity: 0.8,
          scalar: 1.2,
          ticks: 200,
        })
      }

      burst({ x: 0, y: 0.6 }, 60)
      burst({ x: 1, y: 0.6 }, 120)

      // Continuous rain
      let elapsed = 0
      function rain() {
        if (elapsed > 4000) return
        elapsed += 50
        myConfetti({
          particleCount: 4,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() * 0.3 },
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
          startVelocity: 20,
          gravity: 0.6,
          ticks: 150,
          scalar: 0.8,
        })
        animId = setTimeout(rain, 50)
      }

      // Firework bursts
      function fireworks() {
        if (frame >= 6) return
        frame++
        myConfetti({
          particleCount: 120,
          spread: 360,
          startVelocity: 45,
          origin: { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.3 },
          colors: ['#FFD700', '#FFF', '#FF6B6B', '#4ECDC4', '#DDA0DD'],
          gravity: 0.7,
          ticks: 250,
          scalar: 1.1,
          shapes: ['star', 'circle'],
        })
        setTimeout(fireworks, 400)
      }

      fireworks()
      setTimeout(rain, 600)
    }

    void run()

    return () => {
      clearTimeout(animId)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #1a0533 0%, #000010 70%)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Pulsing lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: 200 + i * 80,
              height: 200 + i * 80,
              left: `${10 + i * 12}%`,
              top: `${5 + (i % 3) * 30}%`,
              background: ['#FFD700','#FF6B6B','#4ECDC4','#DDA0DD','#45B7D1','#FFD700','#96CEB4','#FFEAA7'][i],
              filter: 'blur(40px)',
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${1.5 + i * 0.2}s`,
            }} />
        ))}
      </div>

      {/* Card */}
      <div className="relative z-10 text-center max-w-lg mx-4">
        {/* Trophy */}
        <div className="text-[7rem] leading-none mb-2 animate-bounce" style={{ filter: 'drop-shadow(0 0 30px #FFD700)' }}>
          🏆
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {['⭐','🌟','✨','🌟','⭐'].map((s, i) => (
            <span key={i} className="text-2xl animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>{s}</span>
          ))}
        </div>

        <h1 className="text-4xl font-black text-white mb-2"
          style={{ textShadow: '0 0 30px #FFD700, 0 0 60px #FFD700' }}>
          ¡VENTA GANADA!
        </h1>
        <p className="text-yellow-300 text-xl font-bold mb-1">{leadName}</p>
        {agentName && (
          <p className="text-white/70 text-sm mb-6">Por {agentName}</p>
        )}

        <div className="flex justify-center gap-3 mb-6 text-3xl">
          {'🎊🎉🥂🎊🎉'.split('').map((c, i) => (
            <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{c}</span>
          ))}
        </div>

        <button
          onClick={onClose}
          className="px-8 py-3 rounded-full text-sm font-bold transition-all text-gray-900 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', boxShadow: '0 0 30px #FFD700' }}>
          ¡Celebrar! 🎉
        </button>
      </div>
    </div>
  )
}
