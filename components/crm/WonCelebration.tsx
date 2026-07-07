'use client'

import { useEffect, useRef } from 'react'

interface Props {
  leadName: string
  agentName?: string
  onClose: () => void
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; rotation: number; rotSpeed: number; alpha: number
}

const COLORS = ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98FB98','#FFA07A','#87CEEB']

export default function WonCelebration({ leadName, agentName, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Particle[] = []

    function spawn(count: number, originX: number, originY: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 4 + Math.random() * 10
        particles.push({
          x: originX, y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 8,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
          alpha: 1,
        })
      }
    }

    // Initial bursts
    spawn(120, canvas.width * 0.2, canvas.height * 0.5)
    spawn(120, canvas.width * 0.8, canvas.height * 0.5)
    spawn(80, canvas.width * 0.5, canvas.height * 0.3)

    // Timed extra bursts
    const t1 = setTimeout(() => spawn(100, canvas.width * 0.3, canvas.height * 0.4), 400)
    const t2 = setTimeout(() => spawn(100, canvas.width * 0.7, canvas.height * 0.4), 800)
    const t3 = setTimeout(() => spawn(80, canvas.width * 0.5, canvas.height * 0.5), 1200)
    const t4 = setTimeout(() => spawn(60, canvas.width * 0.15, canvas.height * 0.3), 1600)
    const t5 = setTimeout(() => spawn(60, canvas.width * 0.85, canvas.height * 0.3), 2000)

    let rafId: number

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25   // gravity
        p.vx *= 0.99
        p.rotation += p.rotSpeed
        p.alpha -= 0.008

        if (p.alpha <= 0) { particles.splice(i, 1); continue }

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      clearTimeout(t4); clearTimeout(t5)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #1a0533 0%, #000010 70%)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Pulsing lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
              width: 200 + i * 80, height: 200 + i * 80,
              left: `${10 + i * 12}%`, top: `${5 + (i % 3) * 30}%`,
              background: COLORS[i],
              filter: 'blur(40px)',
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${1.5 + i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative z-10 text-center max-w-lg mx-4">
        <div className="text-[7rem] leading-none mb-2 animate-bounce" style={{ filter: 'drop-shadow(0 0 30px #FFD700)' }}>
          🏆
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {['⭐','🌟','✨','🌟','⭐'].map((s, i) => (
            <span key={i} className="text-2xl animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>{s}</span>
          ))}
        </div>

        <h1
          className="text-4xl font-black text-white mb-2"
          style={{ textShadow: '0 0 30px #FFD700, 0 0 60px #FFD700' }}
        >
          ¡VENTA GANADA!
        </h1>
        <p className="text-yellow-300 text-xl font-bold mb-1">{leadName}</p>
        {agentName && <p className="text-white/70 text-sm mb-6">Por {agentName}</p>}

        <div className="flex justify-center gap-3 mb-6 text-3xl">
          {'🎊🎉🥂🎊🎉'.split('').map((c, i) => (
            <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{c}</span>
          ))}
        </div>

        <button
          onClick={onClose}
          className="px-8 py-3 rounded-full text-sm font-bold transition-all text-gray-900 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', boxShadow: '0 0 30px #FFD700' }}
        >
          ¡Celebrar! 🎉
        </button>
      </div>
    </div>
  )
}
