/**
 * src/theme-engine/bricks/particles/DustBrick.ts
 *
 * Brique de Particules : Poussière en Suspension & Motes Dorées (Couche 3 : Particles).
 * Particules lentes à mouvement brownien 3D amorti, nettement plus visibles lorsqu'elles
 * traversent les faisceaux de lumière issus de la source lumineuse de la scène (effet Tyndall),
 * tailles variées (fines poussières nettes jusqu'aux disques bokeh flous de premier plan)
 * et rendu ShaderMaterial GPU sans artefact ni allocation par frame.
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

export interface DustProps {
  /** Teinte lumineuse des grains de poussière (défaut: '#fef08a'). */
  dustColor?: string
  /** Multiplicateur de densité/nombre de motes (0.2 à 2.5, défaut: 1.0 -> 320 motes). */
  density?: number
  /** Vitesse de dérive lente (0.05 à 1.5, défaut: 0.2). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Brillance et radiance des reflets (0.2 à 2.0, défaut: 1.1). */
  intensity?: number
  /** Amplitude de dispersion brownienne (0.0 à 1.0, défaut: 0.4). */
  randomness?: number
  /** Fréquence du scintillement d'entrée/sortie de lumière (0.5 à 3.0, défaut: 1.2). */
  twinkleSpeed?: number
  /** Position horizontale X de la source lumineuse des rayons (-1.0 à 1.0, défaut: 0.35). */
  lightSourceX?: number
  /** Position verticale Y de la source lumineuse des rayons (-1.0 à 1.5, défaut: 0.85). */
  lightSourceY?: number
  /** Contraste d'illumination dans les rayons vs pénombre (0.0 à 1.0, défaut: 0.75). */
  beamVisibility?: number
}

const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(25))

export class DustInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'dust'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private baseScales: Float32Array
  private phases: Float32Array
  private seeds: Float32Array
  private bokehAmounts: Float32Array
  private baseColors: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, bokeh, beamGlow, seed]

  private dustColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private twinkleSpeed: number
  private lightSourceX: number
  private lightSourceY: number
  private beamVisibility: number
  private currentQuality: QualityTier
  private aspectRatio = 1.77

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private surgeMultiplier = 1.0

  constructor(id: string, props: DustProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.dustColor = new THREE.Color(props.dustColor ?? '#fef08a')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.2
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.1
    this.randomness = props.randomness ?? 0.4
    this.twinkleSpeed = props.twinkleSpeed ?? 1.2
    this.lightSourceX = props.lightSourceX ?? 0.35
    this.lightSourceY = props.lightSourceY ?? 0.85
    this.beamVisibility = props.beamVisibility ?? 0.75
    this.currentQuality = context.quality ?? 'HIGH'

    const res = context.sharedUniforms.uResolution.value
    if (res && res.y > 0) {
      this.aspectRatio = res.x / res.y
    }

    this.capacity = Math.max(360, Math.floor(320 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(320 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.baseScales = new Float32Array(this.capacity)
    this.phases = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.bokehAmounts = new Float32Array(this.capacity)
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
        uniform int uQualityLevel;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float alpha = vData.x;
          float bokeh = vData.y;
          float beamGlow = vData.z;

          if (alpha <= 0.004) discard;

          float r = length(p);
          if (r > 1.0) discard;

          float shape = 0.0;
          if (bokeh > 0.42 && uQualityLevel >= 1) {
            // Disque bokeh doux hors-focus (anneau léger + cœur aérien)
            float softDisc = 1.0 - smoothstep(0.32, 0.98, r);
            float rim = smoothstep(0.42, 0.72, r) * (1.0 - smoothstep(0.75, 0.98, r));
            shape = mix(softDisc * 0.65, softDisc * 0.42 + rim * 0.28, bokeh);
          } else {
            // Grain de poussière fin avec halo doux
            float core = exp(-r * r * mix(10.0, 4.5, bokeh));
            float outer = exp(-r * r * 2.8) * (0.28 + 0.35 * beamGlow);
            shape = (core * 0.85 + outer) * (1.0 - smoothstep(0.72, 1.0, r));
          }

          if (shape <= 0.004) discard;
          vec3 col = mix(vColor, vec3(1.0, 0.99, 0.92), beamGlow * 0.32 * (1.0 - bokeh * 0.5));
          float outAlpha = clamp(shape * alpha, 0.0, 1.0);
          gl_FragColor = vec4(col * outAlpha, outAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    this.updateBaseColors()

    for (let i = 0; i < this.capacity; i++) {
      const idx3 = i * 3
      const tierRand = Math.random()
      let size = 0.1
      let pz = -5 * this.depthFactor
      let bokeh = 0.1

      if (tierRand < 0.54) {
        // Fines poussières nettes
        pz = -9 * this.depthFactor + Math.random() * (4 * this.depthFactor)
        size = 0.06 + Math.random() * 0.06
        bokeh = 0.08 + Math.random() * 0.15
      } else if (tierRand < 0.86) {
        // Grains intermédiaires
        pz = -5 * this.depthFactor + Math.random() * (3.2 * this.depthFactor)
        size = 0.12 + Math.random() * 0.08
        bokeh = 0.22 + Math.random() * 0.25
      } else {
        // Motes de premier plan en flou bokeh
        pz = -1.6 * this.depthFactor + Math.random() * (2.6 * this.depthFactor)
        size = 0.22 + Math.random() * 0.18
        bokeh = 0.6 + Math.random() * 0.38
      }

      this.positions[idx3] = (Math.random() - 0.5) * 16
      this.positions[idx3 + 1] = (Math.random() - 0.5) * 11
      this.positions[idx3 + 2] = pz

      this.velocities[idx3] = (Math.random() - 0.5) * 0.08
      this.velocities[idx3 + 1] = (Math.random() - 0.5) * 0.08
      this.velocities[idx3 + 2] = (Math.random() - 0.5) * 0.03

      this.baseScales[i] = size
      this.bokehAmounts[i] = bokeh
      this.phases[i] = Math.random() * Math.PI * 2
      this.seeds[i] = Math.random() * 1000
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private updateBaseColors(): void {
    const warmWhite = new THREE.Color('#fffbeb')
    const deepGold = new THREE.Color('#f59e0b')
    for (let i = 0; i < this.capacity; i++) {
      const r = Math.random()
      if (r < 0.4) {
        this.tempColor.copy(this.dustColor).lerp(warmWhite, 0.38)
      } else if (r < 0.78) {
        this.tempColor.copy(this.dustColor)
      } else {
        this.tempColor.copy(this.dustColor).lerp(deepGold, 0.3)
      }
      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b
    }
  }

  public init(): void {}

  public onResize(width: number, height: number): void {
    if (height > 0) {
      this.aspectRatio = width / height
    }
  }

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.0)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0

    const isLow = this.currentQuality === 'LOW'
    const isHigh = this.currentQuality === 'HIGH'
    const damping = Math.exp(-delta * 2.4)
    const brownianAmp = (0.35 + this.randomness * 0.9) * Math.max(0.25, this.speed)

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const seed = this.seeds[i]

      // Mouvement brownien amorti + courants d'air lents
      let ax = 0
      let ay = 0
      let az = 0

      if (isHigh) {
        const px = this.positions[idx3]
        const py = this.positions[idx3 + 1]
        const pz = this.positions[idx3 + 2]
        const t = time * 0.16 * Math.max(0.4, this.speed)
        ax = simplex3D(px * 0.22, t, seed) * 0.45 + (Math.random() - 0.5) * 0.32
        ay = simplex3D(py * 0.22 + seed, t, seed + 5.0) * 0.42 + (Math.random() - 0.5) * 0.32
        az = simplex3D(seed, pz * 0.22, t) * 0.16
      } else if (!isLow) {
        const t = time * 0.14 * Math.max(0.4, this.speed)
        ax = simplex3D(this.positions[idx3] * 0.18, t, seed) * 0.42 + (Math.random() - 0.5) * 0.25
        ay = (Math.random() - 0.5) * 0.35 + Math.sin(time * 0.4 + seed) * 0.18
      } else {
        ax = Math.sin(time * 0.55 + seed) * 0.32 + (Math.random() - 0.5) * 0.22
        ay = Math.cos(time * 0.48 + seed * 1.3) * 0.32 + (Math.random() - 0.5) * 0.22
      }

      // Répulsion feutrée au passage de la souris
      if (!isLow) {
        const dx = this.positions[idx3] - mouseWorldX
        const dy = this.positions[idx3 + 1] - mouseWorldY
        const distSq = dx * dx + dy * dy
        if (distSq < 5.0 && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const force = (1.0 - dist / 2.24) * 0.55
          ax += (dx / dist) * force
          ay += (dy / dist) * force
        }
      }

      this.velocities[idx3] = this.velocities[idx3] * damping + ax * brownianAmp * delta
      this.velocities[idx3 + 1] = this.velocities[idx3 + 1] * damping + ay * brownianAmp * delta
      this.velocities[idx3 + 2] = this.velocities[idx3 + 2] * damping + az * brownianAmp * delta

      this.positions[idx3] += this.velocities[idx3] * delta * 2.4 * this.surgeMultiplier
      this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta * 2.4 * this.surgeMultiplier
      this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta * 1.6

      // Re-bouclage discret aux frontières
      if (this.positions[idx3 + 1] > 7.5) this.positions[idx3 + 1] = -7.5
      if (this.positions[idx3 + 1] < -7.5) this.positions[idx3 + 1] = 7.5
      if (this.positions[idx3] > 10.5) this.positions[idx3] = -10.5
      if (this.positions[idx3] < -10.5) this.positions[idx3] = 10.5

      const pz = this.positions[idx3 + 2]

      // Calcul d'exposition dans les faisceaux de lumière (effet Tyndall)
      const camDist = Math.max(1.5, 5.0 - pz)
      const halfH = camDist * TAN_HALF_FOV
      const sx = this.positions[idx3] / (halfH * this.aspectRatio)
      const sy = this.positions[idx3 + 1] / halfH

      const lx = sx - this.lightSourceX
      const ly = sy - this.lightSourceY
      const distToLight = Math.hypot(lx, ly)
      const angle = Math.atan2(ly, lx)

      let inBeam = 0.5
      if (isHigh) {
        // 3 faisceaux obliques émanant de la source lumineuse
        const shafts =
          0.5 +
          0.5 *
            Math.sin(angle * 7.5 + 0.4 + Math.sin(time * 0.15) * 0.25) *
            Math.cos(angle * 3.5 - 0.3)
        const radial = Math.max(0.0, 1.0 - distToLight * 0.48)
        inBeam = THREE.MathUtils.clamp(Math.pow(shafts, 1.4) * (0.35 + 0.85 * radial), 0.0, 1.0)
      } else if (!isLow) {
        const shafts = 0.5 + 0.5 * Math.sin(angle * 5.0 + 0.2)
        const radial = Math.max(0.0, 1.0 - distToLight * 0.45)
        inBeam = THREE.MathUtils.clamp(shafts * radial * 1.1, 0.0, 1.0)
      } else {
        inBeam = Math.max(0.15, 1.0 - distToLight * 0.52)
      }

      const shadowFloor = 1.0 - this.beamVisibility * 0.82
      const beamMultiplier = THREE.MathUtils.lerp(shadowFloor, 1.38, inBeam)

      // Micro-scintillement lorsqu'un grain tourne dans la lumière
      const twinkle = 0.62 + 0.38 * Math.sin(time * this.twinkleSpeed * 1.4 + this.phases[i])
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -9 * this.depthFactor, 2, 0.45, 0.95)
      const bokeh = this.bokehAmounts[i]
      // Les gros bokeh de premier plan restent plus translucides pour le réalisme
      const bokehAtten = bokeh > 0.5 ? 0.52 : 1.0

      const finalAlpha = Math.min(
        1.0,
        twinkle * beamMultiplier * depthOpacity * bokehAtten * Math.min(1.5, this.intensity * 0.78)
      )

      this.instanceColors[idx3] = this.baseColors[idx3]
      this.instanceColors[idx3 + 1] = this.baseColors[idx3 + 1]
      this.instanceColors[idx3 + 2] = this.baseColors[idx3 + 2]

      this.instanceData[idx4] = finalAlpha
      this.instanceData[idx4 + 1] = bokeh
      this.instanceData[idx4 + 2] = inBeam
      this.instanceData[idx4 + 3] = seed

      const depthFactor = THREE.MathUtils.mapLinear(pz, -9 * this.depthFactor, 2, 0.75, 1.3)
      const scale =
        this.baseScales[i] *
        Math.min(1.4, 0.55 + 0.45 * this.intensity) *
        depthFactor *
        (0.9 + 0.1 * twinkle) *
        this.surgeMultiplier

      this.dummy.position.set(this.positions[idx3], this.positions[idx3 + 1], pz)
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

  public updateProps(newProps: Partial<DustProps>): void {
    if (newProps.dustColor !== undefined) {
      this.dustColor.set(newProps.dustColor)
      this.updateBaseColors()
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) this.intensity = newProps.intensity
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.twinkleSpeed !== undefined) this.twinkleSpeed = newProps.twinkleSpeed
    if (newProps.lightSourceX !== undefined) this.lightSourceX = newProps.lightSourceX
    if (newProps.lightSourceY !== undefined) this.lightSourceY = newProps.lightSourceY
    if (newProps.beamVisibility !== undefined) this.beamVisibility = newProps.beamVisibility

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const mobileRatio = isMobile ? 0.5 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(320 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(190 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(95 * this.density * mobileRatio))
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
    this.surgeMultiplier = 1.6
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

export const DustDefinition: IBrickDefinition<DustProps> = {
  type: 'dust',
  category: 'particles',
  create: (id, props, context) => new DustInstance(id, props, context),
}

BrickRegistry.register(DustDefinition)
