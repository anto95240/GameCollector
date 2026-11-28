/**
 * src/theme-engine/bricks/particles/SmokeBrick.ts
 *
 * Brique de Particules : Volutes de Fumée Vaporeuses (Couche 3 : Particles).
 * Grands sprites très doux animés par turbulence de type curl (tourbillons sans
 * divergence) en shader GPU et advection, expansion continue puis dissipation par
 * érosion vaporeuse à faible opacité, montée avec dérive sous le vent, et éclairage
 * par dessous lorsqu'une source lumineuse éclaire la base du panache.
 */

import * as THREE from 'three'

import type {
  BrickContext,
  IBrickDefinition,
  IBrickInstance,
  InteractionState,
  QualityTier,
  RareEventTrigger,
} from '../../types'
import { simplex3D } from '../../utils/noise'
import { BrickRegistry } from '../registry'

export interface SmokeProps {
  /** Teinte dominante de la fumée vaporeuse (défaut: '#94a3b8'). */
  smokeColor?: string
  /** Teinte secondaire d'ombrage interne (défaut: '#64748b'). */
  tintColor?: string
  /** Multiplicateur de densité/nombre de volutes (0.2 à 2.5, défaut: 1.0 -> 110 volutes). */
  density?: number
  /** Vitesse d'ascension lente (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.45). */
  depth?: number
  /** Opacité générale des volutes vaporeuses (0.2 à 2.0, défaut: 0.7). */
  intensity?: number
  /** Turbulence chaotique et dispersion des vortex (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Facteur d'expansion des volutes au fil de leur vie (0.5 à 2.5, défaut: 1.4). */
  expansionRate?: number
  /** Cadence d'estompement et dissipation (0.5 à 2.0, défaut: 1.0). */
  dissipationSpeed?: number
  /** Dérive horizontale sous le vent (-1.5 à 1.5, défaut: 0.25). */
  windDrift?: number
  /** Position horizontale X de la source lumineuse de la scène (-1.0 à 1.0, défaut: 0.0). */
  lightSourceX?: number
  /** Position verticale Y de la source lumineuse de la scène (-1.5 à 1.5, défaut: -0.85 = éclairage par dessous). */
  lightSourceY?: number
  /** Intensité de l'éclairage par dessous / directionnel (0.0 à 1.5, défaut: 0.45). */
  underLightIntensity?: number
  /** Teinte optionnelle de l'éclairage par dessous (défaut: dérivée de l'accent du thème). */
  underLightColor?: string
}

export class SmokeInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'smoke'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private rotations: Float32Array
  private rotVelocities: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array
  private baseColors: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, progress, seed, underLightAmount]
  private instanceLightDir: Float32Array // [dirX, dirY]

  private smokeColor: THREE.Color
  private tintColor: THREE.Color
  private underLightColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private expansionRate: number
  private dissipationSpeed: number
  private windDrift: number
  private lightSourceX: number
  private lightSourceY: number
  private underLightIntensity: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private fallbackWarmLight = new THREE.Color('#fdba74')
  private surgeMultiplier = 1.0

  constructor(id: string, props: SmokeProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.smokeColor = new THREE.Color(props.smokeColor ?? '#94a3b8')
    this.tintColor = new THREE.Color(props.tintColor ?? '#64748b')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.45
    this.intensity = props.intensity ?? 0.7
    this.randomness = props.randomness ?? 0.5
    this.expansionRate = props.expansionRate ?? 1.4
    this.dissipationSpeed = props.dissipationSpeed ?? 1.0
    this.windDrift = props.windDrift ?? 0.25
    this.lightSourceX = props.lightSourceX ?? 0.0
    this.lightSourceY = props.lightSourceY ?? -0.85
    this.underLightIntensity = THREE.MathUtils.clamp(props.underLightIntensity ?? 0.45, 0.0, 1.5)
    this.currentQuality = context.quality ?? 'HIGH'

    this.underLightColor = new THREE.Color()
    this.resolveUnderLightColor(props.underLightColor, context.sharedUniforms.uPaletteAccent.value)

    this.capacity = Math.max(140, Math.floor(110 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(110 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.rotations = new Float32Array(this.capacity)
    this.rotVelocities = new Float32Array(this.capacity)
    this.life = new Float32Array(this.capacity)
    this.maxLife = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.baseColors = new Float32Array(this.capacity * 3)
    this.instanceColors = new Float32Array(this.capacity * 3)
    this.instanceData = new Float32Array(this.capacity * 4)
    this.instanceLightDir = new Float32Array(this.capacity * 2)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const colorAttr = new THREE.InstancedBufferAttribute(this.instanceColors, 3)
    colorAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aColor', colorAttr)

    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    const lightAttr = new THREE.InstancedBufferAttribute(this.instanceLightDir, 2)
    lightAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aLightDir', lightAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: context.sharedUniforms.uTime,
        uIntensity: { value: this.intensity },
        uUnderLightColor: { value: this.underLightColor },
        uUnderLightIntensity: { value: this.underLightIntensity },
        uQualityLevel: {
          value: this.currentQuality === 'HIGH' ? 2 : this.currentQuality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute vec4 aData;
        attribute vec2 aLightDir;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;
        varying vec2 vLightDir;

        void main() {
          vUv = uv;
          vColor = aColor;
          vData = aData;
          vLightDir = aLightDir;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uUnderLightColor;
        uniform float uUnderLightIntensity;
        uniform int uQualityLevel;

        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;
        varying vec2 vLightDir;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float smokeFbm(vec2 p, int octaves) {
          float sum = 0.0;
          float amp = 0.52;
          for (int i = 0; i < 3; i++) {
            if (i >= octaves) break;
            sum += amp * valueNoise(p);
            p = p * 2.04 + vec2(17.1, 31.7);
            amp *= 0.5;
          }
          return sum;
        }

        void main() {
          float alpha = vData.x;
          if (alpha <= 0.004) discard;

          float progress = vData.y;
          float seed = vData.z;
          float underLightAmt = vData.w;

          vec2 p = (vUv - 0.5) * 2.0;
          float r = length(p);
          if (r > 1.0) discard;

          // Enveloppe gaussienne ultra-douce sans bordure circulaire nette
          float radial = exp(-r * r * 2.6) * (1.0 - smoothstep(0.55, 1.0, r));
          if (radial <= 0.004) discard;

          float wispDensity = radial;

          if (uQualityLevel >= 1) {
            // Distorsion de type curl interne animée pour sculpter des volutes vaporeuses
            float t = uTime * 0.22 + seed * 0.13;
            vec2 q = p * 2.1 + vec2(seed * 0.7, -t * 0.65);
            float n1 = valueNoise(q);
            float n2 = valueNoise(q + vec2(3.7, 5.2) + t * 0.35);
            // Déplacement tourbillonnaire type curl (orthogonal au gradient)
            vec2 curlWarp = vec2(n2 - 0.5, 0.5 - n1) * (0.68 + 0.45 * progress);

            int octaves = uQualityLevel >= 2 ? 3 : 2;
            float fbm = smokeFbm(p * 2.35 + curlWarp + vec2(seed * 1.3, -t * 0.4), octaves);

            // Érosion progressive en fin de vie pour une dissipation vaporeuse naturelle
            float erodeFloor = mix(0.14, 0.48, smoothstep(0.42, 1.0, progress));
            float wispMask = smoothstep(erodeFloor, erodeFloor + 0.52, fbm + radial * 0.45);
            wispDensity = radial * (0.35 + 0.85 * wispMask);
          }

          if (wispDensity <= 0.005) discard;

          // Éclairage par dessous / directionnel par la source lumineuse de la scène
          float dirAlign = clamp(dot(p, vLightDir) * 0.5 + 0.5, 0.0, 1.0);
          float rimScatter = smoothstep(0.25, 0.95, dirAlign) * (1.0 - r * 0.45);
          vec3 col = mix(vColor * 0.86, vColor * 1.12, dirAlign);
          col += uUnderLightColor * rimScatter * underLightAmt * uUnderLightIntensity * 0.85;

          // Faible opacité vaporeuse pour superposer plusieurs volutes sans saturer
          float lowOpacity = 0.26 * clamp(uIntensity, 0.15, 2.0);
          float outAlpha = clamp(wispDensity * alpha * lowOpacity, 0.0, 0.72);

          gl_FragColor = vec4(col, outAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    this.updateBaseColors()

    for (let i = 0; i < this.capacity; i++) {
      this.seeds[i] = Math.random() * 500
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private resolveUnderLightColor(
    explicitHex: string | undefined,
    paletteAccent: THREE.Color
  ): void {
    if (explicitHex) {
      this.underLightColor.set(explicitHex)
      return
    }
    // Utilise l'accent du thème s'il est suffisamment lumineux, sinon une lueur chaude douce
    const lum = 0.2126 * paletteAccent.r + 0.7152 * paletteAccent.g + 0.0722 * paletteAccent.b
    if (lum > 0.22) {
      this.underLightColor.copy(paletteAccent)
    } else {
      this.underLightColor.copy(this.fallbackWarmLight)
    }
  }

  private updateBaseColors(): void {
    for (let i = 0; i < this.capacity; i++) {
      const ratio = Math.random() * 0.65
      this.tempColor.copy(this.smokeColor).lerp(this.tintColor, ratio)
      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b
    }
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 9.0
    this.positions[idx3 + 1] = randomAge ? -5.0 + Math.random() * 11.0 : -5.6 + Math.random() * 1.8
    this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4 * this.depthFactor)

    this.velocities[idx3] = (Math.random() - 0.5) * 0.14 * this.randomness
    this.velocities[idx3 + 1] = (0.38 + Math.random() * 0.28) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.04

    this.rotations[i] = Math.random() * Math.PI * 2
    this.rotVelocities[i] = (Math.random() - 0.5) * 0.16 * (0.4 + this.randomness)

    const maxLifeSec = (8.0 + Math.random() * 4.5) / Math.max(0.3, this.dissipationSpeed)
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // Grands sprites doux de tailles variées
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.4) {
      size = 0.85 + Math.random() * 0.35
    } else if (tierRand < 0.8) {
      size = 1.25 + Math.random() * 0.45
    } else {
      size = 1.75 + Math.random() * 0.55
    }
    this.baseScales[i] = size
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.2)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0
    const lightX = this.lightSourceX * 6.0
    const lightY = this.lightSourceY * 5.0
    const isLow = this.currentQuality === 'LOW'
    const eps = 0.14

    // Vent doux avec variations organiques
    const windBase =
      this.windDrift * (0.72 + 0.35 * Math.sin(time * 0.32) + 0.18 * Math.sin(time * 0.81))

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const idx2 = i * 2

      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      const progress = this.life[i] / this.maxLife[i]
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]
      const seed = this.seeds[i]

      // Mouvement tourbillonnaire de type curl (2D sur Simplex 3D)
      let curlVx = 0
      let curlVy = 0
      if (!isLow) {
        const sx = px * 0.16
        const sy = py * 0.16
        const st = time * 0.16 + seed * 0.1
        const nTop = simplex3D(sx, sy + eps, st)
        const nBot = simplex3D(sx, sy - eps, st)
        const nRight = simplex3D(sx + eps, sy, st)
        const nLeft = simplex3D(sx - eps, sy, st)
        curlVx = ((nTop - nBot) / (2 * eps)) * 0.36 * (0.4 + this.randomness)
        curlVy = -((nRight - nLeft) / (2 * eps)) * 0.22 * (0.4 + this.randomness)
      } else {
        curlVx = Math.sin(time * 0.6 + seed + py * 0.3) * 0.22 * this.randomness
      }

      // Répulsion douce au passage de la souris
      let repulseX = 0
      let repulseY = 0
      const dx = px - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      if (distSq < 7.0 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.65) * 0.85
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      // Dérive croissante du vent avec la hauteur / l'âge
      const windFactor = 0.35 + 0.85 * progress
      const vx =
        (this.velocities[idx3] + windBase * windFactor + curlVx + repulseX) * this.surgeMultiplier
      const vy = (this.velocities[idx3 + 1] + curlVy + repulseY) * this.surgeMultiplier

      this.positions[idx3] += vx * delta * 1.75
      this.positions[idx3 + 1] += vy * delta * 1.75
      this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta * 1.75

      if (this.positions[idx3 + 1] > 9.5) {
        this.resetParticle(i, false)
        continue
      }

      this.rotations[i] += this.rotVelocities[i] * delta

      // Expansion continue puis dissipation progressive
      const expansion = 1.0 + Math.pow(progress, 0.72) * (this.expansionRate * 1.45)

      let lifeFade = 1.0
      if (progress < 0.16) {
        lifeFade = progress / 0.16
      } else if (progress > 0.45) {
        lifeFade = Math.max(0.0, 1.0 - THREE.MathUtils.smoothstep(progress, 0.45, 1.0))
      }

      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.65, 1.25)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.58, 1.0)

      // Éclairage par la source lumineuse (particulièrement fort quand la source est en dessous)
      const ldx = lightX - this.positions[idx3]
      const ldy = lightY - this.positions[idx3 + 1]
      const lDist = Math.hypot(ldx, ldy) || 1.0
      const dirX = ldx / lDist
      const dirY = ldy / lDist
      // Direction locale dans le repère du sprite (compensée par -rotation.z)
      const cosR = Math.cos(-this.rotations[i])
      const sinR = Math.sin(-this.rotations[i])
      this.instanceLightDir[idx2] = dirX * cosR - dirY * sinR
      this.instanceLightDir[idx2 + 1] = dirX * sinR + dirY * cosR

      // Proximité de la source lumineuse : plus intense près de la base quand source en bas
      const proximity = Math.exp(-lDist * 0.18)
      const underLightAmt = THREE.MathUtils.clamp(proximity * (1.15 - progress * 0.55), 0.0, 1.2)

      this.instanceColors[idx3] = this.baseColors[idx3] * depthOpacity
      this.instanceColors[idx3 + 1] = this.baseColors[idx3 + 1] * depthOpacity
      this.instanceColors[idx3 + 2] = this.baseColors[idx3 + 2] * depthOpacity

      this.instanceData[idx4] = Math.max(0, Math.min(1, lifeFade * depthOpacity))
      this.instanceData[idx4 + 1] = progress
      this.instanceData[idx4 + 2] = seed
      this.instanceData[idx4 + 3] = underLightAmt

      const scale = this.baseScales[i] * expansion * depthFactor
      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.set(0, 0, this.rotations[i])
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    for (let i = this.activeCount; i < this.capacity; i++) {
      this.instanceData[i * 4] = 0
      this.dummy.position.set(0, -999, 0)
      this.dummy.scale.set(0, 0, 0)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.instanceMatrix.needsUpdate = true
    const colorAttr = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute
    if (colorAttr) colorAttr.needsUpdate = true
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    if (dataAttr) dataAttr.needsUpdate = true
    const lightAttr = this.mesh.geometry.getAttribute('aLightDir') as THREE.InstancedBufferAttribute
    if (lightAttr) lightAttr.needsUpdate = true
  }

  public updateProps(newProps: Partial<SmokeProps>): void {
    let colorsChanged = false
    if (newProps.smokeColor !== undefined) {
      this.smokeColor.set(newProps.smokeColor)
      colorsChanged = true
    }
    if (newProps.tintColor !== undefined) {
      this.tintColor.set(newProps.tintColor)
      colorsChanged = true
    }
    if (colorsChanged) {
      this.updateBaseColors()
    }

    if (newProps.underLightColor !== undefined) {
      this.underLightColor.set(newProps.underLightColor)
      if (this.material) {
        this.material.uniforms.uUnderLightColor.value.copy(this.underLightColor)
      }
    }
    if (newProps.underLightIntensity !== undefined) {
      this.underLightIntensity = THREE.MathUtils.clamp(newProps.underLightIntensity, 0.0, 1.5)
      if (this.material) {
        this.material.uniforms.uUnderLightIntensity.value = this.underLightIntensity
      }
    }
    if (newProps.lightSourceX !== undefined) this.lightSourceX = newProps.lightSourceX
    if (newProps.lightSourceY !== undefined) this.lightSourceY = newProps.lightSourceY
    if (newProps.windDrift !== undefined) this.windDrift = newProps.windDrift

    if (newProps.speed !== undefined) {
      const ratio = this.speed > 0.001 ? newProps.speed / this.speed : 1.0
      this.speed = newProps.speed
      for (let i = 0; i < this.capacity; i++) {
        this.velocities[i * 3 + 1] *= ratio
      }
    }
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.material) this.material.uniforms.uIntensity.value = this.intensity
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.expansionRate !== undefined) this.expansionRate = newProps.expansionRate
    if (newProps.dissipationSpeed !== undefined) this.dissipationSpeed = newProps.dissipationSpeed

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.5 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(110 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(65 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(32 * this.density * mobileRatio))
    }

    if (this.material) {
      this.material.uniforms.uQualityLevel.value =
        quality === 'HIGH' ? 2 : quality === 'MEDIUM' ? 1 : 0
    }
  }

  public onQualityChange(quality: QualityTier): void {
    this.currentQuality = quality
    this.applyQuality(quality)
  }

  public triggerEvent(_event: RareEventTrigger): void {
    this.surgeMultiplier = 2.0
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.6
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.material) {
        this.material.dispose()
        this.material = null
      }
      this.mesh = null
    }
  }
}

export const SmokeDefinition: IBrickDefinition<SmokeProps> = {
  type: 'smoke',
  category: 'particles',
  create: (id, props, context) => new SmokeInstance(id, props, context),
}

BrickRegistry.register(SmokeDefinition)
