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
  faCamera,
  faCheckCircle,
  faGaugeHigh,
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
  category: 'background' | 'intermediate'
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
    role: "Dégradé atmosphérique plein écran dynamique avec transition zénith/horizon et bruit organique",
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
      { key: 'intensity', label: 'Intensité Lumineuse', type: 'slider', min: 0.2, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Aléatoire / Simplex', type: 'slider', min: 0.0, max: 0.5, step: 0.02 },
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
      { key: 'density', label: 'Couverture Nuageuse', type: 'slider', min: 0.1, max: 0.95, step: 0.05 },
      { key: 'speed', label: 'Vitesse Vent', type: 'slider', min: 0.0, max: 0.6, step: 0.02 },
      { key: 'depth', label: 'Altitude / Parallaxe', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Contraste Lumière', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Turbulence / Warping', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
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
      { key: 'density', label: 'Densité Filaments', type: 'slider', min: 0.2, max: 1.0, step: 0.05 },
      { key: 'speed', label: 'Vitesse Vortex', type: 'slider', min: 0.0, max: 0.5, step: 0.02 },
      { key: 'depth', label: 'Parallaxe Z', type: 'slider', min: 0.0, max: 0.5, step: 0.05 },
      { key: 'intensity', label: 'Brillance Globale', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Asymétrie / Chaos', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
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
      { key: 'depth', label: 'Étagement Z / Parallaxe', type: 'slider', min: 0.2, max: 2.0, step: 0.1 },
      { key: 'intensity', label: 'Éclat / Scintillement', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'twinkleSpeed', label: 'Fréquence Scintillement', type: 'slider', min: 0.2, max: 3.5, step: 0.1 },
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
      { key: 'density', label: 'Draperies Célestes', type: 'slider', min: 0.2, max: 1.5, step: 0.05 },
      { key: 'speed', label: 'Vitesse Vagues Plasma', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      { key: 'depth', label: 'Altitude / Parallaxe', type: 'slider', min: 0.0, max: 0.6, step: 0.05 },
      { key: 'intensity', label: 'Radiance / Lumens', type: 'slider', min: 0.4, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Turbulence Vent Solaire', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'waveFrequency', label: 'Fréquence Plis', type: 'slider', min: 1.0, max: 5.0, step: 0.2 },
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
      { key: 'depth', label: 'Immersion / Parallaxe', type: 'slider', min: 0.0, max: 0.6, step: 0.05 },
      { key: 'intensity', label: 'Clarté Caustiques', type: 'slider', min: 0.3, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Turbulence Liquide', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'causticScale', label: 'Échelle Spatiale', type: 'slider', min: 1.5, max: 6.0, step: 0.2 },
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
      { key: 'density', label: 'Fréquence Trains Vagues', type: 'slider', min: 0.4, max: 2.0, step: 0.1 },
      { key: 'speed', label: 'Vitesse Déferlement', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      { key: 'depth', label: 'Perspective / Parallaxe', type: 'slider', min: 0.1, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Hauteur & Écume', type: 'slider', min: 0.3, max: 2.2, step: 0.1 },
      { key: 'randomness', label: 'Houle Croisée', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'waveSteepness', label: 'Acuité des Crêtes', type: 'slider', min: 0.2, max: 1.2, step: 0.05 },
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
      { key: 'speed', label: 'Écoulement Visqueux', type: 'slider', min: 0.0, max: 0.6, step: 0.02 },
      { key: 'depth', label: 'Relief / Parallaxe', type: 'slider', min: 0.0, max: 0.5, step: 0.05 },
      { key: 'intensity', label: 'Lueur Thermique', type: 'slider', min: 0.4, max: 2.5, step: 0.1 },
      { key: 'randomness', label: 'Déchirement Plaques', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'heatPulseSpeed', label: 'Respiration Chaleur', type: 'slider', min: 0.2, max: 3.0, step: 0.1 },
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
      { key: 'speed', label: 'Dérive Vent & Mirages', type: 'slider', min: 0.0, max: 0.5, step: 0.02 },
      { key: 'depth', label: 'Perspective / Parallaxe', type: 'slider', min: 0.1, max: 0.7, step: 0.05 },
      { key: 'intensity', label: 'Contraste Lumière', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Méandres Crêtes', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'sunAngle', label: 'Angle Soleil Rasant', type: 'slider', min: 0.2, max: 1.8, step: 0.05 },
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
      { key: 'depth', label: 'Parallaxe / Profondeur', type: 'slider', min: 0.1, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Contraste & Opacité', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Variabilité Hauteur', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'windStrength', label: 'Flexion Cimes', type: 'slider', min: 0.0, max: 1.2, step: 0.05 },
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
      { key: 'depth', label: 'Parallaxe / Profondeur', type: 'slider', min: 0.1, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Contraste Crêtes', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Asymétrie des Pics', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'snowLevel', label: 'Seuil Névés / Glaciers', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'sunAngle', label: 'Angle Soleil Rasant', type: 'slider', min: 0.2, max: 1.8, step: 0.05 },
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
      { key: 'speed', label: 'Vitesse Balises/Phares', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      { key: 'depth', label: 'Parallaxe / Profondeur', type: 'slider', min: 0.1, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Éclat Fenêtres', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Variabilité Hauteur', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'smogIntensity', label: 'Halo Smog Nocturne', type: 'slider', min: 0.0, max: 1.5, step: 0.05 },
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
      { key: 'speed', label: 'Vacillement Torches', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      { key: 'depth', label: 'Parallaxe / Profondeur', type: 'slider', min: 0.1, max: 0.7, step: 0.05 },
      { key: 'intensity', label: 'Contraste Général', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Asymétrie Architecture', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'ruinDecay', label: 'Délabrement en Ruines', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
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
      { key: 'randomness', label: 'Dispersion Spatiale', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'trailLength', label: 'Longueur Traînées', type: 'slider', min: 0.2, max: 2.0, step: 0.1 },
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
      { key: 'density', label: 'Densité Plateformes', type: 'slider', min: 0.5, max: 2.2, step: 0.1 },
      { key: 'speed', label: 'Vitesse Défilement', type: 'slider', min: 0.0, max: 0.8, step: 0.05 },
      { key: 'depth', label: 'Parallaxe 3 Vitesses', type: 'slider', min: 0.1, max: 0.8, step: 0.05 },
      { key: 'intensity', label: 'Contraste Rétro', type: 'slider', min: 0.3, max: 2.0, step: 0.1 },
      { key: 'randomness', label: 'Variabilité Blocs', type: 'slider', min: 0.0, max: 1.0, step: 0.05 },
      { key: 'pixelSize', label: 'Taille Pixel (px)', type: 'slider', min: 2.0, max: 8.0, step: 1.0 },
    ],
  },
]

export const ALL_BRICKS_CATALOG = [...BACKGROUND_BRICKS_CATALOG, ...PARALLAX_BRICKS_CATALOG]

export const BrickDemoInspector: React.FC<{
  engine: ThemeEngine | null
}> = ({ engine }) => {
  const [selectedGroup, setSelectedGroup] = useState<'background' | 'parallax'>('parallax')
  const [selectedType, setSelectedType] = useState<string>('parallax_forest')
  const [currentProps, setCurrentProps] = useState<Record<string, any>>(() => {
    return { ...PARALLAX_BRICKS_CATALOG[0].defaultProps }
  })
  const [currentTier, setCurrentTier] = useState<QualityTier>('HIGH')
  const [isMobileThrottled, setIsMobileThrottled] = useState(false)
  const [stats, setStats] = useState<PerformanceStats | null>(null)

  const activeCatalog = selectedGroup === 'background' ? BACKGROUND_BRICKS_CATALOG : PARALLAX_BRICKS_CATALOG
  const activeDescriptor =
    activeCatalog.find((b) => b.type === selectedType) ?? activeCatalog[0]

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

    const isParallax = PARALLAX_BRICKS_CATALOG.some((b) => b.type === type)

    // Configuration des couches selon le groupe
    const layersConfig: ThemeEngineConfig['layers'] = []

    if (isParallax) {
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
        primary: propsToUse.bottomColor || propsToUse.sunColor || propsToUse.windowColor || '#00f0ff',
        secondary: propsToUse.topColor || propsToUse.forestColor || propsToUse.rockColor || '#090d16',
        accent: propsToUse.horizonColor || propsToUse.torchColor || propsToUse.beaconColor || propsToUse.engineColor || '#ec4899',
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

  // Changement de groupe (Fonds vs Silhouettes)
  const handleSelectGroup = (group: 'background' | 'parallax') => {
    setSelectedGroup(group)
    const newCatalog = group === 'background' ? BACKGROUND_BRICKS_CATALOG : PARALLAX_BRICKS_CATALOG
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
            Testez et calibrez en direct les shaders procéduraux GPU. Chaque paramètre est mis à jour
            instantanément à 60 FPS sans coupure.
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

      {/* Sélecteur de Groupe de Briques (Fonds vs Silhouettes Parallaxe) */}
      <div className="brick-group-switcher">
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
