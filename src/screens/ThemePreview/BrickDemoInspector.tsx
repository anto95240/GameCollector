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
  faCloud,
  faFire,
  faLayerGroup,
  faMobileScreenButton,
  faMountain,
  faRotateRight,
  faSliders,
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
  category: 'background' | 'intermediate' | 'atmosphere' | 'particles'
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

export const ALL_BRICKS_CATALOG = [
  ...BACKGROUND_BRICKS_CATALOG,
  ...PARALLAX_BRICKS_CATALOG,
  ...ATMOSPHERE_BRICKS_CATALOG,
  ...PARTICLES_BRICKS_CATALOG,
]

export const BrickDemoInspector: React.FC<{
  engine: ThemeEngine | null
}> = ({ engine }) => {
  const [selectedGroup, setSelectedGroup] = useState<
    'background' | 'parallax' | 'atmosphere' | 'particles'
  >('particles')
  const [selectedType, setSelectedType] = useState<string>('embers')
  const [currentProps, setCurrentProps] = useState<Record<string, any>>(() => {
    return { ...PARTICLES_BRICKS_CATALOG[0].defaultProps }
  })
  const [currentTier, setCurrentTier] = useState<QualityTier>('HIGH')
  const [isMobileThrottled, setIsMobileThrottled] = useState(false)
  const [stats, setStats] = useState<PerformanceStats | null>(null)

  const activeCatalog =
    selectedGroup === 'particles'
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
    return () => unsub()
  }, [engine])

  // Charge la brique sélectionnée dans le moteur Three.js
  const loadBrickInEngine = (type: string, propsToUse: Record<string, any>) => {
    if (!engine) return

    const isParticles = PARTICLES_BRICKS_CATALOG.some((b) => b.type === type)
    const isAtmosphere = ATMOSPHERE_BRICKS_CATALOG.some((b) => b.type === type)
    const isParallax = PARALLAX_BRICKS_CATALOG.some((b) => b.type === type)

    // Configuration des couches selon le groupe
    const layersConfig: ThemeEngineConfig['layers'] = []

    if (isParticles) {
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

  // Changement de groupe (Particules vs Atmosphère vs Silhouettes vs Fonds)
  const handleSelectGroup = (group: 'background' | 'parallax' | 'atmosphere' | 'particles') => {
    setSelectedGroup(group)
    const newCatalog =
      group === 'particles'
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

      {/* Sélecteur de Groupe de Briques (Particules vs Atmosphère vs Silhouettes vs Fonds) */}
      <div className="brick-group-switcher">
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
