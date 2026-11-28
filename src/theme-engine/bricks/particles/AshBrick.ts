/**
 * src/theme-engine/bricks/particles/AshBrick.ts
 *
 * Brique de Particules : Cendres Volcaniques & Suie (Couche 3 : Particles).
 * Flocons calcinés irréguliers en chute lente avec flottement aérodynamique,
 * rotation 3D oscillante (flutter + tumbling), tailles et opacités variées,
 * turbulence douce par bruit Simplex 3D et éclairage directionnel cohérent avec
 * la source de lumière de la scène.
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

export interface AshProps {
  /** Teinte dominante des flocons de cendre (défaut: '#64748b'). */
  ashColor?: string
  /** Teinte secondaire pour les particules de suie foncée (défaut: '#1e293b'). */
  darkColor?: string
  /** Multiplicateur de densité/nombre de particules (0.2 à 2.5, défaut: 1.0 -> 280 particules). */
  density?: number
  /** Vitesse moyenne de descente (0.1 à 2.0, défaut: 0.35). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Opacité et contraste général des cendres (0.2 à 2.0, défaut: 0.85). */
  intensity?: number
  /** Turbulence et basculements aléatoires (0.0 à 1.0, défaut: 0.6). */
  randomness?: number
  /** Dérive horizontale globale du vent (0.0 à 1.0, défaut: 0.25). */
  drift?: number
  /** Position horizontale X de la source lumineuse de la scène (-1.0 à 1.0, défaut: 0.35). */
  lightSourceX?: number
  /** Position verticale Y de la source lumineuse de la scène (-1.0 à 1.5, défaut: 0.85). */
  lightSourceY?: number
}

export class AshInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'ash'

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
  private baseSeeds: Float32Array
  private baseOpacities: Float32Array
  private baseColors: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, seed, lightExposure, depthBlur]

  private ashColor: THREE.Color
  private darkColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private drift: number
  private lightSourceX: number
  private lightSourceY: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private lightDir = new THREE.Vector3()
  private flakeNormal = new THREE.Vector3()
  private euler = new THREE.Euler()
  private surgeMultiplier = 1.0

  constructor(id: string, props: AshProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.ashColor = new THREE.Color(props.ashColor ?? '#64748b')
    this.darkColor = new THREE.Color(props.darkColor ?? '#1e293b')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.35
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 0.85
    this.randomness = props.randomness ?? 0.6
    this.drift = props.drift ?? 0.25
    this.lightSourceX = props.lightSourceX ?? 0.35
    this.lightSourceY = props.lightSourceY ?? 0.85
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(300, Math.floor(280 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(280 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.rotations = new Float32Array(this.capacity * 3)
    this.rotVelocities = new Float32Array(this.capacity * 3)
    this.life = new Float32Array(this.capacity)
    this.maxLife = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.baseSeeds = new Float32Array(this.capacity)
    this.baseOpacities = new Float32Array(this.capacity)
    this.baseColors = new Float32Array(this.capacity * 3)
    this.instanceColors = new Float32Array(this.capacity * 3)
    this.instanceData = new Float32Array(this.capacity * 4)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const colorAttr = new THREE.InstancedBufferAttribute(this.instanceColors, 3)
    colorAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aColor', colorAttr)

    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uLightColor: context.sharedUniforms.uPaletteAccent,
        uQualityLevel: {
          value: this.currentQuality === 'HIGH' ? 2 : this.currentQuality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vColor = aColor;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uLightColor;
        uniform int uQualityLevel;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float alpha = vData.x;
          float seed = vData.y;
          float lightExp = vData.z;
          float blur = vData.w;

          if (alpha <= 0.004) discard;

          float r = length(p);
          if (r > 1.0) discard;

          // Silhouette irrégulière de flocon calciné unique par particule
          float edgeMask = 1.0;
          float poreMask = 1.0;
          if (uQualityLevel >= 1) {
            float angle = atan(p.y, p.x);
            float jag = 0.62
              + 0.16 * sin(angle * 3.0 + seed * 4.1)
              + 0.11 * cos(angle * 5.0 - seed * 2.7)
              + 0.07 * sin(angle * 7.0 + seed * 8.3);
            float feather = mix(0.08, 0.28, blur);
            edgeMask = 1.0 - smoothstep(jag - feather, jag + feather, r);

            // Micro-porosité et texture interne calcinée sur HIGH
            if (uQualityLevel >= 2 && edgeMask > 0.01) {
              float grain = sin(p.x * 11.0 + seed * 3.0) * cos(p.y * 13.0 - seed * 2.0);
              poreMask = 0.78 + 0.22 * grain;
            }
          } else {
            // Forme légère et rapide sur LOW
            float angle = atan(p.y, p.x);
            float jag = 0.68 + 0.15 * sin(angle * 3.0 + seed * 3.0);
            edgeMask = 1.0 - smoothstep(jag - 0.14, jag + 0.14, r);
          }

          if (edgeMask <= 0.01) discard;

          // Éclairage par la source lumineuse de la scène (diffusion + léger reflet rasant)
          vec3 shadowTint = vColor * 0.58;
          vec3 litTint = vColor * 1.35 + mix(vec3(0.85), uLightColor, 0.35) * 0.20;
          vec3 finalCol = mix(shadowTint, litTint, lightExp) * poreMask;

          // Légère variation d'épaisseur sur les bords du flocon
          float rim = smoothstep(0.35, 0.75, r) * lightExp * 0.14;
          finalCol += mix(vec3(0.9), uLightColor, 0.3) * rim;

          gl_FragColor = vec4(finalCol, clamp(edgeMask * alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    for (let i = 0; i < this.capacity; i++) {
      this.baseSeeds[i] = Math.random() * 500
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomAge = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 19
    this.positions[idx3 + 1] = randomAge ? (Math.random() - 0.5) * 13 : 6.0 + Math.random() * 2.0
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (5 * this.depthFactor)

    this.velocities[idx3] = this.drift * 0.25 + (Math.random() - 0.5) * 0.14
    this.velocities[idx3 + 1] = -(0.35 + Math.random() * 0.45) * this.speed
    this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.05

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    this.rotVelocities[idx3] = (Math.random() - 0.5) * 0.9 * (0.4 + this.randomness)
    this.rotVelocities[idx3 + 1] = (Math.random() - 0.5) * 1.1 * (0.4 + this.randomness)
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 0.8 * (0.4 + this.randomness)

    const maxLifeSec = 15.0 + Math.random() * 9.0
    this.maxLife[i] = maxLifeSec
    this.life[i] = randomAge ? Math.random() * maxLifeSec : 0

    // 3 paliers de taille calibrés : fines poussières de suie, flocons moyens, grands débris légers
    const tierRand = Math.random()
    let size = 0
    if (tierRand < 0.5) {
      size = 0.12 + Math.random() * 0.09
    } else if (tierRand < 0.85) {
      size = 0.23 + Math.random() * 0.12
    } else {
      size = 0.36 + Math.random() * 0.16
    }
    this.baseScales[i] = size
    this.baseOpacities[i] = 0.32 + Math.random() * 0.55

    // Panachage cendre grise naturelle et suie sombre
    const ratio = Math.random()
    const lightAsh = new THREE.Color('#cbd5e1').lerp(this.ashColor, 0.65)
    const darkSoot = new THREE.Color('#334155').lerp(this.darkColor, 0.75)
    this.tempColor.copy(lightAsh).lerp(darkSoot, ratio)

    this.baseColors[idx3] = this.tempColor.r
    this.baseColors[idx3 + 1] = this.tempColor.g
    this.baseColors[idx3 + 2] = this.tempColor.b
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.2)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    // Direction vers la source de lumière de la scène
    this.lightDir.set(this.lightSourceX * 4.0, this.lightSourceY * 4.0, 2.5).normalize()

    const isLow = this.currentQuality === 'LOW'
    const isHigh = this.currentQuality === 'HIGH'

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4

      this.life[i] += delta
      if (this.life[i] >= this.maxLife[i]) {
        this.resetParticle(i, false)
        continue
      }

      const progress = this.life[i] / this.maxLife[i]
      const px = this.positions[idx3]
      const py = this.positions[idx3 + 1]
      const pz = this.positions[idx3 + 2]
      const seed = this.baseSeeds[i]

      // Turbulence douce et portance aérodynamique
      let turbX = 0
      let updraft = 0
      if (isHigh) {
        turbX = simplex3D(px * 0.22, py * 0.22 + seed, time * 0.24)
        updraft = Math.max(-0.05, simplex3D(px * 0.16, time * 0.22, pz * 0.16)) * 0.22
      } else if (!isLow) {
        turbX = simplex3D(px * 0.18 + seed, py * 0.18, time * 0.2)
        updraft = Math.sin(time * 0.8 + seed) * 0.08
      } else {
        turbX = Math.sin(time * 0.9 + seed + py * 0.2) * 0.55
        updraft = Math.cos(time * 0.7 + seed) * 0.06
      }

      // Flottement latéral couplé à l'inclinaison du flocon
      const flutter = Math.sin(this.rotations[idx3 + 1]) * 0.22 * (0.4 + this.randomness)

      // Répulsion du vent de souris
      let repulseX = 0
      let repulseY = 0
      if (!isLow) {
        const dx = px - mouseWorldX
        const dy = py - mouseWorldY
        const distSq = dx * dx + dy * dy
        if (distSq < 7.0 && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const force = (1.0 - dist / 2.65) * 0.9
          repulseX = (dx / dist) * force
          repulseY = (dy / dist) * force
        }
      }

      const windGust = this.drift * (0.75 + 0.35 * Math.sin(time * 0.38))
      const vx =
        (this.velocities[idx3] + windGust + flutter + turbX * this.randomness * 0.42 + repulseX) *
        this.surgeMultiplier
      const vy = (this.velocities[idx3 + 1] + updraft + repulseY) * this.surgeMultiplier
      const vz = this.velocities[idx3 + 2]

      this.positions[idx3] += vx * delta * 2.0
      this.positions[idx3 + 1] += vy * delta * 2.0
      this.positions[idx3 + 2] += vz * delta * 2.0

      if (this.positions[idx3 + 1] < -6.8) {
        this.resetParticle(i, false)
        continue
      }
      if (this.positions[idx3] > 13.0) this.positions[idx3] = -13.0
      if (this.positions[idx3] < -13.0) this.positions[idx3] = 13.0

      // Rotation 3D fluide (flutter + tumbling asymétrique)
      const wobble = 0.65 + 0.35 * Math.sin(time * 1.3 + seed)
      this.rotations[idx3] += this.rotVelocities[idx3] * wobble * delta
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta
      this.rotations[idx3 + 2] += this.rotVelocities[idx3 + 2] * delta

      // Calcul d'exposition à la source lumineuse de la scène selon l'orientation 3D
      this.euler.set(this.rotations[idx3], this.rotations[idx3 + 1], this.rotations[idx3 + 2])
      this.flakeNormal.set(0, 0, 1).applyEuler(this.euler)
      // Double face : valeur absolue du produit scalaire + proximité relative à la source
      const facing = Math.abs(this.flakeNormal.dot(this.lightDir))
      const distToLight = Math.hypot(px * 0.12 - this.lightSourceX, py * 0.15 - this.lightSourceY)
      const lightProximity = Math.max(0.15, 1.0 - distToLight * 0.35)
      const lightExposure = THREE.MathUtils.clamp(0.2 + 0.8 * facing * lightProximity, 0.1, 1.0)

      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.55, 1.35)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.38, 1.0)
      const depthBlur = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.75, 0.1),
        0.05,
        0.85
      )

      let lifeFade = 1.0
      if (progress < 0.12) {
        lifeFade = progress / 0.12
      } else if (progress > 0.85) {
        lifeFade = (1.0 - progress) / 0.15
      }

      const finalAlpha = Math.min(
        0.95,
        this.baseOpacities[i] * lifeFade * depthOpacity * Math.min(1.5, this.intensity)
      )

      this.instanceColors[idx3] = this.baseColors[idx3]
      this.instanceColors[idx3 + 1] = this.baseColors[idx3 + 1]
      this.instanceColors[idx3 + 2] = this.baseColors[idx3 + 2]

      this.instanceData[idx4] = finalAlpha
      this.instanceData[idx4 + 1] = seed
      this.instanceData[idx4 + 2] = lightExposure
      this.instanceData[idx4 + 3] = depthBlur

      const scale =
        this.baseScales[i] *
        Math.min(1.25, 0.65 + 0.35 * this.intensity) *
        depthFactor *
        this.surgeMultiplier

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.copy(this.euler)
      this.dummy.scale.set(scale, scale, scale)
      this.dummy.updateMatrix()

      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }

    this.mesh.count = this.activeCount
    this.mesh.instanceMatrix.needsUpdate = true
    const colorAttr = this.mesh.geometry.getAttribute('aColor') as THREE.InstancedBufferAttribute
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    colorAttr.needsUpdate = true
    dataAttr.needsUpdate = true
  }

  public updateProps(newProps: Partial<AshProps>): void {
    if (newProps.ashColor !== undefined) this.ashColor.set(newProps.ashColor)
    if (newProps.darkColor !== undefined) this.darkColor.set(newProps.darkColor)

    if (newProps.ashColor !== undefined || newProps.darkColor !== undefined) {
      const lightAsh = new THREE.Color('#cbd5e1').lerp(this.ashColor, 0.65)
      const darkSoot = new THREE.Color('#334155').lerp(this.darkColor, 0.75)
      for (let i = 0; i < this.capacity; i++) {
        const ratio = Math.random()
        this.tempColor.copy(lightAsh).lerp(darkSoot, ratio)
        const cIdx = i * 3
        this.baseColors[cIdx] = this.tempColor.r
        this.baseColors[cIdx + 1] = this.tempColor.g
        this.baseColors[cIdx + 2] = this.tempColor.b
      }
    }

    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.drift !== undefined) this.drift = newProps.drift
    if (newProps.lightSourceX !== undefined) this.lightSourceX = newProps.lightSourceX
    if (newProps.lightSourceY !== undefined) this.lightSourceY = newProps.lightSourceY

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(280 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(160 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(80 * this.density * mobileRatio))
    }

    if (this.mesh) {
      this.mesh.count = this.activeCount
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
    this.surgeMultiplier = 1.7
  }

  public dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      if (this.mesh.geometry) this.mesh.geometry.dispose()
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach((m) => m.dispose())
        } else {
          this.mesh.material.dispose()
        }
      }
      this.mesh = null
      this.material = null
    }
  }
}

export const AshDefinition: IBrickDefinition<AshProps> = {
  type: 'ash',
  category: 'particles',
  create: (id, props, context) => new AshInstance(id, props, context),
}

BrickRegistry.register(AshDefinition)
