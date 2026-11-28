/**
 * src/theme-engine/bricks/particles/BubblesBrick.ts
 *
 * Brique de Particules : Bulles Aquatiques & Neige Marine (Couche 3 : Particles).
 * Bulles translucides sous-marines à paroi fine Fresnel, irisation subtile et
 * reflet spéculaire brillant orienté vers la source lumineuse.
 * Vitesse proportionnelle à la taille (poussée d'Archimède), balancement latéral
 * hydrodynamique sans rotation du reflet, dilatation hydrostatique en montée,
 * et paramètre optionnel `buoyancy` (-1 à 1, défaut 1 = montée ; < 0 = neige marine
 * ou particules abyssales descendant lentement).
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
import { simplex2D } from '../../utils/noise'
import { BrickRegistry } from '../registry'

export interface BubblesProps {
  /** Teinte du corps et du liseré irisé de la bulle (défaut: '#38bdf8'). */
  bubbleColor?: string
  /** Multiplicateur de densité/nombre de bulles (0.2 à 2.5, défaut: 1.0 -> 95 bulles). */
  density?: number
  /** Vitesse verticale de référence (0.1 à 2.0, défaut: 0.5). */
  speed?: number
  /** Étalement en profondeur Z et parallaxe (0.1 à 1.0, défaut: 0.5). */
  depth?: number
  /** Netteté et brillance du reflet spéculaire (0.2 à 2.0, défaut: 1.0). */
  intensity?: number
  /** Variabilité des rayons et asymétrie (0.0 à 1.0, défaut: 0.4). */
  randomness?: number
  /** Amplitude du balancement latéral hydrodynamique (0.1 à 1.5, défaut: 0.4). */
  wobbleAmount?: number
  /** Taux de dilatation pendant l'ascension (0.5 à 2.0, défaut: 1.25). */
  expansionRate?: number
  /** Flottabilité verticale (-1.0 à 1.0, défaut: 1.0 = montée ; < 0 = descente lente type neige marine). */
  buoyancy?: number
}

export class BubblesInstance implements IBrickInstance {
  readonly id: string
  readonly type = 'bubbles'

  private mesh: THREE.InstancedMesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private scene: THREE.Scene
  private capacity: number
  private activeCount: number

  private positions: Float32Array
  private anchorX: Float32Array
  private velocities: Float32Array
  private wobbleFrequencies: Float32Array
  private wobblePhases: Float32Array
  private sizeNorms: Float32Array
  private baseScales: Float32Array
  private seeds: Float32Array
  private instanceData: Float32Array // [alpha, sizeNorm, wobbleTilt, seed]

  private bubbleColor: THREE.Color
  private density: number
  private speed: number
  private depthFactor: number
  private intensity: number
  private randomness: number
  private wobbleAmount: number
  private expansionRate: number
  private buoyancy: number
  private currentQuality: QualityTier

  private dummy = new THREE.Object3D()
  private surgeMultiplier = 1.0

  constructor(id: string, props: BubblesProps = {}, context: BrickContext) {
    this.id = id
    this.scene = context.scene

    this.bubbleColor = new THREE.Color(props.bubbleColor ?? '#38bdf8')
    this.density = props.density ?? 1.0
    this.speed = props.speed ?? 0.5
    this.depthFactor = props.depth ?? 0.5
    this.intensity = props.intensity ?? 1.0
    this.randomness = props.randomness ?? 0.4
    this.wobbleAmount = props.wobbleAmount ?? 0.4
    this.expansionRate = props.expansionRate ?? 1.25
    this.buoyancy = THREE.MathUtils.clamp(props.buoyancy ?? 1.0, -1.0, 1.0)
    this.currentQuality = context.quality ?? 'HIGH'

    this.capacity = Math.max(120, Math.floor(95 * Math.max(this.density, 2.5)))
    this.activeCount = Math.min(this.capacity, Math.floor(95 * this.density))

    this.positions = new Float32Array(this.capacity * 3)
    this.anchorX = new Float32Array(this.capacity)
    this.velocities = new Float32Array(this.capacity * 3)
    this.wobbleFrequencies = new Float32Array(this.capacity)
    this.wobblePhases = new Float32Array(this.capacity)
    this.sizeNorms = new Float32Array(this.capacity)
    this.baseScales = new Float32Array(this.capacity)
    this.seeds = new Float32Array(this.capacity)
    this.instanceData = new Float32Array(this.capacity * 4)

    const geometry = new THREE.PlaneGeometry(1, 1)
    const dataAttr = new THREE.InstancedBufferAttribute(this.instanceData, 4)
    dataAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aData', dataAttr)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uBubbleColor: { value: this.bubbleColor },
        uIntensity: { value: this.intensity },
        uBuoyancy: { value: this.buoyancy },
        uTime: context.sharedUniforms.uTime,
        uQualityLevel: {
          value: this.currentQuality === 'HIGH' ? 2 : this.currentQuality === 'MEDIUM' ? 1 : 0,
        },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aData;
        varying vec2 vUv;
        varying vec4 vData;

        void main() {
          vUv = uv;
          vData = aData;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uBubbleColor;
        uniform float uIntensity;
        uniform float uBuoyancy;
        uniform float uTime;
        uniform int uQualityLevel;

        varying vec2 vUv;
        varying vec4 vData;

        void main() {
          float alpha = vData.x;
          if (alpha <= 0.004) discard;

          float sizeNorm = vData.y;
          float wobbleTilt = vData.z;
          float seed = vData.w;

          vec2 p = (vUv - 0.5) * 2.0;

          // Légère déformation hydrodynamique aplatie sur les grosses bulles en montée (HIGH)
          if (uQualityLevel >= 2 && uBuoyancy >= 0.0) {
            float oblate = 1.0 + 0.085 * sizeNorm * clamp(uBuoyancy, 0.0, 1.0);
            p.y *= oblate;
            p.x += p.y * wobbleTilt * 0.06;
          }

          float r = length(p);
          if (r > 1.0) discard;

          float marineSnowFactor = smoothstep(0.0, -0.35, uBuoyancy);

          // Paroi fine et nette par loi de Fresnel (centre quasi transparent)
          float outerFade = 1.0 - smoothstep(0.90, 1.0, r);
          float fresnel = pow(clamp(r, 0.0, 1.0), 3.6) * outerFade;
          float innerGlow = smoothstep(0.42, 0.92, r) * outerFade * 0.22;

          // En mode neige marine (buoyancy < 0), corps légèrement plus laiteux mais toujours nacré
          float bodyFill = mix(0.035, 0.26, marineSnowFactor) * (1.0 - smoothstep(0.2, 0.96, r));

          vec3 rimColor = mix(uBubbleColor, vec3(0.92, 0.98, 1.0), 0.55);

          // Irisation chromatique discrète sur la paroi (HIGH)
          if (uQualityLevel >= 2) {
            float angle = atan(p.y, p.x);
            float ripple = 1.0 + 0.018 * sin(angle * 2.0 + uTime * 3.5 + seed) * sizeNorm;
            float rIri = r * ripple;
            vec3 iridescent = 0.5 + 0.5 * cos(angle * 2.0 + rIri * 5.2 + seed + vec3(0.0, 2.09, 4.18));
            rimColor = mix(rimColor, iridescent, 0.24 * (1.0 - marineSnowFactor));
          }

          // Reflet spéculaire brillant principal (haut-gauche) orienté sur la source de lumière
          vec2 specCenter = vec2(-0.38, 0.44);
          vec2 dSpec = p - specCenter;
          // Reflet elliptique suivant la courbure sphérique
          vec2 tangent = normalize(vec2(-specCenter.y, specCenter.x));
          vec2 normalDir = normalize(specCenter);
          float along = dot(dSpec, tangent);
          float across = dot(dSpec, normalDir);
          float specArc = exp(-(along * along * 11.0 + across * across * 64.0));
          float specPinpoint = exp(-dot(p - vec2(-0.34, 0.42), p - vec2(-0.34, 0.42)) * 90.0);

          // Reflet secondaire opposé (bas-droite, lumière réfractée) sur HIGH & MEDIUM
          float specBounce = 0.0;
          if (uQualityLevel >= 1) {
            vec2 bouncePos = p - vec2(0.40, -0.44);
            specBounce = exp(-dot(bouncePos, bouncePos) * 32.0) * 0.36;
          }

          float specStrength = clamp(0.65 + 0.55 * uIntensity, 0.2, 2.2);
          float totalSpec = (specArc * 0.72 + specPinpoint * 0.95 + specBounce) * specStrength * outerFade;

          vec3 col = rimColor * (fresnel * 1.15 + innerGlow + bodyFill) + vec3(1.0) * totalSpec;
          float outAlpha = clamp((fresnel * 0.85 + innerGlow + bodyFill + totalSpec * 0.95) * alpha, 0.0, 1.0);

          if (outAlpha <= 0.004) discard;
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

    for (let i = 0; i < this.capacity; i++) {
      this.seeds[i] = Math.random() * 500
      this.resetParticle(i, true)
    }

    this.applyQuality(this.currentQuality)
    this.scene.add(this.mesh)
  }

  private resetParticle(i: number, randomY = false): void {
    const idx3 = i * 3
    const startX = (Math.random() - 0.5) * 17.5
    const rising = this.buoyancy >= 0

    this.anchorX[i] = startX
    this.positions[idx3] = startX
    if (randomY) {
      this.positions[idx3 + 1] = (Math.random() - 0.5) * 12.4
    } else if (rising) {
      this.positions[idx3 + 1] = -6.2 - Math.random() * 1.4
    } else {
      this.positions[idx3 + 1] = 6.2 + Math.random() * 1.4
    }
    this.positions[idx3 + 2] = -10 * this.depthFactor + Math.random() * (4.5 * this.depthFactor)

    // Distribution naturelle : beaucoup de micro-bulles, moins de grandes bulles
    const sizeNorm = Math.pow(Math.random(), 1.85)
    this.sizeNorms[i] = sizeNorm
    const minScale = 0.11
    const maxScale = 0.36 + this.randomness * 0.14
    const size = THREE.MathUtils.lerp(minScale, maxScale, sizeNorm)
    this.baseScales[i] = size

    // Vitesse proportionnelle à la taille (poussée d'Archimède vs traînée)
    const absBuoy = Math.abs(this.buoyancy)
    const buoyancyScale = 0.12 + 0.88 * absBuoy
    const sizeSpeedFactor = rising ? 0.42 + sizeNorm * 1.15 : 0.48 + sizeNorm * 0.62
    const speedJitter = 0.85 + Math.random() * 0.3

    this.velocities[idx3] = (Math.random() - 0.5) * 0.08 * this.randomness
    this.velocities[idx3 + 1] = rising
      ? 0.62 * this.speed * buoyancyScale * sizeSpeedFactor * speedJitter
      : -0.32 * this.speed * buoyancyScale * sizeSpeedFactor * speedJitter
    this.velocities[idx3 + 2] = 0

    this.wobbleFrequencies[i] = (1.1 + Math.random() * 1.3) * (0.85 + this.randomness * 0.45)
    this.wobblePhases[i] = Math.random() * Math.PI * 2
  }

  public init(): void {}

  public update(delta: number, time: number, interaction: InteractionState): void {
    if (!this.mesh) return

    if (this.surgeMultiplier > 1.0) {
      this.surgeMultiplier = Math.max(1.0, this.surgeMultiplier - delta * 1.5)
    }

    const mouseWorldX = interaction.mouseX * 6.0
    const mouseWorldY = -interaction.mouseY * 4.0
    const rising = this.buoyancy >= 0
    const isLow = this.currentQuality === 'LOW'
    const isHigh = this.currentQuality === 'HIGH'

    for (let i = 0; i < this.activeCount; i++) {
      const idx3 = i * 3
      const idx4 = i * 4
      const sizeNorm = this.sizeNorms[i]

      const py = this.positions[idx3 + 1]
      const wobbleNoise = isLow ? 0 : simplex2D(py * 0.35 + this.wobblePhases[i], time * 0.35)

      // Les grosses bulles oscillent davantage en montant ; les micro-bulles montent plus droit
      const swayScale = (0.28 + 0.72 * sizeNorm) * this.wobbleAmount
      const phaseAngle = time * this.wobbleFrequencies[i] + this.wobblePhases[i] + wobbleNoise * 1.3
      const lateralOffset = Math.sin(phaseAngle) * swayScale * 0.65
      const wobbleTilt = Math.cos(phaseAngle) * swayScale

      // Dérive lente de l'ancre et répulsion interactive à la souris
      const dx = this.positions[idx3] - mouseWorldX
      const dy = py - mouseWorldY
      const distSq = dx * dx + dy * dy
      let repulseX = 0
      let repulseY = 0

      if (distSq < 5.5 && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const force = (1.0 - dist / 2.35) * 1.15
        repulseX = (dx / dist) * force
        repulseY = (dy / dist) * force
      }

      const driftNoise = isHigh ? wobbleNoise * 0.14 * this.randomness : 0
      this.anchorX[i] +=
        (this.velocities[idx3] + driftNoise + repulseX) * delta * 1.8 * this.surgeMultiplier
      this.positions[idx3] = this.anchorX[i] + lateralOffset
      this.positions[idx3 + 1] +=
        (this.velocities[idx3 + 1] + repulseY) * delta * 1.8 * this.surgeMultiplier

      // Recyclage aux bornes selon le sens de flottabilité
      if (rising && this.positions[idx3 + 1] > 6.2) {
        this.resetParticle(i, false)
        continue
      }
      if (!rising && this.positions[idx3 + 1] < -6.2) {
        this.resetParticle(i, false)
        continue
      }

      if (this.anchorX[i] > 10.5) this.anchorX[i] = -10.5
      if (this.anchorX[i] < -10.5) this.anchorX[i] = 10.5

      // Dilatation hydrostatique uniquement en montée ; fondu doux aux bords haut/bas
      const heightNorm = THREE.MathUtils.clamp((this.positions[idx3 + 1] + 6.2) / 12.4, 0, 1)
      const expansion = rising ? 1.0 + heightNorm * (this.expansionRate - 1.0) : 1.0

      const edgeFadeBottom = THREE.MathUtils.smoothstep(this.positions[idx3 + 1], -6.2, -4.8)
      const edgeFadeTop = 1.0 - THREE.MathUtils.smoothstep(this.positions[idx3 + 1], 4.8, 6.2)
      const boundaryAlpha = edgeFadeBottom * edgeFadeTop

      const pz = this.positions[idx3 + 2]
      const depthFactor = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.58, 1.28)
      const depthOpacity = THREE.MathUtils.mapLinear(pz, -10 * this.depthFactor, 2, 0.55, 1.0)

      const scale =
        this.baseScales[i] * expansion * depthFactor * (1.0 + (this.surgeMultiplier - 1.0) * 0.18)

      this.instanceData[idx4] = Math.min(
        1.0,
        boundaryAlpha * depthOpacity * (0.72 + 0.28 * Math.min(this.intensity, 1.5))
      )
      this.instanceData[idx4 + 1] = sizeNorm
      this.instanceData[idx4 + 2] = wobbleTilt
      this.instanceData[idx4 + 3] = this.seeds[i]

      this.dummy.position.set(
        this.positions[idx3],
        this.positions[idx3 + 1],
        this.positions[idx3 + 2]
      )
      // Aucune rotation du quad : le reflet spéculaire reste aligné sur la source de lumière
      this.dummy.rotation.set(0, 0, 0)
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
    const dataAttr = this.mesh.geometry.getAttribute('aData') as THREE.InstancedBufferAttribute
    if (dataAttr) dataAttr.needsUpdate = true
  }

  public updateProps(newProps: Partial<BubblesProps>): void {
    if (newProps.bubbleColor !== undefined) {
      this.bubbleColor.set(newProps.bubbleColor)
      if (this.material) {
        this.material.uniforms.uBubbleColor.value.copy(this.bubbleColor)
      }
    }
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
      if (this.material) {
        this.material.uniforms.uIntensity.value = this.intensity
      }
    }
    if (newProps.randomness !== undefined) this.randomness = newProps.randomness
    if (newProps.wobbleAmount !== undefined) this.wobbleAmount = newProps.wobbleAmount
    if (newProps.expansionRate !== undefined) this.expansionRate = newProps.expansionRate

    if (newProps.buoyancy !== undefined) {
      const nextBuoyancy = THREE.MathUtils.clamp(newProps.buoyancy, -1.0, 1.0)
      const nextRising = nextBuoyancy >= 0
      this.buoyancy = nextBuoyancy
      if (this.material) {
        this.material.uniforms.uBuoyancy.value = this.buoyancy
      }
      const absBuoy = Math.abs(this.buoyancy)
      const buoyancyScale = 0.12 + 0.88 * absBuoy
      for (let i = 0; i < this.capacity; i++) {
        const sizeNorm = this.sizeNorms[i]
        const sizeSpeedFactor = nextRising ? 0.42 + sizeNorm * 1.15 : 0.48 + sizeNorm * 0.62
        this.velocities[i * 3 + 1] =
          (nextRising ? 0.62 : -0.32) * this.speed * buoyancyScale * sizeSpeedFactor
      }
    }

    if (newProps.density !== undefined) {
      this.density = newProps.density
      this.applyQuality(this.currentQuality)
    }
  }

  private applyQuality(quality: QualityTier): void {
    const isMobile = window.innerWidth < 768
    const mobileRatio = isMobile ? 0.35 : 1.0

    if (quality === 'HIGH') {
      this.activeCount = Math.min(this.capacity, Math.floor(95 * this.density * mobileRatio))
    } else if (quality === 'MEDIUM') {
      this.activeCount = Math.min(this.capacity, Math.floor(52 * this.density * mobileRatio))
    } else {
      this.activeCount = Math.min(this.capacity, Math.floor(24 * this.density * mobileRatio))
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
    this.surgeMultiplier = 2.2
  }

  public triggerIntro(_introType: string, _progress: number): void {
    this.surgeMultiplier = 1.7
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

export const BubblesDefinition: IBrickDefinition<BubblesProps> = {
  type: 'bubbles',
  category: 'particles',
  create: (id, props, context) => new BubblesInstance(id, props, context),
}

BrickRegistry.register(BubblesDefinition)
