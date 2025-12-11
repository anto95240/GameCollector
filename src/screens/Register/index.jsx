import { useNavigate } from "react-router"; 
// import { useState, useEffect } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
// import axios from "axios"
import SignUpPart1 from "../../components/main/SignUpPart1";
import SignUpPart2 from "../../components/main/SignUpPart2";

const RegisterPage = () => {
  const [step, setStep] = useState(1); // étape actuelle
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [showLoading, setShowLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // const loginToken = sessionStorage.getItem("loginToken");
  // const API_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const [badLogin, setBadLogin] = useState(false);
  const [badPassword, setBadPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  //-------- Auth avec back --------//
  // async function handleSubmit() {

  //   const {
  //     firstname, 
  //     lastname,
  //     username,
  //     email,
  //     password,
  //     passwordConfirm,
  //   } = formData;

  //   setErrorMsg("");

  //   const registerData = {
  //     firstname: firstname.trim(),
  //     lastname: lastname.trim(),
  //     username: username.trim(),
  //     email: email.trim(),
  //     password,
  //     passwordConfirm,
  //   };

  //   setLoading(true);

  //   try {
  //     const { data } = await axios.post(`${API_URL}/api/user/sign-up`, registerData);

  //     sessionStorage.setItem("loginToken", data.token);
  //         // Lancer animation
  //         setIsAnimating(true);

  //         setTimeout(() => {
  //            setShowLoading(true);     
  //         }, 300);

  //     setFormData({
  //       firstname: "",
  //       lastname: "",
  //       username: "",
  //       email: "",
  //       password: "",
  //       passwordConfirm: "",
  //     });

  //   } catch (error) {
  //     if (error.response?.data?.message) {
  //       setErrorMsg(error.response.data.message);
  //     } else {
  //       setErrorMsg(t('ErrorMsg.errorNetwork'));
  //     }
  //   }

  //   setLoading(false);
  // }
    
  // useEffect(() => {
  //     if (loginToken) {
  //         navigate("/loading");
  //     }
  // }, [loginToken, navigate]);


  //-------- Auth sans back --------//
  const handleSubmit = () => {

    const { email, password } = formData;

    if (!email || !password) {
        setErrorMsg(t('ErrorMsg.errorNetwork'));
        return;
    }

    // Lancer animation
    setIsAnimating(true);

    setTimeout(() => {
        setShowLoading(true);     
    }, 300);
  };

  return (
    <div>
      {step === 1 && (
        <SignUpPart1
          formData={formData}
          setFormData={setFormData}
          nextStep={nextStep}
          badLogin={badLogin}
          setBadLogin={setBadLogin}
          t={t}
        />
      )}
      {step === 2 && (
        <SignUpPart2
          formData={formData}
          setFormData={setFormData}
          prevStep={prevStep}
          handleSubmit={handleSubmit} // Ici le submit final
          badPassword={badPassword}
          setBadPassword={setBadPassword}
          errorMsg={errorMsg}
          setErrorMsg={setErrorMsg}
          successMsg={successMsg}
          isAnimating={isAnimating}
          showLoading={showLoading}
          t={t}
        />
      )}
    </div>
  );
};

export default RegisterPage;
