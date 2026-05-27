import "./Chargement.css";

import { useNavigate } from "react-router";

import { useLoadingAnimation } from "@/hooks/ui/useLoadingAnimation";
import BackgroundBlobs from "@/screens/Chargement/modules/BackgroundBlobs";
import LoadingContent from "@/screens/Chargement/modules/LoadingContent";
import LoadingVariants from "@/screens/Chargement/modules/LoadingVariants";
import Particles from "@/screens/Chargement/modules/Particles";
import ProgressBar from "@/screens/Chargement/modules/ProgressBar";
import Spinner from "@/screens/Chargement/modules/Spinner";
import StatusMessage from "@/screens/Chargement/modules/StatusMessage";

const ChargementPage = ({ variant = "login", returnTo = null }) => {
  const navigate = useNavigate();
  const { progress } = useLoadingAnimation(variant, navigate, returnTo);
  const isLogout = variant === "logout";

  const loadingContent = (
    <LoadingVariants isLogout={isLogout}>
      <BackgroundBlobs />
      
      <LoadingContent>
        <Spinner isLogout={isLogout} />
        <ProgressBar progress={progress} />
        <StatusMessage isLogout={isLogout} />
      </LoadingContent>

      <Particles />
    </LoadingVariants>
  );

  return loadingContent;
};

export default ChargementPage;