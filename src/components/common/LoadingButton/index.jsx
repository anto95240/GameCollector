import "./loadingButton.css";
import ChargementPage from "../../../screens/Chargement";

const LoadingButton = ({ 
    text, 
    onClick, 
    isAnimating, 
    showLoading, 
    disabled = false, 
    type = "submit" 
}) => {
    return (
        <div className="toplayer flex justify-center items-center">
            <button
                type={type}
                onClick={onClick}
                className={`submit-button text-center cursor-pointer flex justify-center items-center m-auto ${isAnimating ? "loading-btn clicked" : ""}`}
                disabled={disabled || isAnimating}
            >
                {isAnimating ? <span className="loader-circle"></span> : text}
            </button>

            <div className={`layer flex items-center justify-center flex-col ${isAnimating ? "clicked" : ""}`}>
                {showLoading && <ChargementPage />}
            </div>
        </div>
    );
};

export default LoadingButton;