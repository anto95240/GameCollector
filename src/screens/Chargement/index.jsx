import { useNavigate } from "react-router";
import { useLoadingAnimation } from "../../hooks/ui/useLoadingAnimation";
import LoadingVariants from "./modules/LoadingVariants";
import BackgroundBlobs from "./modules/BackgroundBlobs";
import LoadingContent from "./modules/LoadingContent";
import Spinner from "./modules/Spinner";
import ProgressBar from "./modules/ProgressBar";
import StatusMessage from "./modules/StatusMessage";
import Particles from "./modules/Particles";
import "./Chargement.css";

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