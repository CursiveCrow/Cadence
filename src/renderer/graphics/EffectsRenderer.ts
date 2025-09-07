import { Container, Graphics, Sprite, Texture } from 'pixi.js'

// Interface for gradient textures cache
interface GradientTextures {
    radialSmall?: Texture
    radialLarge?: Texture
    streak?: Texture
    particle?: Texture
}

// Interface for visual effects state
interface EffectsState {
    particles: Array<{
        id: string
        x: number
        y: number
        vx: number
        vy: number
        life: number
        maxLife: number
        size: number
        color: number
        alpha: number
    }>
    animations: Map<string, {
        startTime: number
        duration: number
        onUpdate: (progress: number) => void
        onComplete?: () => void
    }>
}

export class EffectsRenderer {
    private gradientTextures: GradientTextures = {}
    private effects: EffectsState = {
        particles: [],
        animations: new Map()
    }

    // Render visual effects overlay
    render(container: Container, deltaTime: number = 16) {
        this.updateAnimations(deltaTime)
        this.updateParticles(deltaTime)
        this.renderParticles(container)
    }

    // Create gradient textures for visual effects
    ensureGradientTextures() {
        if (!this.gradientTextures.radialSmall) {
            this.gradientTextures.radialSmall = this.createRadialGradient(
                256,
                'rgba(190,210,255,0.22)',
                'rgba(190,210,255,0)'
            )
        }

        if (!this.gradientTextures.radialLarge) {
            this.gradientTextures.radialLarge = this.createRadialGradient(
                512,
                'rgba(160,190,255,0.16)',
                'rgba(160,190,255,0)'
            )
        }

        if (!this.gradientTextures.streak) {
            this.gradientTextures.streak = this.createLinearGradient(
                512, 64,
                'rgba(255,255,255,0.08)',
                'rgba(255,255,255,0.02)'
            )
        }

        if (!this.gradientTextures.particle) {
            this.gradientTextures.particle = this.createRadialGradient(
                32,
                'rgba(255,255,255,1)',
                'rgba(255,255,255,0)'
            )
        }
    }

    private createRadialGradient(size: number, inner: string, outer: string): Texture {
        const c = document.createElement('canvas')
        c.width = c.height = Math.max(16, size)
        const ctx = c.getContext('2d')!
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        g.addColorStop(0, inner)
        g.addColorStop(1, outer)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, size, size)
        return Texture.from(c)
    }

    private createLinearGradient(w: number, h: number, from: string, to: string): Texture {
        const c = document.createElement('canvas')
        c.width = Math.max(16, w)
        c.height = Math.max(16, h)
        const ctx = c.getContext('2d')!
        const g = ctx.createLinearGradient(0, 0, w, 0)
        g.addColorStop(0.0, 'rgba(255,255,255,0)')
        g.addColorStop(0.15, from)
        g.addColorStop(0.5, to)
        g.addColorStop(0.85, from)
        g.addColorStop(1.0, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        return Texture.from(c)
    }

    // Create sidebar gradient effects
    renderSidebarGradients(
        container: Container,
        sidebarWidth: number,
        screenHeight: number,
        lagTarget: { x: number; y: number }
    ) {
        this.ensureGradientTextures()

        // Large bloom effect
        const bloomL = new Sprite(this.gradientTextures.radialLarge!)
        bloomL.blendMode = 'screen'
        bloomL.anchor.set(0.5)
        bloomL.x = Math.max(40, Math.min(sidebarWidth - 40, lagTarget.x - 20))
        bloomL.y = Math.max(40, Math.min(screenHeight - 40, lagTarget.y + 30))
        bloomL.alpha = 0.35
        const bloomLSize = Math.min(420, Math.max(220, Math.floor(Math.min(sidebarWidth, screenHeight) * 0.8)))
        bloomL.width = bloomLSize
        bloomL.height = bloomLSize
        container.addChild(bloomL)

        // Small bloom effect
        const bloomS = new Sprite(this.gradientTextures.radialSmall!)
        bloomS.blendMode = 'screen'
        bloomS.anchor.set(0.5)
        bloomS.x = Math.max(24, Math.min(sidebarWidth - 24, lagTarget.x + 14))
        bloomS.y = Math.max(24, Math.min(screenHeight - 24, lagTarget.y - 10))
        bloomS.alpha = 0.6
        const bloomSSize = Math.min(260, Math.max(140, Math.floor(Math.min(sidebarWidth, screenHeight) * 0.45)))
        bloomS.width = bloomSSize
        bloomS.height = bloomSSize
        container.addChild(bloomS)

        // Streak effect
        const streak = new Sprite(this.gradientTextures.streak!)
        streak.blendMode = 'screen'
        streak.anchor.set(0.5)
        streak.x = Math.max(60, Math.min(sidebarWidth - 60, lagTarget.x))
        streak.y = Math.max(36, Math.min(screenHeight - 36, lagTarget.y + 12))
        streak.rotation = -0.25
        streak.alpha = 0.4
        streak.width = Math.min(sidebarWidth * 0.9, 380)
        streak.height = 56
        container.addChild(streak)
    }

    // Particle system for interactive effects
    addParticleExplosion(x: number, y: number, color: number = 0xffffff, count: number = 8) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2
            const speed = 2 + Math.random() * 3
            const life = 60 + Math.random() * 120 // frames

            this.effects.particles.push({
                id: `particle-${Date.now()}-${i}`,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life,
                maxLife: life,
                size: 2 + Math.random() * 4,
                color,
                alpha: 0.8 + Math.random() * 0.2
            })
        }
    }

    private updateParticles(deltaTime: number) {
        this.effects.particles = this.effects.particles.filter(particle => {
            particle.x += particle.vx * deltaTime / 16
            particle.y += particle.vy * deltaTime / 16
            particle.life -= deltaTime / 16

            // Add gravity and air resistance
            particle.vy += 0.1 * deltaTime / 16
            particle.vx *= 0.98
            particle.vy *= 0.98

            return particle.life > 0
        })
    }

    private renderParticles(container: Container) {
        this.ensureGradientTextures()

        for (const particle of this.effects.particles) {
            const sprite = new Sprite(this.gradientTextures.particle!)
            sprite.anchor.set(0.5)
            sprite.x = particle.x
            sprite.y = particle.y
            sprite.width = particle.size
            sprite.height = particle.size
            sprite.alpha = particle.alpha * (particle.life / particle.maxLife)
            sprite.tint = particle.color
            container.addChild(sprite)
        }
    }

    // Animation system for smooth transitions
    animate(
        id: string,
        duration: number,
        onUpdate: (progress: number) => void,
        onComplete?: () => void
    ) {
        this.effects.animations.set(id, {
            startTime: performance.now(),
            duration,
            onUpdate,
            onComplete
        })
    }

    private updateAnimations(_deltaTime: number) {
        const now = performance.now()

        for (const [id, animation] of this.effects.animations) {
            const elapsed = now - animation.startTime
            const progress = Math.min(elapsed / animation.duration, 1)

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3)

            animation.onUpdate(eased)

            if (progress >= 1) {
                animation.onComplete?.()
                this.effects.animations.delete(id)
            }
        }
    }

    // Stop a specific animation
    stopAnimation(id: string) {
        this.effects.animations.delete(id)
    }

    // Clear all effects
    clearEffects() {
        this.effects.particles = []
        this.effects.animations.clear()
    }

    // Screen flash effect for feedback
    renderScreenFlash(container: Container, color: number = 0xffffff, intensity: number = 0.3) {
        const flash = new Graphics()
        flash.rect(-10000, -10000, 20000, 20000)
        flash.fill({ color, alpha: intensity })
        container.addChild(flash)

        // Auto-fade the flash
        this.animate(`flash-${Date.now()}`, 300, (progress) => {
            flash.alpha = intensity * (1 - progress)
        }, () => {
            try {
                container.removeChild(flash)
                flash.destroy()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[EffectsRenderer]flash cleanup', err)
            }
        })
    }

    // Ripple effect at a specific point
    renderRippleEffect(container: Container, x: number, y: number, color: number = 0xA855F7) {
        const ripple = new Graphics()
        container.addChild(ripple)

        this.animate(`ripple-${Date.now()}`, 1000, (progress) => {
            ripple.clear()
            const radius = progress * 100
            const alpha = (1 - progress) * 0.6

            // Multiple concentric circles for ripple effect
            for (let i = 0; i < 3; i++) {
                const r = radius - i * 15
                if (r > 0) {
                    ripple.circle(x, y, r)
                    ripple.stroke({ width: 2, color, alpha: alpha * (1 - i * 0.3) })
                }
            }
        }, () => {
            try {
                container.removeChild(ripple)
                ripple.destroy()
            } catch (err) {
                if (import.meta?.env?.DEV) console.debug('[EffectsRenderer]ripple cleanup', err)
            }
        })
    }

    // Pulse effect for important UI elements
    addPulseEffect(target: Container, intensity: number = 0.1, speed: number = 2): string {
        const id = `pulse-${Date.now()}`
        const originalAlpha = target.alpha

        const pulse = () => {
            const time = Date.now() / 1000
            target.alpha = originalAlpha + Math.sin(time * speed) * intensity
        }

        this.animate(id, Infinity, pulse)
        return id
    }

    // Get effects statistics for debugging
    getEffectsStats() {
        return {
            particleCount: this.effects.particles.length,
            activeAnimations: this.effects.animations.size,
            texturesLoaded: Object.keys(this.gradientTextures).length
        }
    }
}

