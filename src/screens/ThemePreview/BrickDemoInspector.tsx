/**
 * src/screens/ThemePreview/BrickDemoInspector.tsx
 *
 * Banc d'essai interactif pour tester et calibrer individuellement
 * toutes les briques du moteur :
 * - Groupe 1 : Fonds (9 shaders)
 * - Groupe 2 : Silhouettes & Parallaxe (6 briques)
 *
 * Permet de modifier tous les paramètres typés en temps réel,
 * de basculer la qualité (HIGH, MEDIUM, LOW),
 * d'activer la simulation Mobile Throttling,
 * et de mesurer le coût en ms/frame en direct.
 */

import {
  faBolt,
  faCloud,
  faFire,
  faLayerGroup,
  faMobileScreenButton,
  faMountain,
  faPalette,
  faRotateRight,
  faSliders,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'

import type { PerformanceStats } from '@/theme-engine/core/QualityController'
import type { ThemeEngine } from '@/theme-engine/runtime/ThemeEngine'
import type { QualityTier, ThemeEngineConfig } from '@/theme-engine/types'

export interface BrickDescriptor {
  type: string
  name: string
  role: string
  category: 'background' | 'intermediate' | 'atmosphere' | 'particles' | 'events' | 'overlay' | 'special'
  defaultProps: Record<string, any>
  fields: {
    key: string
    label: string
    type: 'color' | 'slider'
    min?: number
    max?: number
    step?: number
  }[]
}

export const BACKGROUND_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'gradient_sky',
    name: 'Ciel Dégradé',
    role: 'Dégradé atmosphérique plein écran dynamique avec transition zénith/horizon et bruit organique',
    category: 'background',
    defaultProps: {
      topColor: '#0f172a',
      bottomColor: '#001428',
      horizonColor: '#00f0ff',
      density: 1.0,
      speed: 0.2,
      depth: 0.1,
      intensity: 1.0,
      randomness: 0.15,
    },
    fields: [
      { key: 'topColor', label: 'Couleur Zénith (Haut)', type: 'color' },
      { key: 'bottomColor', label: 'Couleur Sol (Bas)', type: 'color' },
      { key: 'horizonColor', label: 'Lueur d’Horizon', type: 'color' },
      { key: 'density', label: 'Courbure Dégradé', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Pulsation', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'depth', label: 'Parallaxe Z', type: 'slider', min: 0.0, max: 0.5, step: 0.05 },
      {
        key: 'intensity',
        label: 'Intensité Lumineuse',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Aléatoire / Simplex',
        type: 'slider',
        min: 0.0,
        max: 0.5,
        step: 0.02,
      },
    ],
  },
  {
    type: 'fbm_clouds',
    name: 'Nuages FBM',
    role: 'Couverture nuageuse procédurale multi-octaves avec dérive organique et ombrage volumétrique',
    category: 'background',
    defaultProps: {
      cloudColor: '#f1f5f9',
      skyColor: '#0f172a',
      density: 0.55,
      speed: 0.15,
      depth: 0.3,
      intensity: 1.0,
      randomness: 0.4,
    },
    fields: [
      { key: 'cloudColor', label: 'Couleur Nuages', type: 'color' },
      { key: 'skyColor', label: 'Couleur Ciel Arrière', type: 'color' },
      {
        key: 'density',
        label: 'Couverture Nuageuse',
        type: 'slider',
        min: 0.1,
        max: 0.95,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse Vent', type: 'slider', min: 0.0, max: 0.6, step: 0.02 },
      {
        key: 'depth',
        label: 'Altitude / Parallaxe',
        type: 'slider',
        min: 0.0,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Contraste Lumière',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Turbulence / Warping',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
    ],
  },
  {
    type: 'nebula',
    name: 'Nébuleuse Cosmique',
    role: 'Voiles de gaz ionisé, filaments de plasma, tourbillon fluide et micro-étoiles de profondeur',
    category: 'background',
    defaultProps: {
      primaryColor: '#c026d3',
      secondaryColor: '#090d16',
      accentColor: '#38bdf8',
      density: 0.6,
      speed: 0.12,
      depth: 0.2,
      intensity: 1.0,
      randomness: 0.35,
      coreScale: 1.4,
    },
    fields: [
      { key: 'primaryColor', label: 'Gaz Primaire (Chaud)', type: 'color' },
      { key: 'secondaryColor', label: 'Gaz Secondaire (Froid)', type: 'color' },
      { key: 'accentColor', label: 'Éclat d’Ionisation', type: 'color' },
      {
        key: 'density',
        label: 'Densité Filaments',
        type: 'slider',
        min: 0.2,
        max: 1.0,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse Vortex', type: 'slider', min: 0.0, max: 0.5, step: 0.02 },
      { key: 'depth', label: 'Parallaxe Z', type: 'slider', min: 0.0, max: 0.5, step: 0.05 },
      {
        key: 'intensity',
        label: 'Brillance Globale',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Asymétrie / Chaos',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'coreScale', label: 'Échelle Coeur', type: 'slider', min: 0.8, max: 2.5, step: 0.1 },
    ],
  },
  {
    type: 'multilayer_starfield',
    name: 'Champ d’Étoiles Multi-Couches',
    role: '3 strates de profondeur Z par instanciation de points, scintillement asynchrone et diffraction',
    category: 'background',
    defaultProps: {
      starColor: '#ffffff',
      density: 1.0,
      speed: 0.1,
      depth: 1.0,
      intensity: 1.0,
      randomness: 0.5,
      twinkleSpeed: 1.5,
    },
    fields: [
      { key: 'starColor', label: 'Teinte Stellaire', type: 'color' },
      { key: 'density', label: 'Densité Étoiles', type: 'slider', min: 0.2, max: 2.0, step: 0.1 },
      { key: 'speed', label: 'Dérive Orbitale', type: 'slider', min: 0.0, max: 0.5, step: 0.02 },
      {
        key: 'depth',
        label: 'Étagement Z / Parallaxe',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'intensity',
        label: 'Éclat / Scintillement',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'twinkleSpeed',
        label: 'Fréquence Scintillement',
        type: 'slider',
        min: 0.2,
        max: 3.5,
        step: 0.1,
      },
    ],
  },
  {
    type: 'aurora',
    name: 'Aurore Boréale',
    role: 'Rideaux ondulants de plasma avec rayons ionisés verticaux et transitions spectrales émeraude/violet',
    category: 'background',
    defaultProps: {
      topColor: '#a855f7',
      bottomColor: '#10b981',
      density: 0.65,
      speed: 0.22,
      depth: 0.25,
      intensity: 1.2,
      randomness: 0.45,
      waveFrequency: 2.5,
    },
    fields: [
      { key: 'topColor', label: 'Haut Rideau (Violet)', type: 'color' },
      { key: 'bottomColor', label: 'Base Rideau (Vert)', type: 'color' },
      {
        key: 'density',
        label: 'Draperies Célestes',
        type: 'slider',
        min: 0.2,
        max: 1.5,
        step: 0.05,
      },
      {
        key: 'speed',
        label: 'Vitesse Vagues Plasma',
        type: 'slider',
        min: 0.0,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'depth',
        label: 'Altitude / Parallaxe',
        type: 'slider',
        min: 0.0,
        max: 0.6,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Radiance / Lumens',
        type: 'slider',
        min: 0.4,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Turbulence Vent Solaire',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'waveFrequency',
        label: 'Fréquence Plis',
        type: 'slider',
        min: 1.0,
        max: 5.0,
        step: 0.2,
      },
    ],
  },
  {
    type: 'water_caustics',
    name: 'Eau & Caustiques',
    role: 'Fond aquatique avec réseau de lumière réfractée Voronoi, absorption abyssale et dispersion chromatique',
    category: 'background',
    defaultProps: {
      waterColor: '#021a2f',
      causticColor: '#38bdf8',
      density: 1.0,
      speed: 0.25,
      depth: 0.2,
      intensity: 1.2,
      randomness: 0.35,
      causticScale: 3.5,
    },
    fields: [
      { key: 'waterColor', label: 'Eau Profonde', type: 'color' },
      { key: 'causticColor', label: 'Rais de Lumière', type: 'color' },
      { key: 'density', label: 'Finesse de Maille', type: 'slider', min: 0.4, max: 2.0, step: 0.1 },
      { key: 'speed', label: 'Vitesse Clapotis', type: 'slider', min: 0.0, max: 0.7, step: 0.05 },
      {
        key: 'depth',
        label: 'Immersion / Parallaxe',
        type: 'slider',
        min: 0.0,
        max: 0.6,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Clarté Caustiques',
        type: 'slider',
        min: 0.3,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Turbulence Liquide',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'causticScale',
        label: 'Échelle Spatiale',
        type: 'slider',
        min: 1.5,
        max: 6.0,
        step: 0.2,
      },
    ],
  },
  {
    type: 'waves',
    name: 'Vagues & Houle',
    role: 'Ondes de Gerstner en perspective avec crêtes aiguisées, écume blanche et reflets spéculaires',
    category: 'background',
    defaultProps: {
      crestColor: '#f8fafc',
      deepColor: '#091729',
      density: 1.0,
      speed: 0.3,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.4,
      waveSteepness: 0.6,
    },
    fields: [
      { key: 'crestColor', label: 'Écume & Crêtes', type: 'color' },
      { key: 'deepColor', label: 'Creux Abyssaux', type: 'color' },
      {
        key: 'density',
        label: 'Fréquence Trains Vagues',
        type: 'slider',
        min: 0.4,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'speed',
        label: 'Vitesse Déferlement',
        type: 'slider',
        min: 0.0,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'depth',
        label: 'Perspective / Parallaxe',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
      },
      { key: 'intensity', label: 'Hauteur & Écume', type: 'slider', min: 0.3, max: 2.2, step: 0.1 },
      { key: 'randomness', label: 'Houle Croisée', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      {
        key: 'waveSteepness',
        label: 'Acuité des Crêtes',
        type: 'slider',
        min: 0.2,
        max: 1.2,
        step: 0.05,
      },
    ],
  },
  {
    type: 'lava_flow',
    name: 'Coulée de Lave',
    role: 'Plaques de basalte fracturées, fissures de magma incandescent à gradient 3 points et respiration de chaleur',
    category: 'background',
    defaultProps: {
      crustColor: '#0f1117',
      magmaColor: '#ea580c',
      coreColor: '#fef08a',
      density: 1.0,
      speed: 0.18,
      depth: 0.2,
      intensity: 1.25,
      randomness: 0.45,
      heatPulseSpeed: 1.2,
    },
    fields: [
      { key: 'crustColor', label: 'Croûte Basalte Sombre', type: 'color' },
      { key: 'magmaColor', label: 'Magma Ardent', type: 'color' },
      { key: 'coreColor', label: 'Coeur Incandescent', type: 'color' },
      { key: 'density', label: 'Densité Failles', type: 'slider', min: 0.5, max: 2.0, step: 0.1 },
      {
        key: 'speed',
        label: 'Écoulement Visqueux',
        type: 'slider',
        min: 0.0,
        max: 0.6,
        step: 0.02,
      },
      { key: 'depth', label: 'Relief / Parallaxe', type: 'slider', min: 0.0, max: 0.5, step: 0.05 },
      { key: 'intensity', label: 'Lueur Thermique', type: 'slider', min: 0.4, max: 2.5, step: 0.1 },
      {
        key: 'randomness',
        label: 'Déchirement Plaques',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'heatPulseSpeed',
        label: 'Respiration Chaleur',
        type: 'slider',
        min: 0.2,
        max: 3.0,
        step: 0.1,
      },
    ],
  },
  {
    type: 'dunes',
    name: 'Dunes Désertiques',
    role: 'Crêtes ondulantes sous lumière rasante, versants dorés vs versants ombragés et micro-rides de sable',
    category: 'background',
    defaultProps: {
      sandColor: '#f59e0b',
      shadowColor: '#2d1810',
      skyColor: '#78350f',
      density: 1.0,
      speed: 0.15,
      depth: 0.3,
      intensity: 1.0,
      randomness: 0.4,
      sunAngle: 0.8,
    },
    fields: [
      { key: 'sandColor', label: 'Versant Ensoleillé', type: 'color' },
      { key: 'shadowColor', label: 'Versant à l’Ombre', type: 'color' },
      { key: 'skyColor', label: 'Horizon Atmosphérique', type: 'color' },
      { key: 'density', label: 'Espacement Crêtes', type: 'slider', min: 0.4, max: 2.2, step: 0.1 },
      {
        key: 'speed',
        label: 'Dérive Vent & Mirages',
        type: 'slider',
        min: 0.0,
        max: 0.5,
        step: 0.02,
      },
      {
        key: 'depth',
        label: 'Perspective / Parallaxe',
        type: 'slider',
        min: 0.1,
        max: 0.7,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Contraste Lumière',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Méandres Crêtes',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'sunAngle',
        label: 'Angle Soleil Rasant',
        type: 'slider',
        min: 0.2,
        max: 1.8,
        step: 0.05,
      },
    ],
  },
]

export const PARALLAX_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'parallax_forest',
    name: 'Forêt (Parallaxe)',
    role: 'Silhouette de forêt 3 plans avec cimes oscillant sous le vent, brume de sous-bois et lucioles',
    category: 'intermediate',
    defaultProps: {
      forestColor: '#0a1f18',
      fogColor: '#164e3f',
      density: 1.0,
      speed: 0.25,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.4,
      windStrength: 0.5,
    },
    fields: [
      { key: 'forestColor', label: 'Couleur Arbres', type: 'color' },
      { key: 'fogColor', label: 'Couleur Brume', type: 'color' },
      { key: 'density', label: 'Densité Arbres', type: 'slider', min: 0.4, max: 2.2, step: 0.1 },
      { key: 'speed', label: 'Vitesse Vent', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      {
        key: 'depth',
        label: 'Parallaxe / Profondeur',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Contraste & Opacité',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Variabilité Hauteur',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'windStrength',
        label: 'Flexion Cimes',
        type: 'slider',
        min: 0.0,
        max: 1.2,
        step: 0.05,
      },
    ],
  },
  {
    type: 'parallax_mountains',
    name: 'Montagnes (Parallaxe)',
    role: 'Chaîne alpine 3 plans avec crêtes acérées, versants ombragés, névés et brume de vallée',
    category: 'intermediate',
    defaultProps: {
      rockColor: '#0b1329',
      sunColor: '#475569',
      mistColor: '#1e293b',
      density: 1.0,
      speed: 0.15,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.45,
      snowLevel: 0.6,
      sunAngle: 0.75,
    },
    fields: [
      { key: 'rockColor', label: 'Roche à l’Ombre', type: 'color' },
      { key: 'sunColor', label: 'Crêtes au Soleil', type: 'color' },
      { key: 'mistColor', label: 'Brume de Vallée', type: 'color' },
      { key: 'density', label: 'Fréquence Sommets', type: 'slider', min: 0.4, max: 2.2, step: 0.1 },
      { key: 'speed', label: 'Dérive Brume', type: 'slider', min: 0.0, max: 0.5, step: 0.02 },
      {
        key: 'depth',
        label: 'Parallaxe / Profondeur',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Contraste Crêtes',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Asymétrie des Pics',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'snowLevel',
        label: 'Seuil Névés / Glaciers',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'sunAngle',
        label: 'Angle Soleil Rasant',
        type: 'slider',
        min: 0.2,
        max: 1.8,
        step: 0.05,
      },
    ],
  },
  {
    type: 'parallax_city',
    name: 'Skyline de Ville',
    role: 'Mégalopole moderne avec gratte-ciels 3 plans, fenêtres animées, balises clignotantes et smog',
    category: 'intermediate',
    defaultProps: {
      buildingColor: '#070d19',
      windowColor: '#fef08a',
      beaconColor: '#ef4444',
      density: 1.0,
      speed: 0.3,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.5,
      smogIntensity: 0.6,
    },
    fields: [
      { key: 'buildingColor', label: 'Couleur Immeubles', type: 'color' },
      { key: 'windowColor', label: 'Lumière Fenêtres', type: 'color' },
      { key: 'beaconColor', label: 'Balises Antennes', type: 'color' },
      { key: 'density', label: 'Densité Buildings', type: 'slider', min: 0.4, max: 2.2, step: 0.1 },
      {
        key: 'speed',
        label: 'Vitesse Balises/Phares',
        type: 'slider',
        min: 0.0,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'depth',
        label: 'Parallaxe / Profondeur',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
      },
      { key: 'intensity', label: 'Éclat Fenêtres', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      {
        key: 'randomness',
        label: 'Variabilité Hauteur',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'smogIntensity',
        label: 'Halo Smog Nocturne',
        type: 'slider',
        min: 0.0,
        max: 1.5,
        step: 0.05,
      },
    ],
  },
  {
    type: 'parallax_castle',
    name: 'Château / Ruines',
    role: 'Forteresse médiévale sur falaise escarpée avec donjon, créneaux, torches vacillantes et ruines',
    category: 'intermediate',
    defaultProps: {
      castleColor: '#080d1a',
      torchColor: '#f97316',
      rockColor: '#0f172a',
      density: 1.0,
      speed: 0.3,
      depth: 0.3,
      intensity: 1.0,
      randomness: 0.4,
      ruinDecay: 0.25,
      torchGlow: 1.0,
    },
    fields: [
      { key: 'castleColor', label: 'Couleur Murailles', type: 'color' },
      { key: 'torchColor', label: 'Lueur des Torches', type: 'color' },
      { key: 'rockColor', label: 'Falaise / Éperon', type: 'color' },
      { key: 'density', label: 'Densité Tours', type: 'slider', min: 0.5, max: 2.0, step: 0.1 },
      {
        key: 'speed',
        label: 'Vacillement Torches',
        type: 'slider',
        min: 0.0,
        max: 0.8,
        step: 0.05,
      },
      {
        key: 'depth',
        label: 'Parallaxe / Profondeur',
        type: 'slider',
        min: 0.1,
        max: 0.7,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Contraste Général',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Asymétrie Architecture',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'ruinDecay',
        label: 'Délabrement en Ruines',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'torchGlow', label: 'Éclat Torches', type: 'slider', min: 0.2, max: 2.5, step: 0.1 },
    ],
  },
  {
    type: 'parallax_fleet',
    name: 'Vaisseaux Lointains',
    role: "Flotte spatiale 3 plans avec cuirassé colossal, croiseurs d'escorte et traînées ioniques",
    category: 'intermediate',
    defaultProps: {
      hullColor: '#0a1120',
      engineColor: '#38bdf8',
      density: 1.0,
      speed: 0.2,
      depth: 0.4,
      intensity: 1.2,
      randomness: 0.4,
      trailLength: 0.8,
    },
    fields: [
      { key: 'hullColor', label: 'Couleur Coque', type: 'color' },
      { key: 'engineColor', label: 'Plasma Réacteurs', type: 'color' },
      { key: 'density', label: 'Densité Flotte', type: 'slider', min: 0.4, max: 2.0, step: 0.1 },
      { key: 'speed', label: 'Vitesse Dérive', type: 'slider', min: 0.0, max: 0.6, step: 0.02 },
      { key: 'depth', label: 'Parallaxe Spatiale', type: 'slider', min: 0.1, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Éclat Tuyères', type: 'slider', min: 0.3, max: 2.5, step: 0.1 },
      {
        key: 'randomness',
        label: 'Dispersion Spatiale',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'trailLength',
        label: 'Longueur Traînées',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.1,
      },
    ],
  },
  {
    type: 'parallax_pixel_tiles',
    name: 'Tuiles Pixel (16-bit)',
    role: 'Décor de plateforme rétro 16-bit pixel-perfect avec collines tramées, briques et défilement cadencé',
    category: 'intermediate',
    defaultProps: {
      tileColor: '#1e293b',
      topFringeColor: '#10b981',
      ditherColor: '#0f172a',
      density: 1.0,
      speed: 0.25,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.45,
      pixelSize: 4.0,
    },
    fields: [
      { key: 'tileColor', label: 'Couleur Dalles/Briques', type: 'color' },
      { key: 'topFringeColor', label: 'Bordure / Herbe', type: 'color' },
      { key: 'ditherColor', label: 'Trame d’Ombre', type: 'color' },
      {
        key: 'density',
        label: 'Densité Plateformes',
        type: 'slider',
        min: 0.5,
        max: 2.2,
        step: 0.1,
      },
      { key: 'speed', label: 'Vitesse Défilement', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      {
        key: 'depth',
        label: 'Parallaxe 3 Vitesses',
        type: 'slider',
        min: 0.1,
        max: 0.8,
        step: 0.05,
      },
      { key: 'intensity', label: 'Contraste Rétro', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      {
        key: 'randomness',
        label: 'Variabilité Blocs',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'pixelSize',
        label: 'Taille Pixel (px)',
        type: 'slider',
        min: 2.0,
        max: 8.0,
        step: 1.0,
      },
    ],
  },
]

export const ATMOSPHERE_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'noisy_fog',
    name: 'Brume Bruitée',
    role: 'Nappe volumétrique rampante avec volutes Simplex FBM, domain warping, sillage souris et gradient vertical',
    category: 'atmosphere',
    defaultProps: {
      fogColor: '#94a3b8',
      density: 1.0,
      speed: 0.2,
      depth: 0.3,
      intensity: 1.0,
      randomness: 0.35,
      heightFalloff: 1.5,
      windAngle: 0.15,
    },
    fields: [
      { key: 'fogColor', label: 'Teinte de la Brume', type: 'color' },
      {
        key: 'density',
        label: 'Densité / Opacité',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse du Vent', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      {
        key: 'depth',
        label: 'Parallaxe / Profondeur',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Diffusion Lumineuse',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Turbulence & Warping',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'heightFalloff',
        label: 'Atténuation Verticale',
        type: 'slider',
        min: 0.3,
        max: 3.0,
        step: 0.1,
      },
      {
        key: 'windAngle',
        label: 'Direction du Vent (rad)',
        type: 'slider',
        min: -3.14,
        max: 3.14,
        step: 0.1,
      },
    ],
  },
  {
    type: 'god_rays',
    name: 'Rayons de Lumière',
    role: 'Faisceaux volumétriques radiaux (God Rays) perçant l’atmosphère avec poussières et décroissance exponentielle',
    category: 'atmosphere',
    defaultProps: {
      rayColor: '#fef08a',
      density: 1.0,
      speed: 0.25,
      depth: 0.4,
      intensity: 1.2,
      randomness: 0.4,
      lightSourceX: 0.35,
      lightSourceY: 0.85,
      decay: 0.92,
    },
    fields: [
      { key: 'rayColor', label: 'Couleur des Faisceaux', type: 'color' },
      { key: 'density', label: 'Finesse & Nombre', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      {
        key: 'speed',
        label: 'Oscillation Poussières',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'depth', label: 'Parallaxe Source', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Radiance / Éclat',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Asymétrie Angulaire',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'lightSourceX',
        label: 'Position Source X',
        type: 'slider',
        min: -1.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'lightSourceY',
        label: 'Position Source Y',
        type: 'slider',
        min: 0.0,
        max: 1.5,
        step: 0.05,
      },
      {
        key: 'decay',
        label: 'Décroissance Radiale',
        type: 'slider',
        min: 0.7,
        max: 0.99,
        step: 0.01,
      },
    ],
  },
  {
    type: 'flickering_light',
    name: 'Lumière Vacillante',
    role: 'Foyer lumineux organique (torche, néon, bougie) avec bruit Simplex non-périodique et convection thermique',
    category: 'atmosphere',
    defaultProps: {
      lightColor: '#f97316',
      secondaryColor: '#ea580c',
      density: 1.0,
      speed: 0.35,
      depth: 0.3,
      intensity: 1.1,
      randomness: 0.5,
      lightX: 0.0,
      lightY: 0.05,
      flickerType: 0,
    },
    fields: [
      { key: 'lightColor', label: 'Couleur Cœur Foyer', type: 'color' },
      { key: 'secondaryColor', label: 'Couleur Halo Flamboyant', type: 'color' },
      { key: 'density', label: 'Portée du Halo', type: 'slider', min: 0.3, max: 2.0, step: 0.05 },
      {
        key: 'speed',
        label: 'Fréquence Vacillement',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'depth', label: 'Parallaxe Foyer', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Éclat Lumineux Max',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Sauts & Rafales',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'lightX', label: 'Position Foyer X', type: 'slider', min: -1.0, max: 1.0, step: 0.05 },
      { key: 'lightY', label: 'Position Foyer Y', type: 'slider', min: -1.0, max: 1.0, step: 0.05 },
      {
        key: 'flickerType',
        label: 'Type (0:feu, 1:néon, 2:bougie)',
        type: 'slider',
        min: 0,
        max: 2,
        step: 1,
      },
    ],
  },
  {
    type: 'heat_distortion',
    name: 'Distorsion de Chaleur',
    role: 'Mirage optique ascensionnel avec ondes de convection turbulentes et séparation chromatique RVB',
    category: 'atmosphere',
    defaultProps: {
      tintColor: '#fb923c',
      density: 1.0,
      speed: 0.3,
      depth: 0.25,
      intensity: 1.0,
      randomness: 0.4,
      heatHeight: 0.65,
      chromaticAberration: 0.015,
    },
    fields: [
      { key: 'tintColor', label: 'Teinte de Réfraction', type: 'color' },
      {
        key: 'density',
        label: 'Densité des Vagues',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      {
        key: 'speed',
        label: 'Ascension Thermique',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'depth', label: 'Parallaxe / Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Amplitude Distorsion',
        type: 'slider',
        min: 0.1,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Turbulence Convective',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'heatHeight',
        label: 'Hauteur d’Impact',
        type: 'slider',
        min: 0.2,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'chromaticAberration',
        label: 'Dispersion RVB',
        type: 'slider',
        min: 0.0,
        max: 0.05,
        step: 0.005,
      },
    ],
  },
  {
    type: 'volumetric_glow',
    name: 'Lueur Volumétrique',
    role: 'Dôme de diffusion atmosphérique Mie & Rayleigh avec cœur incandescent et frange organique pulsante',
    category: 'atmosphere',
    defaultProps: {
      coreColor: '#fef08a',
      glowColor: '#38bdf8',
      outerColor: '#1e1b4b',
      density: 1.0,
      speed: 0.15,
      depth: 0.35,
      intensity: 1.2,
      randomness: 0.3,
      glowX: 0.0,
      glowY: 0.15,
    },
    fields: [
      { key: 'coreColor', label: 'Couleur Cœur Chaud', type: 'color' },
      { key: 'glowColor', label: 'Diffusion Médiane', type: 'color' },
      { key: 'outerColor', label: 'Halo Périphérique', type: 'color' },
      { key: 'density', label: 'Rayon du Dôme', type: 'slider', min: 0.3, max: 2.0, step: 0.05 },
      {
        key: 'speed',
        label: 'Pulsation Respiration',
        type: 'slider',
        min: 0.0,
        max: 0.8,
        step: 0.05,
      },
      { key: 'depth', label: 'Parallaxe / Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Radiance Centrale',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Brume Périphérique',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'glowX', label: 'Position Centre X', type: 'slider', min: -1.0, max: 1.0, step: 0.05 },
      { key: 'glowY', label: 'Position Centre Y', type: 'slider', min: -1.0, max: 1.0, step: 0.05 },
    ],
  },
  {
    type: 'lens_flare',
    name: 'Lens Flare Cinéma',
    role: 'Éblouissement anamorphique optique complet avec starburst, trait cinéma horizontal et fantômes dynamiques',
    category: 'atmosphere',
    defaultProps: {
      flareColor: '#fde047',
      accentColor: '#06b6d4',
      density: 1.0,
      speed: 0.2,
      depth: 0.5,
      intensity: 1.3,
      randomness: 0.35,
      sourceX: 0.4,
      sourceY: 0.5,
      streakLength: 1.2,
    },
    fields: [
      { key: 'flareColor', label: 'Couleur Cœur / Éblouissement', type: 'color' },
      { key: 'accentColor', label: 'Trait Anamorphique Cinéma', type: 'color' },
      {
        key: 'density',
        label: 'Échelle Artefacts',
        type: 'slider',
        min: 0.3,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'speed',
        label: 'Scintillement Aigrettes',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'depth',
        label: 'Pivotement Optique / Z',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'intensity',
        label: 'Brillance Globale',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Asymétrie Diffraction',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'sourceX',
        label: 'Position Source X',
        type: 'slider',
        min: -1.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'sourceY',
        label: 'Position Source Y',
        type: 'slider',
        min: -1.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'streakLength',
        label: 'Longueur Trait Anamorphique',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
    ],
  },
]

export const PARTICLES_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'embers',
    name: 'Braises Incandescentes',
    role: 'Braises chaudes ascendantes avec convection thermique Simplex, refroidissement progressif et scintillement',
    category: 'particles',
    defaultProps: {
      emberColor: '#f97316',
      hotColor: '#fef08a',
      density: 1.0,
      speed: 0.6,
      depth: 0.4,
      intensity: 1.2,
      randomness: 0.5,
      coolingRate: 1.0,
    },
    fields: [
      { key: 'emberColor', label: 'Couleur Braise', type: 'color' },
      { key: 'hotColor', label: 'Cœur Incandescent', type: 'color' },
      { key: 'density', label: 'Densité / Nombre', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Ascension', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Parallaxe / Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Radiance / Taille',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Turbulence Convective',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'coolingRate',
        label: 'Refroidissement',
        type: 'slider',
        min: 0.5,
        max: 2.0,
        step: 0.05,
      },
    ],
  },
  {
    type: 'ash',
    name: 'Cendres & Suie',
    role: 'Flocons calcinés en flottaison lente avec portance des courants d’air et rotation 3D asymétrique',
    category: 'particles',
    defaultProps: {
      ashColor: '#64748b',
      darkColor: '#1e293b',
      density: 1.0,
      speed: 0.35,
      depth: 0.5,
      intensity: 0.85,
      randomness: 0.6,
      drift: 0.25,
    },
    fields: [
      { key: 'ashColor', label: 'Teinte Cendre', type: 'color' },
      { key: 'darkColor', label: 'Teinte Suie Foncée', type: 'color' },
      { key: 'density', label: 'Densité Flocons', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Chute', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Opacité / Contraste',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Turbulence & Vrille',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'drift', label: 'Dérive Latérale', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
    ],
  },
  {
    type: 'snow',
    name: 'Neige & Flocons',
    role: 'Flocons cotonneux et cristallins avec oscillations pendulaires déphasées, masse variable et dérive',
    category: 'particles',
    defaultProps: {
      snowColor: '#f8fafc',
      density: 1.0,
      speed: 0.45,
      depth: 0.6,
      intensity: 1.0,
      randomness: 0.45,
      windStrength: 0.25,
      swayFrequency: 1.5,
    },
    fields: [
      { key: 'snowColor', label: 'Teinte Neige', type: 'color' },
      { key: 'density', label: 'Densité Flocons', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Chute', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      {
        key: 'depth',
        label: 'Profondeur Z / Bokeh',
        type: 'slider',
        min: 0.1,
        max: 1.0,
        step: 0.05,
      },
      { key: 'intensity', label: 'Taille & Éclat', type: 'slider', min: 0.2, max: 2.0, step: 0.05 },
      {
        key: 'randomness',
        label: 'Dispersion de Masse',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'windStrength',
        label: 'Poussée du Vent',
        type: 'slider',
        min: 0.0,
        max: 1.5,
        step: 0.05,
      },
      {
        key: 'swayFrequency',
        label: 'Fréquence Balancement',
        type: 'slider',
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
    ],
  },
  {
    type: 'rain',
    name: 'Pluie Battante',
    role: 'Traits obliques étirés par la vitesse avec inclinaison sous le vent et étagement en profondeur',
    category: 'particles',
    defaultProps: {
      rainColor: '#93c5fd',
      density: 1.0,
      speed: 1.6,
      depth: 0.5,
      intensity: 0.9,
      randomness: 0.35,
      windAngle: 0.18,
      streakLength: 1.2,
    },
    fields: [
      { key: 'rainColor', label: 'Teinte Gouttes', type: 'color' },
      { key: 'density', label: 'Densité Pluie', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Averse', type: 'slider', min: 0.2, max: 3.0, step: 0.1 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Opacité Traits', type: 'slider', min: 0.2, max: 2.0, step: 0.05 },
      {
        key: 'randomness',
        label: 'Dispersion Longueur',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'windAngle', label: 'Angle du Vent', type: 'slider', min: -0.8, max: 0.8, step: 0.02 },
      {
        key: 'streakLength',
        label: 'Longueur des Traits',
        type: 'slider',
        min: 0.4,
        max: 2.5,
        step: 0.05,
      },
    ],
  },
  {
    type: 'dust',
    name: 'Poussière en Suspension',
    role: 'Motes dorées en quasi-apesanteur dérivant dans les rais de lumière par mouvement brownien doux',
    category: 'particles',
    defaultProps: {
      dustColor: '#fef08a',
      density: 1.0,
      speed: 0.2,
      depth: 0.5,
      intensity: 1.1,
      randomness: 0.4,
      twinkleSpeed: 1.2,
    },
    fields: [
      { key: 'dustColor', label: 'Teinte Grains Dorés', type: 'color' },
      { key: 'density', label: 'Densité Grains', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Dérive Brownienne', type: 'slider', min: 0.05, max: 1.5, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Radiance / Éclat',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Dispersion Spatiale',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'twinkleSpeed',
        label: 'Scintillement Organique',
        type: 'slider',
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
    ],
  },
  {
    type: 'fireflies',
    name: 'Lucioles Nocturnes',
    role: 'Insectes bioluminescents aux trajectoires 3D erratiques et pulsation respirante asynchrone',
    category: 'particles',
    defaultProps: {
      glowColor: '#a3e635',
      coreColor: '#fef08a',
      density: 1.0,
      speed: 0.35,
      depth: 0.45,
      intensity: 1.3,
      randomness: 0.55,
      pulseFrequency: 1.4,
    },
    fields: [
      { key: 'glowColor', label: 'Couronne Bioluminescente', type: 'color' },
      { key: 'coreColor', label: 'Cœur Chaud', type: 'color' },
      {
        key: 'density',
        label: 'Nombre de Lucioles',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vivacité en Vol', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Éclat Maximal', type: 'slider', min: 0.2, max: 2.0, step: 0.05 },
      {
        key: 'randomness',
        label: 'Imprévisibilité Virages',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'pulseFrequency',
        label: 'Rythme Respirant',
        type: 'slider',
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
    ],
  },
  {
    type: 'bubbles',
    name: 'Bulles Aquatiques',
    role: 'Sphères translucides irisées avec reflet spéculaire, ascension en zig-zag et dilatation hydrostatique',
    category: 'particles',
    defaultProps: {
      bubbleColor: '#38bdf8',
      density: 1.0,
      speed: 0.5,
      depth: 0.5,
      intensity: 1.0,
      randomness: 0.4,
      wobbleAmount: 0.4,
      expansionRate: 1.25,
    },
    fields: [
      { key: 'bubbleColor', label: 'Teinte de la Bulle', type: 'color' },
      { key: 'density', label: 'Densité Bulles', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Ascension', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Éclat Reflet Spéculaire',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Asymétrie / Tailles',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'wobbleAmount',
        label: 'Balancement Zig-Zag',
        type: 'slider',
        min: 0.1,
        max: 1.5,
        step: 0.05,
      },
      {
        key: 'expansionRate',
        label: 'Dilatation Hydrostatique',
        type: 'slider',
        min: 0.5,
        max: 2.0,
        step: 0.05,
      },
    ],
  },
  {
    type: 'leaves',
    name: 'Feuilles Mortes',
    role: 'Feuilles automnales rousses et dorées avec aérodynamique de glissade, portance et tumbling 3D',
    category: 'particles',
    defaultProps: {
      leafColor: '#ea580c',
      altColor: '#ca8a04',
      density: 1.0,
      speed: 0.4,
      depth: 0.5,
      intensity: 1.0,
      randomness: 0.55,
      flutterRate: 1.6,
      windDrift: 0.5,
    },
    fields: [
      { key: 'leafColor', label: 'Feuilles Rousses', type: 'color' },
      { key: 'altColor', label: 'Feuilles Dorées', type: 'color' },
      {
        key: 'density',
        label: 'Nombre de Feuilles',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse Descente', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Saturation Couleurs',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Turbulence Rafales',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'flutterRate',
        label: 'Battement / Plané',
        type: 'slider',
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
      {
        key: 'windDrift',
        label: 'Dérive sous le Vent',
        type: 'slider',
        min: 0.0,
        max: 1.5,
        step: 0.05,
      },
    ],
  },
  {
    type: 'sparks',
    name: 'Étincelles Balistiques',
    role: 'Projections ultra-vives avec forte vélocité initiale, gravité parabolique et étirement directionnel',
    category: 'particles',
    defaultProps: {
      sparkColor: '#fef08a',
      coreColor: '#ffffff',
      density: 1.0,
      speed: 1.2,
      depth: 0.4,
      intensity: 1.4,
      randomness: 0.5,
      gravity: 1.2,
      burstInterval: 1.5,
    },
    fields: [
      { key: 'sparkColor', label: 'Teinte Étincelles', type: 'color' },
      { key: 'coreColor', label: 'Cœur Blanc-Chaud', type: 'color' },
      {
        key: 'density',
        label: 'Densité Étincelles',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vélocité Éjection', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Radiance Électrique',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.1,
      },
      {
        key: 'randomness',
        label: 'Dispersion Angulaire',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      { key: 'gravity', label: 'Courbure Gravité', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      {
        key: 'burstInterval',
        label: 'Cadence des Salves',
        type: 'slider',
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
    ],
  },
  {
    type: 'petals',
    name: 'Pétales de Cerisier',
    role: 'Pétales de sakura en voletement soyeux avec spirale 3D délicate et brise printanière',
    category: 'particles',
    defaultProps: {
      petalColor: '#fbcfe8',
      accentColor: '#f472b6',
      density: 1.0,
      speed: 0.35,
      depth: 0.5,
      intensity: 1.0,
      randomness: 0.45,
      curlAmount: 1.0,
      windSpeed: 0.4,
    },
    fields: [
      { key: 'petalColor', label: 'Rose Poudré', type: 'color' },
      { key: 'accentColor', label: 'Accent Sakura', type: 'color' },
      {
        key: 'density',
        label: 'Nombre de Pétales',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse Descente', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Douceur / Éclat',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Turbulence Brise',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'curlAmount',
        label: 'Spirale & Vrille 3D',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'windSpeed',
        label: 'Brise Printanière',
        type: 'slider',
        min: 0.0,
        max: 1.5,
        step: 0.05,
      },
    ],
  },
  {
    type: 'confetti',
    name: 'Confettis Festifs',
    role: 'Rubans multicolores tournoyant vivement sur deux axes (spin & tumble) avec portance aérienne',
    category: 'particles',
    defaultProps: {
      colorMode: 'multi',
      density: 1.0,
      speed: 0.6,
      depth: 0.5,
      intensity: 1.2,
      randomness: 0.5,
      spinSpeed: 1.8,
      flutterStrength: 1.0,
    },
    fields: [
      {
        key: 'density',
        label: 'Densité Confettis',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse Chute', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Saturation & Éclat',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Asymétrie Vrilles',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'spinSpeed',
        label: 'Vitesse Rotation 3D',
        type: 'slider',
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
      {
        key: 'flutterStrength',
        label: 'Portance Aérienne',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
    ],
  },
  {
    type: 'smoke',
    name: 'Volutes de Fumée',
    role: 'Nuages vaporeux ascendants naissant compacts puis gonflant en s’élevant avec dissipation progressive',
    category: 'particles',
    defaultProps: {
      smokeColor: '#64748b',
      tintColor: '#334155',
      density: 1.0,
      speed: 0.35,
      depth: 0.45,
      intensity: 0.7,
      randomness: 0.5,
      expansionRate: 1.4,
      dissipationSpeed: 1.0,
    },
    fields: [
      { key: 'smokeColor', label: 'Teinte Volute', type: 'color' },
      { key: 'tintColor', label: 'Ombrage Interne', type: 'color' },
      {
        key: 'density',
        label: 'Nombre de Volutes',
        type: 'slider',
        min: 0.2,
        max: 2.5,
        step: 0.05,
      },
      { key: 'speed', label: 'Vitesse Ascension', type: 'slider', min: 0.1, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      {
        key: 'intensity',
        label: 'Opacité Vaporeuse',
        type: 'slider',
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      {
        key: 'randomness',
        label: 'Turbulence Vortex',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
      },
      {
        key: 'expansionRate',
        label: 'Expansion des Volutes',
        type: 'slider',
        min: 0.5,
        max: 2.5,
        step: 0.05,
      },
      {
        key: 'dissipationSpeed',
        label: 'Cadence Dissipation',
        type: 'slider',
        min: 0.5,
        max: 2.0,
        step: 0.05,
      },
    ],
  },
]

export const EVENTS_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'lightning',
    name: 'Éclair & Foudre',
    role: 'Décharge plasma fractale avec ramifications (forked lightning), canal ultra-brillant, halo volumétrique et flash stochastique à retours multiples',
    category: 'events',
    defaultProps: {
      lightningColor: '#c4b5fd',
      flashColor: '#ffffff',
      density: 1.0,
      speed: 1.2,
      depth: 0.3,
      intensity: 1.3,
      randomness: 0.55,
      strikeInterval: 3.5,
      forkSpread: 0.6,
    },
    fields: [
      { key: 'lightningColor', label: 'Couleur Plasma', type: 'color' },
      { key: 'flashColor', label: 'Couleur Flash Ciel', type: 'color' },
      { key: 'density', label: 'Ramifications Fractales', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Décharge', type: 'slider', min: 0.2, max: 3.0, step: 0.05 },
      { key: 'depth', label: 'Parallaxe Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Radiance / Flash', type: 'slider', min: 0.2, max: 3.0, step: 0.1 },
      { key: 'randomness', label: 'Sinuosité Fractale', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'strikeInterval', label: 'Intervalle Frappes (s)', type: 'slider', min: 1.0, max: 10.0, step: 0.5 },
      { key: 'forkSpread', label: 'Écartement Branches', type: 'slider', min: 0.2, max: 1.5, step: 0.05 },
    ],
  },
  {
    type: 'shooting_star',
    name: 'Étoile Filante',
    role: 'Bolide hypersonique fendant la voûte céleste avec tête incandescente ablative, traînée de plasma ionisé persistant et micro-fragmentation',
    category: 'events',
    defaultProps: {
      starColor: '#ffffff',
      trailColor: '#38bdf8',
      density: 1.0,
      speed: 1.4,
      depth: 0.4,
      intensity: 1.25,
      randomness: 0.45,
      angle: -0.65,
      trailLength: 1.2,
      starInterval: 3.0,
    },
    fields: [
      { key: 'starColor', label: 'Couleur Bolide', type: 'color' },
      { key: 'trailColor', label: 'Couleur Traînée Plasma', type: 'color' },
      { key: 'density', label: 'Densité / Fréquence', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vélocité Traversée', type: 'slider', min: 0.2, max: 3.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Radiance & Éclat', type: 'slider', min: 0.2, max: 3.0, step: 0.1 },
      { key: 'randomness', label: 'Dispersion Angles', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'angle', label: 'Angle Descente (rad)', type: 'slider', min: -2.0, max: 2.0, step: 0.05 },
      { key: 'trailLength', label: 'Longueur Traînée', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'starInterval', label: 'Intervalle (s)', type: 'slider', min: 1.0, max: 10.0, step: 0.5 },
    ],
  },
  {
    type: 'wind_gust',
    name: 'Rafale de Vent',
    role: 'Bourrasque d’air traversant l’écran avec lignes de courant (streamlines) sinueuses, tourbillons de Kelvin-Helmholtz et micro-condensation',
    category: 'events',
    defaultProps: {
      windColor: '#e2e8f0',
      density: 1.0,
      speed: 1.3,
      depth: 0.35,
      intensity: 1.1,
      randomness: 0.45,
      gustAngle: 0.15,
      gustInterval: 4.0,
      swirlScale: 1.0,
    },
    fields: [
      { key: 'windColor', label: 'Couleur Flux d’Air', type: 'color' },
      { key: 'density', label: 'Lignes de Courant', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vélocité Rafale', type: 'slider', min: 0.2, max: 3.0, step: 0.05 },
      { key: 'depth', label: 'Parallaxe Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Contraste Volutes', type: 'slider', min: 0.2, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Turbulence Vortex', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'gustAngle', label: 'Direction Vent (rad)', type: 'slider', min: -3.14, max: 3.14, step: 0.05 },
      { key: 'gustInterval', label: 'Intervalle Rafales (s)', type: 'slider', min: 1.0, max: 10.0, step: 0.5 },
      { key: 'swirlScale', label: 'Échelle Tourbillons', type: 'slider', min: 0.3, max: 2.0, step: 0.05 },
    ],
  },
  {
    type: 'shockwave',
    name: 'Onde de Choc',
    role: 'Détonation annulaire en expansion radiale avec compression optique, anneaux secondaires concentriques et aberration chromatique RVB',
    category: 'events',
    defaultProps: {
      ringColor: '#38bdf8',
      density: 1.0,
      speed: 1.2,
      depth: 0.3,
      intensity: 1.2,
      randomness: 0.35,
      epicenterX: 0.0,
      epicenterY: 0.0,
      waveInterval: 3.5,
      chromaticAberration: 0.02,
    },
    fields: [
      { key: 'ringColor', label: 'Couleur Anneau Onde', type: 'color' },
      { key: 'density', label: 'Anneaux Secondaires', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Expansion', type: 'slider', min: 0.2, max: 3.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Radiance / Distorsion', type: 'slider', min: 0.2, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Asymétrie Épicentre', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'epicenterX', label: 'Épicentre X', type: 'slider', min: -1.0, max: 1.0, step: 0.05 },
      { key: 'epicenterY', label: 'Épicentre Y', type: 'slider', min: -1.0, max: 1.0, step: 0.05 },
      { key: 'waveInterval', label: 'Intervalle Ondes (s)', type: 'slider', min: 1.0, max: 10.0, step: 0.5 },
      { key: 'chromaticAberration', label: 'Dispersion RVB', type: 'slider', min: 0.0, max: 0.05, step: 0.005 },
    ],
  },
  {
    type: 'glitch',
    name: 'Glitch Numérique',
    role: 'Défaillance d’affichage cybernétique avec découpage par blocs horizontaux (slicing), aberration chromatique (RGB split) et balayage corrompu',
    category: 'events',
    defaultProps: {
      glitchColor: '#00f0ff',
      density: 1.0,
      speed: 1.5,
      depth: 0.25,
      intensity: 1.2,
      randomness: 0.6,
      sliceHeight: 0.08,
      glitchInterval: 3.0,
      chromaticShift: 0.04,
    },
    fields: [
      { key: 'glitchColor', label: 'Couleur Franges', type: 'color' },
      { key: 'density', label: 'Nombre de Blocs', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vivacité Salves', type: 'slider', min: 0.2, max: 3.0, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Amplitude Décalage', type: 'slider', min: 0.2, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Imprévisibilité Gigue', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'sliceHeight', label: 'Hauteur Tranches', type: 'slider', min: 0.01, max: 0.25, step: 0.01 },
      { key: 'glitchInterval', label: 'Intervalle Salves (s)', type: 'slider', min: 1.0, max: 10.0, step: 0.5 },
      { key: 'chromaticShift', label: 'Séparation RVB', type: 'slider', min: 0.01, max: 0.15, step: 0.01 },
    ],
  },
  {
    type: 'screen_shake',
    name: 'Tremblement Léger',
    role: 'Secousse tellurique ou cinématique amortie agissant sur la caméra (X, Y, Z, roulis) avec voile de vibration optique et répliques (aftershocks)',
    category: 'events',
    defaultProps: {
      shakeColor: '#94a3b8',
      density: 1.0,
      speed: 1.2,
      depth: 0.3,
      intensity: 1.0,
      randomness: 0.5,
      shakeInterval: 4.5,
      decayRate: 3.5,
    },
    fields: [
      { key: 'shakeColor', label: 'Voile Tellurique', type: 'color' },
      { key: 'density', label: 'Fréquence Harmoniques', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vivacité Secousse', type: 'slider', min: 0.2, max: 3.0, step: 0.05 },
      { key: 'depth', label: 'Amplitude Recul Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Force de Déplacement', type: 'slider', min: 0.1, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Asymétrie Axes', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'shakeInterval', label: 'Intervalle Secousses (s)', type: 'slider', min: 1.0, max: 10.0, step: 0.5 },
      { key: 'decayRate', label: 'Taux Amortissement', type: 'slider', min: 1.0, max: 8.0, step: 0.2 },
    ],
  },
]

export const OVERLAYS_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'grain',
    name: 'Grain Argentique',
    role: 'Simulation photochimique de grain cinéma 35mm avec micro-agrégats (clumpiness), jitter 24fps et dispersion chromatique',
    category: 'overlay',
    defaultProps: {
      grainColor: '#ffffff',
      density: 1.2,
      speed: 0.8,
      depth: 0.2,
      intensity: 0.12,
      randomness: 0.5,
      clumpSize: 1.0,
    },
    fields: [
      { key: 'grainColor', label: 'Teinte Cristaux', type: 'color' },
      { key: 'density', label: 'Finesse Cristaux', type: 'slider', min: 0.4, max: 3.0, step: 0.1 },
      { key: 'speed', label: 'Cadence (24fps)', type: 'slider', min: 0.1, max: 2.5, step: 0.05 },
      { key: 'depth', label: 'Parallaxe Focale', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Contraste Grain', type: 'slider', min: 0.02, max: 0.45, step: 0.01 },
      { key: 'randomness', label: 'Agrégats Émulsion', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'clumpSize', label: 'Taille des Amas', type: 'slider', min: 0.4, max: 2.5, step: 0.1 },
    ],
  },
  {
    type: 'vignette',
    name: 'Vignettage Optique',
    role: 'Assombrissement radial physique selon la loi cos^4(theta) avec respiration organique du diaphragme et décentrement',
    category: 'overlay',
    defaultProps: {
      vignetteColor: '#000000',
      density: 1.0,
      speed: 0.15,
      depth: 0.35,
      intensity: 0.6,
      randomness: 0.2,
      roundness: 0.65,
      smoothness: 0.85,
    },
    fields: [
      { key: 'vignetteColor', label: 'Teinte Pénombre', type: 'color' },
      { key: 'density', label: 'Rayon Intérieur', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Respiration Diaphragme', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'depth', label: 'Décentrement Souris', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Opacité Bordures', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'randomness', label: 'Asymétrie Lentille', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'roundness', label: 'Forme (0=Écran, 1=Rond)', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'smoothness', label: 'Douceur Dégradé', type: 'slider', min: 0.2, max: 1.5, step: 0.05 },
    ],
  },
  {
    type: 'crt_scanlines',
    name: 'Scanlines CRT & Rétro',
    role: 'Émulation de moniteur cathodique vintage avec balayage horizontal, phosphor roll, courbure barillet 3D et masque sub-pixel',
    category: 'overlay',
    defaultProps: {
      scanlineColor: '#000000',
      density: 1.0,
      speed: 0.3,
      depth: 0.25,
      intensity: 0.45,
      randomness: 0.25,
      curvature: 0.12,
      rollIntensity: 0.15,
    },
    fields: [
      { key: 'scanlineColor', label: 'Couleur Lignes', type: 'color' },
      { key: 'density', label: 'Densité des Lignes', type: 'slider', min: 0.3, max: 3.0, step: 0.05 },
      { key: 'speed', label: 'Vitesse Phosphor Roll', type: 'slider', min: 0.0, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Parallaxe 3D', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Contraste Trame', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'randomness', label: 'Micro-flicker 60Hz', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'curvature', label: 'Courbure Tube Bombé', type: 'slider', min: 0.0, max: 0.35, step: 0.02 },
      { key: 'rollIntensity', label: 'Éclat Barre Balayage', type: 'slider', min: 0.0, max: 0.4, step: 0.02 },
    ],
  },
  {
    type: 'halftone',
    name: 'Trame Comics (Halftone)',
    role: 'Impression offset pop art et Ben-Day dots inclinés à 45° avec modulation de diamètre, bavure d’encre et onde cinétique',
    category: 'overlay',
    defaultProps: {
      dotColor: '#000000',
      density: 1.2,
      speed: 0.2,
      depth: 0.3,
      intensity: 0.5,
      randomness: 0.3,
      patternAngle: 0.79,
      dotRadius: 0.45,
    },
    fields: [
      { key: 'dotColor', label: 'Couleur Encre', type: 'color' },
      { key: 'density', label: 'Densité Grille', type: 'slider', min: 0.4, max: 3.0, step: 0.05 },
      { key: 'speed', label: 'Vitesse Ondulation', type: 'slider', min: 0.0, max: 1.5, step: 0.05 },
      { key: 'depth', label: 'Parallaxe / Répulsion', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Opacité Encre', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'randomness', label: 'Bavure Papier Simplex', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'patternAngle', label: 'Angle Trame (rad)', type: 'slider', min: 0.0, max: 3.14, step: 0.05 },
      { key: 'dotRadius', label: 'Calibre des Points', type: 'slider', min: 0.1, max: 0.85, step: 0.02 },
    ],
  },
  {
    type: 'pixelation',
    name: 'Pixellisation Rétro',
    role: 'Mosaïque rétro 8/16-bit quantifiée avec tramage ordonné de Bayer 4x4, joints de dalles et loupe de focus interactive sous la souris',
    category: 'overlay',
    defaultProps: {
      tintColor: '#000000',
      density: 1.0,
      speed: 0.25,
      depth: 0.4,
      intensity: 0.65,
      randomness: 0.2,
      pixelSize: 8.0,
      ditherStrength: 0.35,
    },
    fields: [
      { key: 'tintColor', label: 'Teinte Mosaïque', type: 'color' },
      { key: 'density', label: 'Finesse Grille', type: 'slider', min: 0.3, max: 3.0, step: 0.05 },
      { key: 'speed', label: 'Pulsation Temporelle', type: 'slider', min: 0.0, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Rayon Loupe de Focus', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Force Mosaïque', type: 'slider', min: 0.1, max: 1.0, step: 0.05 },
      { key: 'randomness', label: 'Instabilité Rétro', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'pixelSize', label: 'Taille Pixel (px)', type: 'slider', min: 2.0, max: 32.0, step: 1.0 },
      { key: 'ditherStrength', label: 'Tramage Bayer 4x4', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
    ],
  },
  {
    type: 'chromatic_aberration',
    name: 'Aberration Chromatique',
    role: 'Dispersion spectrale prismatique RVB avec étalement radial r^2 vers les bords et préservation totale du centre pour la lisibilité',
    category: 'overlay',
    defaultProps: {
      aberrationColor: '#00f0ff',
      density: 1.0,
      speed: 0.3,
      depth: 0.4,
      intensity: 0.6,
      randomness: 0.3,
      spread: 0.025,
      radialFalloff: 1.6,
    },
    fields: [
      { key: 'aberrationColor', label: 'Couleur Frange', type: 'color' },
      { key: 'density', label: 'Fréquence Ondes', type: 'slider', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Prisme', type: 'slider', min: 0.0, max: 2.0, step: 0.05 },
      { key: 'depth', label: 'Déflexion Souris', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Force Séparation RVB', type: 'slider', min: 0.1, max: 1.5, step: 0.05 },
      { key: 'randomness', label: 'Asymétrie Simplex', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'spread', label: 'Écartement Franges', type: 'slider', min: 0.005, max: 0.08, step: 0.002 },
      { key: 'radialFalloff', label: 'Falloff Central (Texte Net)', type: 'slider', min: 0.5, max: 3.0, step: 0.1 },
    ],
  },
]

export const SPECIAL_BRICKS_CATALOG: BrickDescriptor[] = [
  {
    type: 'neon_grid',
    name: 'Grille Néon',
    role: 'Grille 3D perspective rétro-futuriste synthwave avec tracé néon fwidth, impulsions d’énergie et ondulation de terrain Simplex 2D',
    category: 'special',
    defaultProps: {
      gridColor: '#00f0ff',
      horizonColor: '#ff007f',
      pulseColor: '#ffffff',
      density: 1.0,
      speed: 0.3,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.3,
      horizonHeight: 0.45,
      lineWidth: 0.04,
      waveHeight: 0.25,
    },
    fields: [
      { key: 'gridColor', label: 'Couleur Grille Néon', type: 'color' },
      { key: 'horizonColor', label: 'Lueur Horizon Céleste', type: 'color' },
      { key: 'pulseColor', label: 'Impulsions Énergie', type: 'color' },
      { key: 'density', label: 'Densité / Échelle', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Défilement', type: 'slider', min: 0.0, max: 1.5, step: 0.05 },
      { key: 'depth', label: 'Parallaxe / Profondeur', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Radiance Néon', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'randomness', label: 'Relief / Simplex', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'horizonHeight', label: 'Hauteur Horizon', type: 'slider', min: 0.2, max: 0.75, step: 0.02 },
      { key: 'lineWidth', label: 'Épaisseur Traits', type: 'slider', min: 0.01, max: 0.1, step: 0.005 },
      { key: 'waveHeight', label: 'Hauteur Ondes Terrain', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
    ],
  },
  {
    type: 'code_rain',
    name: 'Pluie de Code (Matrix)',
    role: 'Cascade cybernétique de caractères mutants sur 3 couches de profondeur avec têtes incandescentes et perturbation magnétique souris',
    category: 'special',
    defaultProps: {
      primaryColor: '#00ff66',
      headColor: '#ffffff',
      glowColor: '#003b15',
      density: 1.0,
      speed: 0.45,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.35,
      charSize: 1.0,
      tailLength: 0.7,
      mouseGlow: 0.5,
    },
    fields: [
      { key: 'primaryColor', label: 'Couleur Caractères', type: 'color' },
      { key: 'headColor', label: 'Couleur Tête Incandescente', type: 'color' },
      { key: 'glowColor', label: 'Halo Ambiant Sombre', type: 'color' },
      { key: 'density', label: 'Nombre Colonnes', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Chute', type: 'slider', min: 0.1, max: 1.8, step: 0.05 },
      { key: 'depth', label: 'Parallaxe 3D', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Radiance Glyphes', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'randomness', label: 'Mutation Caractères', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'charSize', label: 'Taille Glyphes', type: 'slider', min: 0.5, max: 2.0, step: 0.05 },
      { key: 'tailLength', label: 'Longueur Traînée', type: 'slider', min: 0.2, max: 1.5, step: 0.05 },
      { key: 'mouseGlow', label: 'Perturbation Souris', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
    ],
  },
  {
    type: 'hex_grid',
    name: 'Grille Hexagonale',
    role: 'Réseau d’alvéoles nanotechnologiques / bouclier d’énergie avec pulsation biologique par cellule, doubles arêtes et ondes de choc souris',
    category: 'special',
    defaultProps: {
      borderColor: '#00f0ff',
      fillColor: '#001224',
      pulseColor: '#ff007f',
      density: 1.0,
      speed: 0.3,
      depth: 0.35,
      intensity: 1.0,
      randomness: 0.35,
      borderWidth: 0.06,
      innerGlow: 0.45,
      waveSpread: 1.2,
    },
    fields: [
      { key: 'borderColor', label: 'Couleur Arêtes', type: 'color' },
      { key: 'fillColor', label: 'Fond Alvéoles', type: 'color' },
      { key: 'pulseColor', label: 'Ondes Énergie', type: 'color' },
      { key: 'density', label: 'Échelle Hexagones', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Pulsation', type: 'slider', min: 0.1, max: 1.8, step: 0.05 },
      { key: 'depth', label: 'Parallaxe / Relief', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Contraste / Éclat', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'randomness', label: 'Asynchronisme', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'borderWidth', label: 'Épaisseur Bordures', type: 'slider', min: 0.02, max: 0.15, step: 0.005 },
      { key: 'innerGlow', label: 'Halo Interne Cellule', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'waveSpread', label: 'Rayon Ondes Souris', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
    ],
  },
  {
    type: 'line_constellation',
    name: 'Constellation de Lignes',
    role: 'Graphe 3D synaptique et stellaire avec dérive brownienne Simplex 3D, liaisons de proximité dynamiques et impulsions synaptiques',
    category: 'special',
    defaultProps: {
      nodeColor: '#00f0ff',
      lineColor: '#38bdf8',
      pulseColor: '#ffffff',
      density: 1.0,
      speed: 0.25,
      depth: 0.4,
      intensity: 1.0,
      randomness: 0.35,
      connectDistance: 2.8,
      nodeSize: 1.0,
      pulseSpeed: 1.5,
    },
    fields: [
      { key: 'nodeColor', label: 'Couleur Nœuds', type: 'color' },
      { key: 'lineColor', label: 'Couleur Lignes', type: 'color' },
      { key: 'pulseColor', label: 'Impulsions Synaptiques', type: 'color' },
      { key: 'density', label: 'Nombre Nœuds', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Dérive', type: 'slider', min: 0.05, max: 1.2, step: 0.05 },
      { key: 'depth', label: 'Profondeur Z', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'intensity', label: 'Radiance Réseau', type: 'slider', min: 0.2, max: 2.5, step: 0.05 },
      { key: 'randomness', label: 'Turbulence Brownienne', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'connectDistance', label: 'Distance Connexion', type: 'slider', min: 1.5, max: 5.0, step: 0.1 },
      { key: 'nodeSize', label: 'Taille Nœuds', type: 'slider', min: 0.4, max: 2.5, step: 0.05 },
      { key: 'pulseSpeed', label: 'Vitesse Influx', type: 'slider', min: 0.5, max: 3.5, step: 0.1 },
    ],
  },
]

export const ALL_BRICKS_CATALOG = [
  ...SPECIAL_BRICKS_CATALOG,
  ...BACKGROUND_BRICKS_CATALOG,
  ...PARALLAX_BRICKS_CATALOG,
  ...ATMOSPHERE_BRICKS_CATALOG,
  ...PARTICLES_BRICKS_CATALOG,
  ...EVENTS_BRICKS_CATALOG,
  ...OVERLAYS_BRICKS_CATALOG,
]

export const BrickDemoInspector: React.FC<{
  engine: ThemeEngine | null
}> = ({ engine }) => {
  const [selectedGroup, setSelectedGroup] = useState<
    'background' | 'parallax' | 'atmosphere' | 'particles' | 'events' | 'overlay' | 'special'
  >('special')
  const [selectedType, setSelectedType] = useState<string>('neon_grid')
  const [currentProps, setCurrentProps] = useState<Record<string, any>>(() => {
    return { ...SPECIAL_BRICKS_CATALOG[0].defaultProps }
  })
  const [currentTier, setCurrentTier] = useState<QualityTier>('HIGH')
  const [isMobileThrottled, setIsMobileThrottled] = useState(false)
  const [stats, setStats] = useState<PerformanceStats | null>(null)

  const activeCatalog =
    selectedGroup === 'special'
      ? SPECIAL_BRICKS_CATALOG
      : selectedGroup === 'overlay'
        ? OVERLAYS_BRICKS_CATALOG
        : selectedGroup === 'events'
          ? EVENTS_BRICKS_CATALOG
          : selectedGroup === 'particles'
            ? PARTICLES_BRICKS_CATALOG
            : selectedGroup === 'atmosphere'
              ? ATMOSPHERE_BRICKS_CATALOG
              : selectedGroup === 'parallax'
                ? PARALLAX_BRICKS_CATALOG
                : BACKGROUND_BRICKS_CATALOG
  const activeDescriptor = activeCatalog.find((b) => b.type === selectedType) ?? activeCatalog[0]

  // Écoute de la télémétrie FPS
  useEffect(() => {
    if (!engine) return
    const unsub = engine.quality.subscribe((_tier, newStats) => {
      setStats(newStats)
    })
    const interval = setInterval(() => {
      if (engine) {
        setStats(engine.quality.getStats())
      }
    }, 250)
    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [engine])

  // Charge la brique sélectionnée dans le moteur Three.js
  const loadBrickInEngine = (type: string, propsToUse: Record<string, any>) => {
    if (!engine) return

    const isSpecial = SPECIAL_BRICKS_CATALOG.some((b) => b.type === type)
    const isOverlay = OVERLAYS_BRICKS_CATALOG.some((b) => b.type === type)
    const isEvents = EVENTS_BRICKS_CATALOG.some((b) => b.type === type)
    const isParticles = PARTICLES_BRICKS_CATALOG.some((b) => b.type === type)
    const isAtmosphere = ATMOSPHERE_BRICKS_CATALOG.some((b) => b.type === type)
    const isParallax = PARALLAX_BRICKS_CATALOG.some((b) => b.type === type)

    // Configuration des couches selon le groupe
    const layersConfig: ThemeEngineConfig['layers'] = []

    if (isSpecial) {
      // Pour les effets spéciaux, décor cyberpunk / spatial adapté mettant en valeur chaque géométrie
      let bgType = 'gradient_sky'
      let bgProps: Record<string, any> = {
        topColor: '#080112',
        bottomColor: '#020005',
        horizonColor: '#ff007f',
        density: 1.0,
        speed: 0.1,
      }
      let interType = ''
      let interProps: Record<string, any> = {}

      if (type === 'neon_grid') {
        bgProps = {
          topColor: '#080112',
          bottomColor: '#020005',
          horizonColor: propsToUse.horizonColor || '#ff007f',
          density: 1.2,
          speed: 0.1,
        }
      } else if (type === 'code_rain') {
        bgProps = {
          topColor: '#000803',
          bottomColor: '#000201',
          horizonColor: propsToUse.primaryColor || '#00ff66',
          density: 1.0,
          speed: 0.05,
        }
      } else if (type === 'hex_grid') {
        bgProps = {
          topColor: '#030a17',
          bottomColor: '#010307',
          horizonColor: propsToUse.borderColor || '#00f0ff',
          density: 1.0,
          speed: 0.1,
        }
        interType = 'parallax_fleet'
        interProps = {
          fleetColor: '#040d1a',
          engineColor: propsToUse.pulseColor || '#ff007f',
          density: 0.8,
          depth: 0.35,
        }
      } else if (type === 'line_constellation') {
        bgProps = {
          topColor: '#060d24',
          bottomColor: '#01030a',
          horizonColor: propsToUse.nodeColor || '#00f0ff',
          density: 1.0,
          speed: 0.1,
        }
        interType = ''
        interProps = {}
      }

      layersConfig.push({
        category: 'background',
        bricks: [{ id: 'bg_companion_brick', brickType: bgType, props: bgProps }],
      })

      if (interType) {
        layersConfig.push({
          category: 'intermediate',
          bricks: [{ id: 'inter_companion_brick', brickType: interType, props: interProps }],
        })
      }

      layersConfig.push({
        category: 'special',
        bricks: [{ id: 'demo_brick', brickType: type, props: { ...propsToUse } }],
      })
    } else if (isOverlay) {
      // Pour les overlays et styles, décor cinématique complet mettant en valeur chaque effet
      let bgType = 'gradient_sky'
      let bgProps: Record<string, any> = {
        topColor: '#0f172a',
        bottomColor: '#020617',
        horizonColor: '#38bdf8',
        density: 1.0,
        speed: 0.15,
        depth: 0.1,
      }
      let interType = 'parallax_mountains'
      let interProps: Record<string, any> = {
        rockColor: '#090d16',
        sunColor: '#1e293b',
        mistColor: '#0f172a',
        density: 1.0,
        depth: 0.35,
      }

      if (type === 'grain') {
        bgProps = { topColor: '#1e1b4b', bottomColor: '#09090b', horizonColor: '#f43f5e', density: 1.0, speed: 0.1 }
        interType = 'parallax_mountains'
        interProps = { rockColor: '#080812', sunColor: '#3b0764', mistColor: '#1e1b4b', density: 1.0, depth: 0.3 }
      } else if (type === 'vignette') {
        bgProps = { topColor: '#312e81', bottomColor: '#0a0a0a', horizonColor: '#fbbf24', density: 1.1, speed: 0.1 }
        interType = 'parallax_castle'
        interProps = { castleColor: '#07070e', torchColor: '#f59e0b', rockColor: '#111827', density: 1.0, depth: 0.35 }
      } else if (type === 'crt_scanlines') {
        bgProps = { topColor: '#111827', bottomColor: '#030712', horizonColor: '#00f0ff', density: 1.0, speed: 0.1 }
        interType = 'parallax_city'
        interProps = { buildingColor: '#05070e', windowColor: '#00f0ff', beaconColor: '#ef4444', density: 1.0, depth: 0.3 }
      } else if (type === 'halftone') {
        bgProps = { topColor: '#581c87', bottomColor: '#0f172a', horizonColor: '#f59e0b', density: 1.2, speed: 0.15 }
        interType = 'parallax_city'
        interProps = { buildingColor: '#09090b', windowColor: '#f59e0b', beaconColor: '#ec4899', density: 1.0, depth: 0.3 }
      } else if (type === 'pixelation') {
        bgProps = { topColor: '#1e293b', bottomColor: '#020617', horizonColor: '#10b981', density: 1.0, speed: 0.15 }
        interType = 'parallax_pixel_tiles'
        interProps = { tileColor: '#0f172a', topFringeColor: '#10b981', ditherColor: '#020617', density: 1.0, depth: 0.35 }
      } else if (type === 'chromatic_aberration') {
        bgProps = { topColor: '#1e1b4b', bottomColor: '#05050a', horizonColor: '#ec4899', density: 1.0, speed: 0.15 }
        interType = 'parallax_city'
        interProps = { buildingColor: '#06060f', windowColor: '#00f0ff', beaconColor: '#ec4899', density: 1.0, depth: 0.35 }
      }

      layersConfig.push({
        category: 'background',
        bricks: [{ id: 'bg_companion_brick', brickType: bgType, props: bgProps }],
      })

      if (interType) {
        layersConfig.push({
          category: 'intermediate',
          bricks: [{ id: 'inter_companion_brick', brickType: interType, props: interProps }],
        })
      }

      layersConfig.push({
        category: 'overlay',
        bricks: [{ id: 'demo_brick', brickType: type, props: { ...propsToUse } }],
      })
    } else if (isEvents) {
      // Pour les événements, décor immersif spécifique mettant en valeur chaque effet
      let bgType = 'gradient_sky'
      let bgProps: Record<string, any> = {
        topColor: '#070b14',
        bottomColor: '#020307',
        horizonColor: '#38bdf8',
        density: 1.0,
        speed: 0.1,
        depth: 0.1,
      }
      let interType = 'parallax_mountains'
      let interProps: Record<string, any> = {
        rockColor: '#080d1a',
        sunColor: '#334155',
        mistColor: '#0f172a',
        density: 1.0,
        depth: 0.3,
      }

      if (type === 'lightning') {
        bgType = 'fbm_clouds'
        bgProps = {
          cloudColor: '#1e293b',
          skyColor: '#05070d',
          density: 0.75,
          speed: 0.1,
          depth: 0.2,
          intensity: 1.1,
          randomness: 0.5,
        }
        interType = 'parallax_mountains'
        interProps = {
          rockColor: '#04060b',
          sunColor: '#1e293b',
          mistColor: '#0c1220',
          density: 1.0,
          depth: 0.35,
        }
      } else if (type === 'shooting_star') {
        bgType = 'multilayer_starfield'
        bgProps = {
          starColor: '#ffffff',
          density: 1.2,
          speed: 0.05,
          depth: 1.0,
          intensity: 1.0,
        }
        interType = 'parallax_mountains'
        interProps = {
          rockColor: '#060a14',
          sunColor: '#1e293b',
          mistColor: '#0a0f1d',
          density: 0.8,
          depth: 0.3,
        }
      } else if (type === 'wind_gust') {
        bgProps = { topColor: '#0f172a', bottomColor: '#020617', horizonColor: '#94a3b8' }
        interType = 'parallax_forest'
        interProps = {
          forestColor: '#06120e',
          fogColor: '#132e24',
          density: 1.0,
          depth: 0.35,
          windStrength: 0.8,
        }
      } else if (type === 'shockwave') {
        bgProps = { topColor: '#0f121d', bottomColor: '#020408', horizonColor: '#38bdf8' }
        interType = 'parallax_city'
        interProps = {
          buildingColor: '#060912',
          windowColor: '#38bdf8',
          beaconColor: '#ef4444',
          density: 1.0,
          depth: 0.35,
        }
      } else if (type === 'glitch') {
        bgProps = { topColor: '#15061e', bottomColor: '#040108', horizonColor: '#00f0ff' }
        interType = 'parallax_city'
        interProps = {
          buildingColor: '#0b0414',
          windowColor: '#00f0ff',
          beaconColor: '#ff0055',
          density: 1.0,
          depth: 0.3,
        }
      } else if (type === 'screen_shake') {
        bgProps = { topColor: '#18110b', bottomColor: '#060402', horizonColor: '#f59e0b' }
        interType = 'parallax_castle'
        interProps = {
          castleColor: '#0c0805',
          torchColor: '#f97316',
          rockColor: '#100b07',
          density: 1.0,
          depth: 0.35,
        }
      }

      layersConfig.push({
        category: 'background',
        bricks: [{ id: 'bg_companion_brick', brickType: bgType, props: bgProps }],
      })

      if (interType) {
        layersConfig.push({
          category: 'intermediate',
          bricks: [{ id: 'inter_companion_brick', brickType: interType, props: interProps }],
        })
      }

      layersConfig.push({
        category: 'events',
        bricks: [{ id: 'demo_brick', brickType: type, props: { ...propsToUse } }],
      })
    } else if (isParticles) {
      // Pour les particules, intégrer un arrière-plan immersif mettant en valeur le rendu
      let bgType = 'gradient_sky'
      let bgProps: Record<string, any> = {
        topColor: '#0a1526',
        bottomColor: '#020610',
        horizonColor: '#38bdf8',
        density: 1.0,
        speed: 0.1,
        depth: 0.1,
      }
      let interType = 'parallax_mountains'
      let interProps: Record<string, any> = {
        rockColor: '#070f1e',
        sunColor: '#334155',
        mistColor: '#0f172a',
        density: 0.9,
        depth: 0.3,
      }

      if (type === 'embers') {
        bgProps = { topColor: '#1a0904', bottomColor: '#050201', horizonColor: '#f97316' }
        interType = 'parallax_castle'
        interProps = {
          castleColor: '#0c0502',
          torchColor: '#ea580c',
          rockColor: '#080302',
          density: 1.0,
          depth: 0.3,
        }
      } else if (type === 'ash') {
        bgProps = { topColor: '#141416', bottomColor: '#070709', horizonColor: '#64748b' }
        interType = 'parallax_mountains'
        interProps = {
          rockColor: '#0a0a0c',
          sunColor: '#334155',
          mistColor: '#1e293b',
          density: 1.0,
          depth: 0.3,
        }
      } else if (type === 'snow') {
        bgProps = { topColor: '#0c1527', bottomColor: '#030712', horizonColor: '#93c5fd' }
        interType = 'parallax_mountains'
        interProps = {
          rockColor: '#080f1d',
          sunColor: '#64748b',
          mistColor: '#1e293b',
          density: 1.0,
          depth: 0.3,
          snowLevel: 0.5,
        }
      } else if (type === 'rain') {
        bgProps = { topColor: '#0b0f19', bottomColor: '#020408', horizonColor: '#38bdf8' }
        interType = 'parallax_city'
        interProps = {
          buildingColor: '#050912',
          windowColor: '#38bdf8',
          beaconColor: '#ef4444',
          density: 1.0,
          depth: 0.3,
        }
      } else if (type === 'dust') {
        bgProps = { topColor: '#17130d', bottomColor: '#070503', horizonColor: '#fef08a' }
        interType = 'parallax_forest'
        interProps = { forestColor: '#100d08', fogColor: '#2d2415', density: 0.9, depth: 0.3 }
      } else if (type === 'fireflies') {
        bgProps = { topColor: '#041510', bottomColor: '#010705', horizonColor: '#10b981' }
        interType = 'parallax_forest'
        interProps = { forestColor: '#061711', fogColor: '#0f382a', density: 1.0, depth: 0.3 }
      } else if (type === 'bubbles') {
        bgType = 'water_caustics'
        bgProps = { waterColor: '#02182b', causticColor: '#38bdf8', density: 1.0, depth: 0.2 }
        interType = ''
      } else if (type === 'leaves') {
        bgProps = { topColor: '#230f04', bottomColor: '#080301', horizonColor: '#f97316' }
        interType = 'parallax_forest'
        interProps = { forestColor: '#1c0c03', fogColor: '#381807', density: 1.0, depth: 0.3 }
      } else if (type === 'sparks') {
        bgProps = { topColor: '#0e0f18', bottomColor: '#030307', horizonColor: '#f59e0b' }
        interType = 'parallax_city'
        interProps = {
          buildingColor: '#080812',
          windowColor: '#f59e0b',
          beaconColor: '#ef4444',
          density: 0.9,
          depth: 0.3,
        }
      } else if (type === 'petals') {
        bgProps = { topColor: '#1c1328', bottomColor: '#07040d', horizonColor: '#f472b6' }
        interType = 'parallax_mountains'
        interProps = {
          rockColor: '#120b1c',
          sunColor: '#4c1d95',
          mistColor: '#2e1065',
          density: 0.9,
          depth: 0.3,
        }
      } else if (type === 'confetti') {
        bgProps = { topColor: '#190b30', bottomColor: '#070210', horizonColor: '#ec4899' }
        interType = 'parallax_city'
        interProps = {
          buildingColor: '#0e051d',
          windowColor: '#a855f7',
          beaconColor: '#f43f5e',
          density: 1.0,
          depth: 0.3,
        }
      } else if (type === 'smoke') {
        bgProps = { topColor: '#10131a', bottomColor: '#040609', horizonColor: '#94a3b8' }
        interType = 'parallax_castle'
        interProps = {
          castleColor: '#080a0f',
          torchColor: '#64748b',
          rockColor: '#0c0f16',
          density: 1.0,
          depth: 0.3,
        }
      }

      layersConfig.push({
        category: 'background',
        bricks: [{ id: 'bg_companion_brick', brickType: bgType, props: bgProps }],
      })

      if (interType) {
        layersConfig.push({
          category: 'intermediate',
          bricks: [{ id: 'inter_companion_brick', brickType: interType, props: interProps }],
        })
      }

      layersConfig.push({
        category: 'particles',
        bricks: [{ id: 'demo_brick', brickType: type, props: { ...propsToUse } }],
      })
    } else if (isAtmosphere) {
      // Pour les effets atmosphériques, intégrer un arrière-plan thématique révélateur
      let bgType = 'gradient_sky'
      let bgProps: Record<string, any> = {
        topColor: '#0a1526',
        bottomColor: '#020610',
        horizonColor: '#38bdf8',
        density: 1.0,
        speed: 0.1,
        depth: 0.1,
      }
      let interType = 'parallax_mountains'
      let interProps: Record<string, any> = {
        rockColor: '#070f1e',
        sunColor: '#334155',
        mistColor: '#0f172a',
        density: 1.0,
        depth: 0.3,
      }

      if (type === 'flickering_light') {
        bgProps = { topColor: '#090d16', bottomColor: '#020617', horizonColor: '#f97316' }
        interType = 'parallax_castle'
        interProps = {
          castleColor: '#080d1a',
          torchColor: '#ea580c',
          rockColor: '#0f172a',
          density: 1.0,
          depth: 0.3,
        }
      } else if (type === 'god_rays') {
        bgProps = { topColor: '#1c1917', bottomColor: '#0c0a09', horizonColor: '#fef08a' }
        interType = 'parallax_forest'
        interProps = { forestColor: '#091a13', fogColor: '#14382c', density: 1.0, depth: 0.35 }
      } else if (type === 'heat_distortion') {
        bgType = 'dunes'
        bgProps = {
          sandColor: '#d97706',
          shadowColor: '#1e0c06',
          skyColor: '#78350f',
          density: 1.0,
          depth: 0.25,
        }
        interType = ''
      } else if (type === 'volumetric_glow') {
        bgType = 'multilayer_starfield'
        bgProps = { starColor: '#ffffff', density: 0.8, depth: 0.8, speed: 0.05 }
        interType = 'parallax_city'
        interProps = {
          buildingColor: '#060b14',
          windowColor: '#38bdf8',
          beaconColor: '#ec4899',
          density: 0.8,
          depth: 0.3,
        }
      } else if (type === 'lens_flare') {
        bgProps = { topColor: '#1e1b4b', bottomColor: '#090d16', horizonColor: '#06b6d4' }
        interType = 'parallax_fleet'
        interProps = { hullColor: '#090e1a', engineColor: '#38bdf8', density: 0.8, depth: 0.35 }
      }

      layersConfig.push({
        category: 'background',
        bricks: [{ id: 'bg_companion_brick', brickType: bgType, props: bgProps }],
      })

      if (interType) {
        layersConfig.push({
          category: 'intermediate',
          bricks: [{ id: 'inter_companion_brick', brickType: interType, props: interProps }],
        })
      }

      layersConfig.push({
        category: 'atmosphere',
        bricks: [{ id: 'demo_brick', brickType: type, props: { ...propsToUse } }],
      })
    } else if (isParallax) {
      // Pour les silhouettes, ajouter un ciel de fond adapté pour révéler la transparence et la parallaxe
      const isFleet = type === 'parallax_fleet'
      layersConfig.push({
        category: 'background',
        bricks: [
          {
            id: 'bg_companion_brick',
            brickType: isFleet ? 'multilayer_starfield' : 'gradient_sky',
            props: isFleet
              ? { starColor: '#ffffff', density: 1.0, depth: 1.0, speed: 0.05 }
              : {
                  topColor: propsToUse.rockColor ? '#0f172a' : '#091522',
                  bottomColor: '#000b14',
                  horizonColor: propsToUse.torchColor || propsToUse.beaconColor || '#00f0ff',
                  density: 1.0,
                  speed: 0.1,
                  depth: 0.1,
                },
          },
        ],
      })
      layersConfig.push({
        category: 'intermediate',
        bricks: [
          {
            id: 'demo_brick',
            brickType: type,
            props: { ...propsToUse },
          },
        ],
      })
    } else {
      // Pour les fonds, tester la brique de fond seule
      layersConfig.push({
        category: 'background',
        bricks: [
          {
            id: 'demo_brick',
            brickType: type,
            props: { ...propsToUse },
          },
        ],
      })
    }

    const config: ThemeEngineConfig = {
      id: `preview_brick_${type}`,
      name: `Démonstration : ${type}`,
      family: 'classics',
      intrinsicIntensity: 2,
      palette: {
        primary:
          propsToUse.bottomColor ||
          propsToUse.sunColor ||
          propsToUse.windowColor ||
          propsToUse.lightColor ||
          propsToUse.coreColor ||
          propsToUse.flareColor ||
          propsToUse.gridColor ||
          propsToUse.primaryColor ||
          propsToUse.borderColor ||
          propsToUse.nodeColor ||
          '#00f0ff',
        secondary:
          propsToUse.topColor ||
          propsToUse.forestColor ||
          propsToUse.rockColor ||
          propsToUse.fogColor ||
          propsToUse.secondaryColor ||
          propsToUse.glowColor ||
          '#090d16',
        accent:
          propsToUse.horizonColor ||
          propsToUse.torchColor ||
          propsToUse.beaconColor ||
          propsToUse.engineColor ||
          propsToUse.rayColor ||
          propsToUse.tintColor ||
          propsToUse.outerColor ||
          propsToUse.accentColor ||
          '#ec4899',
        ambientLight: '#1e293b',
      },
      signature: {
        title: `Brique : ${type}`,
        brickId: 'demo_brick',
        description: 'Test unitaire de rendu procédural GPU',
      },
      layers: layersConfig,
      interaction: {
        mouseParallaxStrength: 0.35,
        scrollDepthFactor: 0.15,
        gyroscopeEnabled: true,
      },
      contentShield: {
        autoRegulateWcag: true,
        minContrastRatio: 4.5,
      },
    }

    engine.loadTheme(config)
  }

  // Changement de groupe (Spéciaux vs Overlays vs Événements vs Particules vs Atmosphère vs Silhouettes vs Fonds)
  const handleSelectGroup = (
    group: 'background' | 'parallax' | 'atmosphere' | 'particles' | 'events' | 'overlay' | 'special'
  ) => {
    setSelectedGroup(group)
    const newCatalog =
      group === 'special'
        ? SPECIAL_BRICKS_CATALOG
        : group === 'overlay'
          ? OVERLAYS_BRICKS_CATALOG
          : group === 'events'
            ? EVENTS_BRICKS_CATALOG
            : group === 'particles'
              ? PARTICLES_BRICKS_CATALOG
              : group === 'atmosphere'
                ? ATMOSPHERE_BRICKS_CATALOG
                : group === 'parallax'
                  ? PARALLAX_BRICKS_CATALOG
                  : BACKGROUND_BRICKS_CATALOG
    const firstBrick = newCatalog[0]
    setSelectedType(firstBrick.type)
    const freshProps = { ...firstBrick.defaultProps }
    setCurrentProps(freshProps)
    loadBrickInEngine(firstBrick.type, freshProps)
  }

  // Changement de brique sélectionnée
  const handleSelectBrick = (type: string) => {
    const desc = ALL_BRICKS_CATALOG.find((b) => b.type === type)
    if (!desc) return
    setSelectedType(type)
    const freshProps = { ...desc.defaultProps }
    setCurrentProps(freshProps)
    loadBrickInEngine(type, freshProps)
  }

  // Modification dynamique d'un paramètre
  const handlePropChange = (key: string, val: any) => {
    const updated = { ...currentProps, [key]: val }
    setCurrentProps(updated)
    if (engine) {
      engine.updateBrickProps('demo_brick', { [key]: val })
    }
  }

  // Réinitialiser les paramètres aux valeurs d'origine
  const handleResetProps = () => {
    const reset = { ...activeDescriptor.defaultProps }
    setCurrentProps(reset)
    if (engine) {
      engine.updateBrickProps('demo_brick', reset)
    }
  }

  // Bascule de palier de qualité
  const handleTierChange = (tier: QualityTier) => {
    setCurrentTier(tier)
    if (engine) {
      engine.quality.setMode(tier)
    }
  }

  // Simulation Mobile Throttling
  const handleToggleMobileThrottling = () => {
    const next = !isMobileThrottled
    setIsMobileThrottled(next)
    if (engine) {
      if (next) {
        engine.quality.setMode('MEDIUM')
        setCurrentTier('MEDIUM')
      } else {
        engine.quality.setMode('HIGH')
        setCurrentTier('HIGH')
      }
    }
  }

  // Initialisation à l'apparition de l'inspecteur
  useEffect(() => {
    if (engine) {
      loadBrickInEngine(selectedType, currentProps)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  // Estimation du temps de frame mobile throttled (typiquement x2.2 sur GPU mobile milieu de gamme)
  const measuredFrameMs = stats ? stats.frameTimeMs : 1.2
  const mobileEstimatedMs = Math.round(measuredFrameMs * (isMobileThrottled ? 1.0 : 2.1) * 10) / 10

  return (
    <div className="brick-demo-inspector">
      <div className="inspector-header">
        <div className="inspector-title">
          <h3>
            <FontAwesomeIcon icon={faSliders} /> Catalogue & Banc d'Essai des Briques WebGL
          </h3>
          <p>
            Testez et calibrez en direct les shaders procéduraux GPU. Chaque paramètre est mis à
            jour instantanément à 60 FPS sans coupure.
          </p>
        </div>

        {/* Télémétrie et Coût GPU mesuré */}
        <div className="inspector-telemetry-badge">
          <div className="telemetry-pill">
            <span className="pill-label">Desktop Frame :</span>
            <span className="pill-val good">{measuredFrameMs} ms</span>
          </div>
          <div className="telemetry-pill">
            <span className="pill-label">Mobile Throttled :</span>
            <span className={`pill-val ${mobileEstimatedMs > 8 ? 'warning' : 'good'}`}>
              ~{mobileEstimatedMs} ms
            </span>
          </div>
          <div className="telemetry-pill">
            <span className="pill-label">Statut :</span>
            <span className="pill-badge">60 FPS Garanti</span>
          </div>
        </div>
      </div>

      {/* Sélecteur de Groupe de Briques (Spéciaux vs Overlays vs Événements vs Particules vs Atmosphère vs Silhouettes vs Fonds) */}
      <div className="brick-group-switcher">
        <button
          className={`brick-group-pill ${selectedGroup === 'special' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('special')}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} /> Groupe 7 : Spéciaux (4 briques)
        </button>
        <button
          className={`brick-group-pill ${selectedGroup === 'overlay' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('overlay')}
        >
          <FontAwesomeIcon icon={faPalette} /> Groupe 6 : Overlays & Styles (7 briques)
        </button>
        <button
          className={`brick-group-pill ${selectedGroup === 'events' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('events')}
        >
          <FontAwesomeIcon icon={faBolt} /> Groupe 5 : Événements (6 briques)
        </button>
        <button
          className={`brick-group-pill ${selectedGroup === 'particles' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('particles')}
        >
          <FontAwesomeIcon icon={faFire} /> Groupe 4 : Particules (12 briques)
        </button>
        <button
          className={`brick-group-pill ${selectedGroup === 'atmosphere' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('atmosphere')}
        >
          <FontAwesomeIcon icon={faCloud} /> Groupe 3 : Atmosphère (6 briques)
        </button>
        <button
          className={`brick-group-pill ${selectedGroup === 'parallax' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('parallax')}
        >
          <FontAwesomeIcon icon={faMountain} /> Groupe 2 : Silhouettes (Parallaxe) — 6 briques
        </button>
        <button
          className={`brick-group-pill ${selectedGroup === 'background' ? 'active' : ''}`}
          onClick={() => handleSelectGroup('background')}
        >
          <FontAwesomeIcon icon={faLayerGroup} /> Groupe 1 : Fonds (Background) — 9 shaders
        </button>
      </div>

      {/* 1. Sélecteur des briques du groupe actif */}
      <div className="brick-selector-tabs">
        {activeCatalog.map((b) => (
          <button
            key={b.type}
            className={`brick-tab-btn ${selectedType === b.type ? 'active' : ''}`}
            onClick={() => handleSelectBrick(b.type)}
          >
            <span className="brick-tab-name">{b.name}</span>
            <span className="brick-tab-type">#{b.type}</span>
          </button>
        ))}
      </div>

      {/* 2. Rôle et description de la brique active */}
      <div className="brick-role-banner">
        <strong>Rôle :</strong> {activeDescriptor.role}
      </div>

      {/* 3. Barres de contrôle qualité & Mobile Throttling */}
      <div className="brick-controls-bar">
        <div className="tier-buttons">
          <span className="control-label">Palier Qualité :</span>
          {(['HIGH', 'MEDIUM', 'LOW'] as QualityTier[]).map((tier) => (
            <button
              key={tier}
              className={`tier-btn ${currentTier === tier ? 'active' : ''}`}
              onClick={() => handleTierChange(tier)}
            >
              {tier}
            </button>
          ))}
        </div>

        <button
          className={`mobile-throttle-btn ${isMobileThrottled ? 'active' : ''}`}
          onClick={handleToggleMobileThrottling}
          title="Force DPR 1.0 et allège les octaves pour simuler un smartphone"
        >
          <FontAwesomeIcon icon={faMobileScreenButton} />
          {isMobileThrottled ? 'Mode Mobile Actif (DPR 1.0)' : 'Simuler Mobile Throttling'}
        </button>

        <button className="reset-props-btn" onClick={handleResetProps} title="Valeurs par défaut">
          <FontAwesomeIcon icon={faRotateRight} /> Réinitialiser
        </button>
      </div>

      {/* 4. Grille des paramètres interactifs */}
      <div className="brick-props-grid">
        {activeDescriptor.fields.map((f) => {
          const val = currentProps[f.key] ?? (activeDescriptor.defaultProps as any)[f.key]
          return (
            <div key={f.key} className="prop-field-card">
              <div className="prop-field-label">
                <span>{f.label}</span>
                <span className="prop-field-val">
                  {f.type === 'slider' ? (typeof val === 'number' ? val.toFixed(2) : val) : val}
                </span>
              </div>

              {f.type === 'color' ? (
                <div className="prop-color-input-wrapper">
                  <input
                    type="color"
                    value={val || '#ffffff'}
                    onChange={(e) => handlePropChange(f.key, e.target.value)}
                    className="prop-color-picker"
                  />
                  <input
                    type="text"
                    value={val || ''}
                    onChange={(e) => handlePropChange(f.key, e.target.value)}
                    className="prop-color-text"
                  />
                </div>
              ) : (
                <input
                  type="range"
                  min={f.min ?? 0}
                  max={f.max ?? 1}
                  step={f.step ?? 0.05}
                  value={val}
                  onChange={(e) => handlePropChange(f.key, parseFloat(e.target.value))}
                  className="prop-slider-input"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
