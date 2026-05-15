import { faUser } from "@fortawesome/free-solid-svg-icons";
import AuthInput from "../../common/AuthInput";
import "@/screens/Register/Register.css";

const SignUpPart1 = ({ data, update, t }) => {
  return (
    <div className="step-form-anim">
      <AuthInput
        name="firstname"
        placeholder={t("auth.register.firstName")}
        value={data.firstname}
        onChange={update}
        icon={faUser}
        required={true}
      />
      
      <AuthInput
        name="lastname"
        placeholder={t("auth.register.name")}
        value={data.lastname}
        onChange={update}
        icon={faUser}
        required={true}
      />
    </div>
  );
};

export default SignUpPart1;