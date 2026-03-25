import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "./AuthInput.css";

const AuthInput = ({
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  isPassword = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      setTimeout(() => {
        if (containerRef.current && textRef.current) {
          const cw = containerRef.current.clientWidth;
          const sw = textRef.current.scrollWidth;
          if (sw > cw) {
            setIsOverflowing(true);
            textRef.current.style.setProperty("--scroll-amount", `-${sw - cw}px`);
          } else {
            setIsOverflowing(false);
          }
        }
      }, 100);
    };

    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) observer.observe(containerRef.current);
    
    checkOverflow();

    return () => observer.disconnect();
  }, [placeholder, value]);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="input-group">
      <input
        type={inputType}
        name={name}
        placeholder=" "
        value={value}
        onChange={onChange}
        className="auth-input"
        required={required}
      />
      {icon && <FontAwesomeIcon icon={icon} className="input-icon" />}

      {/* Faux placeholder animé */}
      <div className="auth-label-container" ref={containerRef}>
        <span
          className={`auth-label-text ${isOverflowing ? "scrolling" : ""}`}
          ref={textRef}
        >
          {placeholder}
        </span>
      </div>

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="password-toggle-btn"
          style={{ zIndex: 10 }}
        >
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
        </button>
      )}
    </div>
  );
};

export default AuthInput;