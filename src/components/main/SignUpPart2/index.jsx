import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import "../../../screens/Register/Register.css";

const SignUpPart2 = ({ data, update, t }) => (
  <div className="step-form-anim">
    <div className="input-group mb-4">
      <input
        type="text"
        name="username"
        placeholder={t("auth.register.username")}
        value={data.username}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faUser} className="input-icon" />
    </div>
    <div className="input-group">
      <input
        type="email"
        name="email"
        placeholder={t("auth.register.email")}
        value={data.email}
        onChange={update}
        className="auth-input"
        required
      />
      <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
    </div>
  </div>
);

export default SignUpPart2;
