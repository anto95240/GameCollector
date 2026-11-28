/**
 * src/theme-engine/bricks/particles/ConfettiBrick.ts
 *
 * Brique de Particules : Pluie de Confettis Festive & Célébration (Couche 3 : Particles).
 * Confettis fins et élancés (rectangles étroits et rubans ondulés), rotation 3D vive
 * modulant dynamiquement la brillance et l'éclat métallique au fil des retournements,
 * résistance aérodynamique ralentissant les faces à plat et portance oscillante.
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
import { BrickRegistry } from '../registry'

export interface ConfettiProps {
  /** Mode de palette ('multi' pour multicolore festif, ou couleur hex spécifique). */
  colorMode?: string
  /** Multiplicateur de densité/nombre de confettis (0.2 à 2.5, défaut: 1.0 -> 280 confettis). */
  density?: number
  /** Vitesse de descente moyenne (0.1 à 2.0, défaut: 0.6). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Saturation et éclat festif (0.2 à 2.0, défaut: 1.2). */
  intensity?: number
  /** Désynchronisation et asymétrie des trajectoires (0.0 à 1.0, défaut: 0.5). */
  randomness?: number
  /** Vitesse de vrille 3D sur les axes X et Y (0.5 à 3.0, défaut: 1.8). */
  spinSpeed?: number
  /** Portance aérodynamique oscillante (0.2 à 2.0, défaut: 1.0). */
  flutterStrength?: number
  /** Intensité de l'éclat métallique lors du retournement 3D (0.0 à 1.5, défaut: 0.85). */
  metallic?: number
  /** Résistance aérodynamique de l'air freinant la chute (0.0 à 1.5, défaut: 0.8). */
  airResistance?: number
}

const FESTIVE_PALETTE = [
  '#ff1744', // Rouge éclatant vif
  '#00e5ff', // Cyan électrique
  '#ffea00', // Jaune soleil radieux
  '#00e676', // Vert émeraude festif
  '#d500f9', // Magenta néon
  '#ff6d00', // Orange ambre éclatant
  '#2979ff', // Bleu roi vibrant
  '#f8fafc', // Feuille argentée brillante
]

export class ConfettiInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'confetti'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private velocities: Float32Array
  private rotations: Float32Array
  private rotVelocities: Float32Array
  private flutterPhases: Float32Array
  private flutterFreqs: Float32Array
  private shapeTypes: Uint8Array // 0: rectangle étroit, 1: bandelette courte, 2: ruban ondulé
  private sizeNorms: Float32Array
  private baseScales: Float32Array
  private baseColors: Float32Array
  private seeds: Float32Array
  private instanceColors: Float32Array
  private instanceData: Float32Array // [alpha, shapeType, lightDot, glint]

  private colorMode: string
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private spinSpeed: number
  private flutterStrength: number
  private metallic: number
  private airResistance: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private tempColor = new THREE.Color()
  private lightDir = new THREE.Vector3(0.35, 0.8, 0.55).normalize()
  private viewDir = new THREE.Vector3(0, 0, 1)
  private halfVec = new THREE.Vector3().addVectors(this.lightDir, this.viewDir).normalize()
  private faceNormal = new THREE.Vector3()
  private euler = new THREE.Euler()
  private surgeMultiplier = 1.0

  constructor(id: string, props: ConfettiProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.colorMode = props.colorMode ?? 'multi'
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.6
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.2
    this.randomness = props.randomness ?? 0.5
    this.spinSpeed = props.spinSpeed ?? 1.8
    this.flutterStrength = props.flutterStrength ?? 1.0
    this.metallic = THREE.MathUtils.clamp(props.metallic ?? 0.85, 0.0, 1.5)
    this.airResistance = THREE.MathUtils.clamp(props.airResistance ?? 0.8, 0.0, 1.5)
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(320, Math.floor(280 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(280 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.velocities = new Float32Array(this.capacity * 3)
    this.rotations = new Float32Array(this.capacity * 3)
    this.rotVelocities = new Float32Array(this.capacity * 3)
    this.flutterPhases = new Float32Array(this.capacity)
    this.flutterFreqs = new Float32Array(this.capacity)
    this.shapeTypes = new Uint8Array(this.capacity)
    this.sizeNorms = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.baseColors = new Float32Array(this.capacity * 3)
    this.seeds = new Float32Array(this.capacity)
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
        uIntensity: { value: this.intensity },
        uMetallic: { value: this.metallic },
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
        uniform float uIntensity;
        uniform float uMetallic;
        uniform int uQualityLevel;

        varying vec2 vUv;
        varying vec3 vColor;
        varying vec4 vData;

        void main() {
          float alpha = vData.x;
          if (alpha <= 0.004) discard;

          float shapeType = vData.y;
          float lightDot = vData.z;
          float glint = vData.w;

          vec2 p = (vUv - 0.5) * 2.0;
          float mask = 0.0;

          if (shapeType < 0.5) {
            // 0 : Rectangle étroit et fin (1:3)
            float dx = abs(p.x) - 0.25;
            float dy = abs(p.y) - 0.78;
            mask = (1.0 - smoothstep(-0.025, 0.025, dx)) * (1.0 - smoothstep(-0.025, 0.025, dy));
          } else if (shapeType < 1.5) {
            // 1 : Bandelette fine (1:2.2)
            float dx = abs(p.x) - 0.30;
            float dy = abs(p.y) - 0.62;
            mask = (1.0 - smoothstep(-0.025, 0.025, dx)) * (1.0 - smoothstep(-0.025, 0.025, dy));
          } else {
            // 2 : Ruban festif sinueux et fin
            float waveCenter = 0.16 * sin(p.y * 4.4);
            float dx = abs(p.x - waveCenter) - 0.19;
            float dy = abs(p.y) - 0.92;
            mask = (1.0 - smoothstep(-0.025, 0.025, dx)) * (1.0 - smoothstep(-0.025, 0.025, dy));
          }

          if (mask <= 0.01) discard;

          // Brillance modulée par l'angle de retournement 3D
          float angleShade = mix(0.46, 1.20, lightDot);
          vec3 baseCol = vColor * angleShade * clamp(0.65 + 0.35 * uIntensity, 0.3, 1.8);

          // Éclat métallique dynamique (flash spéculaire blanc-argent au passage face lumière)
          float foilSweep = 1.0;
          if (uQualityLevel >= 2) {
            foilSweep = 0.8 + 0.35 * sin((p.x + p.y) * 3.5);
          }
          vec3 specFlash = mix(vColor, vec3(1.0), 0.78) * glint * uMetallic * 1.25 * foilSweep;

          // Léger liseré brillant sur les arêtes du papier métallisé (HIGH)
          if (uQualityLevel >= 2) {
            float edgeShine = smoothstep(0.55, 0.9, abs(p.y)) * lightDot * 0.18 * uMetallic;
            specFlash += vec3(1.0) * edgeShine;
          }

          vec3 col = baseCol + specFlash;
          gl_FragColor = vec4(col, clamp(mask * alpha, 0.0, 1.0));
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
      this.seeds[i] = Math.random() * 500
      const r = Math.random()
      this.shapeTypes[i] = r < 0.48 ? 0 : r < 0.8 ? 1 : 2
      this.resetParticle(i, true)
    }

    this.assignPalette()
    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private assignPalette(): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.colorMode === 'multi') {
        this.tempColor.set(FESTIVE_PALETTE[i % FESTIVE_PALETTE.length])
      } else {
        this.tempColor.set(this.colorMode)
      }
      const cIdx = i * 3
      this.baseColors[cIdx] = this.tempColor.r
      this.baseColors[cIdx + 1] = this.tempColor.g
      this.baseColors[cIdx + 2] = this.tempColor.b
    }
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    this.positions[idx3] = (Math.random() - 0.5) * 19.0
    this.positions[idx3 + 1] = randomY ? (Math.random() - 0.5) * 13.5 : 7.2 + Math.random() * 2.2
    this.positions[idx3 + 2] = -12 * this.depthFactor + Math.random() * (4.8 * this.depthFactor)

    this.velocities[idx3] = (Math.random() - 0.5) * 0.28
    this.velocities[idx3 + 1] = -(0.45 + Math.random() * 0.4) * this.speed
    this.velocities[idx3 + 2] = 0

    this.rotations[idx3] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 1] = Math.random() * Math.PI * 2
    this.rotations[idx3 + 2] = Math.random() * Math.PI * 2

    this.rotVelocities[idx3] =
      (1.4 + Math.random() * 2.2) * this.spinSpeed * (Math.random() < 0.5 ? 1 : -1)
    this.rotVelocities[idx3 + 1] =
      (1.2 + Math.random() * 2.0) * this.spinSpeed * (Math.random() < 0.5 ? 1 : -1)
    this.rotVelocities[idx3 + 2] = (Math.random() - 0.5) * 1.6 * (0.4 + this.randomness)

    this.flutterPhases[i] = Math.random() * Math.PI * 2
    this.flutterFreqs[i] = 2.4 + Math.random() * 2.0

    // Confettis fins et réalistes (bien plus petits que les anciens rectangles géants)
    const tierRand = Math.random()
    let size = 0
    let sNorm = 0
    if (tierRand < 0.45) {
      sNorm = 0.25
      size = 0.12 + Math.random() * 0.06
    } else if (tierRand < 0.8) {
      sNorm = 0.55
      size = 0.19 + Math.random() * 0.08
    } else {
      sNorm = 0.9
      size = 0.28 + Math.random() * 0.09
    }
    this.sizeNorms[i] = sNorm
    this.baseScales[i] = size
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.5)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0
    const isLow = this.currentQuality === 'LOW'

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const sNorm = this.sizeNorms[i]

      // Rotation 3D rapide (spin & tumble)
      const spinMult = this.surgeMultiplier
      this.rotations[idx3] += this.rotVelocities[idx3] * delta * spinMult
      this.rotations[idx3 + 1] += this.rotVelocities[idx3 + 1] * delta * spinMult
      this.rotations[idx3 + 2] += this.rotVelocities[idx3 + 2] * delta

      let lightDot = 0.5
      let glint = 0.0
      let flatness = 0.5

      if (isLow) {
        const cX = Math.cos(this.rotations[idx3])
        const cY = Math.cos(this.rotations[idx3 + 1])
        lightDot = Math.abs(cX * cY)
        glint = Math.pow(lightDot, 6.0) * 0.75
        flatness = Math.abs(Math.sin(this.rotations[idx3]))
      } else {
        this.euler.set(this.rotations[idx3], this.rotations[idx3 + 1], this.rotations[idx3 + 2])
        this.faceNormal.set(0, 0, 1).applyEuler(this.euler)
        lightDot = Math.abs(this.faceNormal.dot(this.lightDir))
        const specAlign = Math.abs(this.faceNormal.dot(this.halfVec))
        glint = Math.pow(specAlign, 12.0)
        flatness = Math.abs(this.faceNormal.y)
      }

      // Portance aérodynamique et résistance de l'air :
      // quand le confetti présente sa face à plat (flatness élevé), sa chute ralentit et il plane latéralement
      const dragFactor = Math.max(0.28, 1.0 - 0.52 * this.airResistance * flatness)
      const flutterOsc =
        Math.sin(time * this.flutterFreqs[i] + this.flutterPhases[i]) * 0.55 * this.flutterStrength
      const tiltGlide = isLow ? 0 : this.faceNormal.x * 0.65 * this.flutterStrength

      // Répulsion de la souris
      const dx = this.positions[idx3] - mouseWorldX
      const dy = this.positions[idx3 + 1] - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0
      if (distSq < 5.8 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.4) * 1.3
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      const targetVx = flutterOsc + tiltGlide + repulseX * 1.4
      const targetVy = -(0.42 + 0.34 * sNorm) * this.speed * dragFactor + repulseY

      const airDamping = Math.min(1.0, delta * (2.0 + 2.5 * this.airResistance))
      this.velocities[idx3] += (targetVx - this.velocities[idx3]) * airDamping
      this.velocities[idx3 + 1] += (targetVy - this.velocities[idx3 + 1]) * airDamping

      this.positions[idx3] += this.velocities[idx3] * delta * 1.75 * this.surgeMultiplier
      this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta * 1.75 * this.surgeMultiplier

      if (this.positions[idx3 + 1] < -7.5) {
        this.resetParticle(i, false)
        continue
      }

      if (this.positions[idx3] > 11.5) this.positions[idx3] = -11.5
      if (this.positions[idx3] < -11.5) this.positions[idx3] = 11.5

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.52, 1.32)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -12 * this.depthFactor, 2, 0.62, 1.0)
      const topFade = 1.0 - THREE.MathUtils.smoothstep(this.positions[idx3 + 1], 6.0, 7.6)
      const bottomFade = THREE.MathUtils.smoothstep(this.positions[idx3 + 1], -7.5, -5.8)

      this.instanceColors[idx3] = this.baseColors[idx3] * depthOpacity
      this.instanceColors[idx3 + 1] = this.baseColors[idx3 + 1] * depthOpacity
      this.instanceColors[idx3 + 2] = this.baseColors[idx3 + 2] * depthOpacity

      this.instanceData[idx4] = Math.min(1.0, topFade * bottomFade * (0.86 + 0.14 * depthOpacity))
      this.instanceData[idx4 + 1] = isLow ? 0 : this.shapeTypes[i]
      this.instanceData[idx4 + 2] = lightDot
      this.instanceData[idx4 + 3] = glint

      const scale = this.baseScales[i] * depthFactor
      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      this.dummy.rotation.set(
        this.rotations[idx3],
        this.rotations[idx3 + 1],
        this.rotations[idx3 + 2]
      )
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
  }

  public updateProps(newProps: Partial<ConfettiProps>): void {
    if (newProps.colorMode !== undefined) {
      this.colorMode = newProps.colorMode
      this.assignPalette()
    }
    if (newProps.speed !== undefined) this.speed = newProps.speed
    if (newProps.depth !== undefined) this.depthFactor = newProps.depth
    if (newProps.intensity !== undefined) {
      this.intensity = newProps.intensity
      if (this.material) this.material.uniforms.uIntensity.value = this.intensity
    }
    if (newProps.metallic !== undefined) {
      this.metallic = THREE.MathUtils.clamp(newProps.metallic, 0.0, 1.5)
      if (this.material) this.material.uniforms.uMetallic.value = this.metallic
    }
    if (newProps.airResistance !== undefined) {
      this.airResistance = THREE.MathUtils.clamp(newProps.airResistance, 0.0, 1.5)
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.spinSpeed !== undefined) this.spinSpeed = newProps.spinSpeed
    if (newProps.flutterStrength !== undefined) this.flutterStrength = newProps.flutterStrength

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(280 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(160 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(80 * this.density * mobileRatio))
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
    this.surgeMultiplier = 2.4
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.9
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

export const ConfettiDefinition: IBrickDefinition<ConfettiProps> = {
  type: 'confetti',
  category: 'particles',
  create: (id, props, context) => new ConfettiInstance(id, props, context),
}

BrickRegistry.register(ConfettiDefinition)
