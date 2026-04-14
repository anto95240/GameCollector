import axios from "../../config/interceptor";

const getAllAchievements = async () => {
  const { data } = await axios.get("/api/achievements");
  return data;
};

const getUserAchievements = async () => {
  try {
    const { data } = await axios.get("/api/achievements/me");
    return data;
  } catch (error) {
    console.warn("[Achievement API] Impossible de récupérer achievements:", error.message);
    return [];
  }
};

const unlockAchievement = async (idName) => {
  const { data } = await axios.post(`/api/achievements/${idName}/unlock`);
  return data;
};

const achievementsApi = {
  getAllAchievements,
  getUserAchievements,
  unlockAchievement,
};

export const useApiAchievements = () => {
  return achievementsApi;
};
