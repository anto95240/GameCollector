import { faUser, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import AuthInput from "../../common/AuthInput";
import "@/screens/Register/Register.css";

const SignUpPart2 = ({ data, update, t }) => (
  <div className="step-form-anim">
    <AuthInput
      name="username"
      placeholder={t("auth.register.username")}
      value={data.username}
      onChange={update}
      icon={faUser}
      required={true}
    />

    <AuthInput
      type="email"
      name="email"
      placeholder={t("auth.register.email")}
      value={data.email}
      onChange={update}
      icon={faEnvelope}
      required={true}
    />
  </div>
);

export default SignUpPart2;