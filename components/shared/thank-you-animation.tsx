"use client"

import { useEffect, useRef } from "react"

interface ThankYouAnimationProps {
  isVisible: boolean
  title?: string
  message: string
  onComplete?: () => void
  duration?: number // in milliseconds, default 2500
}

export function ThankYouAnimation({ 
  isVisible,
  title = "Thank you!",
  message,
  onComplete,
  duration = 2500 
}: ThankYouAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Confetti particles - monochrome/grayscale
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      opacity: number
      size: number
      rotation: number
      rotationSpeed: number
    }

    const particles: Particle[] = []

    // Create particles from corners - 3x more (90 per corner)
    const createParticles = (fromX: number, fromY: number, directionMultiplier: number) => {
      for (let i = 0; i < 90; i++) {
        particles.push({
          x: fromX,
          y: fromY,
          // Horizontal spread with directional bias (reduced for more vertical angle)
          vx: (Math.random() * 10 + 5) * directionMultiplier + (Math.random() - 0.5) * 4,
          // Moderate initial velocity to reach mid-upper screen
          vy: Math.random() * -20 - 10,
          opacity: Math.random() * 0.3 + 0.2, // subtle gray opacity
          size: Math.random() * 6 + 3,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
        })
      }
    }

    // Shoot confetti from corners with directional bias to overlap in center
    createParticles(0, window.innerHeight, 1) // bottom left shooting right
    createParticles(window.innerWidth, window.innerHeight, -1) // bottom right shooting left

    // Animation loop
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.3 // gravity
        particle.vx *= 0.99 // air resistance
        particle.rotation += particle.rotationSpeed

        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate((particle.rotation * Math.PI) / 180)
        ctx.fillStyle = `rgba(156, 163, 175, ${particle.opacity})` // gray-400 color
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
        ctx.restore()

        // Remove particles that are off screen
        if (particle.y > window.innerHeight + 50) {
          particles.splice(index, 1)
        }
      })

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animate()

    // Auto-complete after duration
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration)

    return () => {
      cancelAnimationFrame(animationId)
      clearTimeout(timer)
    }
  }, [isVisible, onComplete, duration])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      
      <div className="relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-lg px-8 py-6 shadow-lg">
          <h3 className="text-base font-semibold text-foreground text-center mb-1">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
