import "./LoadingButton.css";
import ChargementPage from "../../../screens/Chargement";

const LoadingButton = ({
  text,
  onClick,
  isAnimating,
  showLoading,
  disabled = false,
  type = "submit",
  variant = "primary", // "primary", "secondary", "danger", "cyber"
  className = "",
}) => {
  return (
    <div className={`button-wrapper ${className}`}>
      <button
        type={type}
        onClick={onClick}
        className={`base-button btn-${variant} ${isAnimating ? "is-loading" : ""}`}
        disabled={disabled || isAnimating}
      >
        {isAnimating ? <span className="loader-circle"></span> : text}
      </button>

      {showLoading && (
        <div className={`layer-overlay ${isAnimating ? "visible" : ""}`}>
          <ChargementPage />
        </div>
      )}
    </div>
  );
};

export default LoadingButton;
