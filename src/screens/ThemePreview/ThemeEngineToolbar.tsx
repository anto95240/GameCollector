/**
 * src/screens/ThemePreview/ThemeEngineToolbar.tsx
 *
 * Barre d'outils et banc d'essai pour le moteur d'animation de thèmes.
 * Affiche la télémétrie FPS, le sélecteur de palier de qualité,
 * le curseur temporel (Play/Pause/Vitesse), le déclencheur d'événement rare,
 * et l'outil de capture PNG (instantanée ou 3 moments).
 */

import {
  faBolt,
  faCamera,
  faMicrochip,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'

import type { PerformanceStats, QualityMode } from '@/theme-engine/core/QualityController'
import { useThemeEngineVersion } from '@/theme-engine/featureFlag'
import { useActiveThemeEngine } from '@/theme-engine/ThemeEngineContext'

export const ThemeEngineToolbar: React.FC<{
  onSelectTestTheme: () => void
}> = ({ onSelectTestTheme }) => {
  const engine = useActiveThemeEngine()
  const [engineVersion, setEngineVersion] = useThemeEngineVersion()

  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [qualityMode, setQualityMode] = useState<QualityMode>('AUTO')
  const [isPaused, setIsPaused] = useState(false)
  const [timeScale, setTimeScale] = useState(1.0)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [threeCaptures, setThreeCaptures] = useState<string[]>([])
  const [isCapturing3, setIsCapturing3] = useState(false)

  // Écoute de la télémétrie du moteur V2
  useEffect(() => {
    if (!engine) {
      setStats(null)
      return
    }

    const unsubscribe = engine.quality.subscribe((_tier, newStats) => {
      setStats(newStats)
    })

    const interval = setInterval(() => {
      if (engine) {
        setStats(engine.quality.getStats())
      }
    }, 250)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [engine])

  const handleQualityChange = (mode: QualityMode) => {
    setQualityMode(mode)
    if (engine) {
      engine.quality.setMode(mode)
    }
  }

  const handleTogglePause = () => {
    if (!engine) return
    const next = !isPaused
    setIsPaused(next)
    engine.setPaused(next)
  }

  const handleTimeScaleChange = (val: number) => {
    setTimeScale(val)
    if (engine) {
      engine.setTimeScale(val)
    }
  }

  const handleCapture = () => {
    if (!engine) return
    const dataUrl = engine.captureFrame()
    setCapturedImage(dataUrl)
  }

  const handleAudit3Captures = () => {
    if (!engine || isCapturing3) return
    setIsCapturing3(true)
    setThreeCaptures([])

    const captures: string[] = []
    // Capture 1 immédiate
    captures.push(engine.captureFrame())
    setThreeCaptures([...captures])

    // Capture 2 à 2.5s
    setTimeout(() => {
      if (engine) {
        captures.push(engine.captureFrame())
        setThreeCaptures([...captures])
      }
    }, 2500)

    // Capture 3 à 6.0s
    setTimeout(() => {
      if (engine) {
        captures.push(engine.captureFrame())
        setThreeCaptures([...captures])
        setIsCapturing3(false)
      }
    }, 6000)
  }

  const handleTriggerRareEvent = () => {
    if (engine) {
      engine.rareEvents.triggerManually('cosmic_pulse')
    }
  }

  return (
    <div className="theme-engine-toolbar">
      {/* 1. Sélecteur de Moteur (Flag V1 vs V2) */}
      <div className="toolbar-section engine-toggle">
        <span className="toolbar-label">Moteur :</span>
        <button
          className={`toolbar-btn ${engineVersion === 'v1' ? 'active' : ''}`}
          onClick={() => setEngineVersion('v1')}
        >
          V1 (Canvas 2D)
        </button>
        <button
          className={`toolbar-btn ${engineVersion === 'v2' ? 'active' : ''}`}
          onClick={() => setEngineVersion('v2')}
        >
          V2 (Three.js WebGL)
        </button>
        {engineVersion === 'v2' && (
          <button className="toolbar-btn test-theme-btn" onClick={onSelectTestTheme}>
            🧪 Charger Thème Test V2
          </button>
        )}
      </div>

      {engineVersion === 'v2' && (
        <>
          {/* 2. Télémétrie FPS */}
          <div className="toolbar-section telemetry">
            <div className="telemetry-item">
              <span className="telemetry-label">FPS :</span>
              <span
                className={`telemetry-val ${
                  (stats?.fps ?? 0) >= 50
                    ? 'good'
                    : (stats?.fps ?? 0) >= 30
                      ? 'warning'
                      : 'bad'
                }`}
              >
                {stats ? stats.fps : '--'}
              </span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Frame :</span>
              <span className="telemetry-val">{stats ? `${stats.frameTimeMs} ms` : '--'}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">DPR :</span>
              <span className="telemetry-val">{stats ? `${stats.effectiveDpr}x` : '1.0x'}</span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">Palier :</span>
              <span className="telemetry-badge">{stats ? stats.tier : 'HIGH'}</span>
            </div>
          </div>

          {/* 3. Sélecteur de Palier de Qualité */}
          <div className="toolbar-section quality-selector">
            <span className="toolbar-label">
              <FontAwesomeIcon icon={faMicrochip} /> Qualité :
            </span>
            {(['AUTO', 'HIGH', 'MEDIUM', 'LOW'] as QualityMode[]).map((mode) => (
              <button
                key={mode}
                className={`toolbar-btn small ${qualityMode === mode ? 'active' : ''}`}
                onClick={() => handleQualityChange(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* 4. Curseur de Temps & Contrôles */}
          <div className="toolbar-section time-controls">
            <button
              className={`toolbar-btn icon ${isPaused ? 'paused' : ''}`}
              onClick={handleTogglePause}
              title={isPaused ? 'Reprendre' : 'Mettre en pause'}
            >
              <FontAwesomeIcon icon={isPaused ? faPlay : faPause} />
            </button>
            <span className="toolbar-label">Vitesse :</span>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.25"
              value={timeScale}
              onChange={(e) => handleTimeScaleChange(parseFloat(e.target.value))}
              className="toolbar-slider"
            />
            <span className="slider-value">{timeScale.toFixed(2)}x</span>
            <button
              className="toolbar-btn small"
              onClick={() => handleTimeScaleChange(1.0)}
              disabled={timeScale === 1.0}
            >
              1x
            </button>
          </div>

          {/* 5. Événement Rare & Capture */}
          <div className="toolbar-section actions">
            <button
              className="toolbar-btn action-event"
              onClick={handleTriggerRareEvent}
              title="Déclencher un événement rare immédiatement"
            >
              <FontAwesomeIcon icon={faBolt} /> Événement Rare
            </button>
            <button className="toolbar-btn action-snap" onClick={handleCapture}>
              <FontAwesomeIcon icon={faCamera} /> Capture
            </button>
            <button
              className="toolbar-btn action-audit"
              onClick={handleAudit3Captures}
              disabled={isCapturing3}
            >
              {isCapturing3 ? 'Audit en cours...' : 'Règle 3 Captures'}
            </button>
          </div>
        </>
      )}

      {/* Modal / Aperçu de la Capture Unique */}
      {capturedImage && (
        <div className="capture-preview-modal" onClick={() => setCapturedImage(null)}>
          <div className="capture-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="capture-modal-header">
              <h3>📸 Capture d'Écran Canvas V2</h3>
              <button className="close-btn" onClick={() => setCapturedImage(null)}>
                ✕
              </button>
            </div>
            <img src={capturedImage} alt="Capture Theme" className="captured-img" />
            <div className="capture-modal-footer">
              <a
                href={capturedImage}
                download="theme-preview-v2.png"
                className="toolbar-btn active"
              >
                Télécharger PNG
              </a>
              <button className="toolbar-btn" onClick={() => setCapturedImage(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Audit 3 Captures */}
      {threeCaptures.length > 0 && (
        <div className="capture-preview-modal" onClick={() => setThreeCaptures([])}>
          <div className="capture-modal-content wide" onClick={(e) => e.stopPropagation()}>
            <div className="capture-modal-header">
              <h3>🎨 Audit Visuel — Règle des 3 Captures</h3>
              <button className="close-btn" onClick={() => setThreeCaptures([])}>
                ✕
              </button>
            </div>
            <p className="audit-subtitle">
              Comparaison à $t_1$, $t_2$ et $t_3$ pour vérifier la variété organique et l'absence de boucles répétitives :
            </p>
            <div className="three-captures-grid">
              {threeCaptures.map((url, idx) => (
                <div key={idx} className="audit-capture-card">
                  <span className="audit-time-badge">Capture #{idx + 1}</span>
                  <img src={url} alt={`Moment ${idx + 1}`} className="audit-img" />
                </div>
              ))}
            </div>
            <div className="capture-modal-footer">
              <button className="toolbar-btn" onClick={() => setThreeCaptures([])}>
                Fermer l'audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
