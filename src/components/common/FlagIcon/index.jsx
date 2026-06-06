/**
 * FlagIcon — composant léger remplaçant react-world-flags (3.7 MB → ~1 kB)
 * Seuls les drapeaux FR et GB sont utilisés dans l'application.
 * SVG inline : zéro dépendance, zéro bundle overhead, rendu instantané.
 */

const FLAGS = {
  FR: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 900 600"
      aria-label="Drapeau français"
      role="img"
    >
      <rect width="900" height="600" fill="#ED2939" />
      <rect width="600" height="600" fill="#fff" />
      <rect width="300" height="600" fill="#002395" />
    </svg>
  ),
  GB: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 30"
      aria-label="United Kingdom flag"
      role="img"
    >
      <clipPath id="gb-clip">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#gb-clip)" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  ),
};

/**
 * @param {{ code: string, className?: string, style?: React.CSSProperties }} props
 * `code` doit être un code ISO 3166-1 alpha-2 majuscule (ex: "FR", "GB").
 * Les codes non supportés affichent un carré gris neutre en fallback.
 */
const FlagIcon = ({ code, className, style }) => {
  const svg = FLAGS[code?.toUpperCase()];

  if (!svg) {
    // Fallback visuel pour tout code inconnu — évite un rendu cassé
    return (
      <span
        className={className}
        style={{
          display: "inline-block",
          background: "#444",
          borderRadius: 2,
          ...style,
        }}
        aria-label={`Flag: ${code}`}
        role="img"
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: 2,
        ...style,
      }}
    >
      {svg}
    </span>
  );
};

export default FlagIcon;
