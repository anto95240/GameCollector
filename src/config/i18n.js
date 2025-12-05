import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./translations/fr.json";
import en from "./translations/en.json";

const resources = {
  fr,
  en,
};

const savedLanguage = localStorage.getItem("language") || "fr";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "fr",

    interpolation: {
      escapeValue: false
    }
  });

  export default i18n;