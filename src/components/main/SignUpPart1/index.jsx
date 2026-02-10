import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import "../../../screens/Register/Register.css";

const SignUpPart1 = ({ data, update, t }) => {
  
  return (
    <div className="step-form-anim">
      <div className="input-group mb-4">
        <input
          type="text"
          name="firstname"
          placeholder={t('auth.register.firstName')}
          value={data.firstname}
          onChange={update}
          className="auth-input"
          required
        />
        <FontAwesomeIcon icon={faUser} className="input-icon" />
      </div>
      <div className="input-group">
        <input
          type="text"
          name="lastname"
          placeholder={t('auth.register.name')}
          value={data.lastname}
          onChange={update}
          className="auth-input"
          required
        />
        <FontAwesomeIcon icon={faUser} className="input-icon" />
      </div>
    </div>
  );
};

export default SignUpPart1;