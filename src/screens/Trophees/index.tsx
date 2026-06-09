import "./Trophees.css";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiAchievements } from "@/hooks/api/useApiAchievements";
import SkeletonText from "@/components/common/Skeleton/SkeletonText";
import { triggerAchievementCheck } from "@/services/achievementService";

const extractAchievementIdName = (entry: any) => {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (entry.id_name) return entry.id_name;
  if (entry.achievement?.id_name) return entry.achievement.id_name;
  if (typeof entry.achievement === "string") return entry.achievement;
  return null;
};

const TropheesPage = () => {
  const { t } = useTranslation();
  const { getAllAchievements, getUserAchievements } = useApiAchievements();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        // Charger les achievements depuis l'API (BDD)
        const [allAchievementData, unlockedData] = await Promise.all([
          getAllAchievements(),
          getUserAchievements(),
          new Promise(resolve => setTimeout(resolve, 800))
        ]);
        const achievements = Array.isArray(allAchievementData) ? allAchievementData : allAchievementData?.data || [];
        setAchievements(achievements);

        const unlocked = Array.isArray(unlockedData) ? unlockedData : unlockedData?.data || [];
        setUnlockedAchievements(unlocked);

        setError(null);
      } catch (err: any) {
        console.error("Erreur lors du chargement des trophées:", err);
        setError(err.message);
        setAchievements([]);
        setUnlockedAchievements([]);
      } finally {
        setIsLoading(false);
      }
    };

    triggerAchievementCheck();
    loadAchievements();

    const handleAchievementUnlocked = () => {
      loadAchievements();
    };

    window.addEventListener('achievementUnlocked', handleAchievementUnlocked);

    return () => {
      window.removeEventListener('achievementUnlocked', handleAchievementUnlocked);
    };
  }, [getAllAchievements, getUserAchievements]);

  const appTrophiesWithState = useMemo(
    () => {
      const unlockedSet = new Set(
        unlockedAchievements
          .map(extractAchievementIdName)
          .filter(Boolean),
      );

      return achievements
        .map((trophy) => {
          // Vérifie si le trophée est débloqué en BDD, pas en localStorage
          const isUnlocked = unlockedSet.has(trophy.id_name);

          return {
            id: trophy._id || trophy.id_name,
            idName: trophy.id_name,
            icon: trophy.icon || "🏆",
            title: trophy.title || "Trophée",
            description: trophy.description || "",
            rarity: trophy.rarity || "bronze",
            isHidden: trophy.isHidden || false,
            tags: trophy.tags || [],
            unlocked: isUnlocked,
            createdAt: trophy.createdAt,
          };
        })
        .filter((trophy) => !trophy.isHidden || trophy.unlocked)
        .sort((a, b) => {
          if (a.unlocked === b.unlocked) {
            const rarityOrder = { bronze: 1, argent: 2, or: 3, platine: 4 };
            return (
              ((rarityOrder as any)[b.rarity] || 0) - ((rarityOrder as any)[a.rarity] || 0)
            );
          }
          return a.unlocked ? -1 : 1;
        });
    },
    [achievements, unlockedAchievements],
  );

  const totals = useMemo(
    () =>
      appTrophiesWithState.reduce(
        (acc, item) => {
          if (item.unlocked) acc.unlocked += 1;
          acc.total += 1;
          return acc;
        },
        { unlocked: 0, total: 0 },
      ),
    [appTrophiesWithState],
  );

  const completionRatio =
    totals.total > 0 ? Math.round((totals.unlocked / totals.total) * 100) : 0;

  return (
    <div className="trophees-page">
      <header className="trophees-header">
        <h1>{t("trophies.title")}</h1>
        <p>{t("trophies.subtitle")}</p>
      </header>

      <section className="trophees-summary">
        <div className="summary-card">
          <span>{t("trophies.totalUnlocked")}</span>
          <strong>{totals.unlocked}</strong>
        </div>
        <div className="summary-card">
          <span>{t("trophies.totalAvailable")}</span>
          <strong>{totals.total}</strong>
        </div>
        <div className="summary-card">
          <span>{t("trophies.globalCompletion")}</span>
          <strong>{completionRatio}%</strong>
        </div>
      </section>

      <section className="trophees-list" aria-live="polite">
        {isLoading ? (
          <div className="flex flex-col gap-4 w-full mt-4">
            <SkeletonText height="100px" className="rounded-xl w-full" />
            <SkeletonText height="100px" className="rounded-xl w-full" />
            <SkeletonText height="100px" className="rounded-xl w-full" />
          </div>
        ) : null}

        {error ? (
          <p className="error-text">{t("trophies.error")}: {error}</p>
        ) : null}

        {!isLoading && !error && appTrophiesWithState.length === 0 ? (
          <p className="empty-text">{t("trophies.empty")}</p>
        ) : null}

        {!isLoading && !error
          ? appTrophiesWithState.map((entry) => (
              <article
                className={`trophy-item ${entry.unlocked ? "is-unlocked" : "is-locked"} rarity-${entry.rarity}`}
                key={entry.id}
              >
                <div className="trophy-item-top">
                  <div className="trophy-item-header">
                    <span className="trophy-icon" aria-hidden="true">
                      {entry.icon}
                    </span>
                    <div className="trophy-item-title">
                      <h2>{entry.title}</h2>
                      <span className={`trophy-rarity rarity-${entry.rarity}`}>
                        {t(`trophies.rarity.${entry.rarity}`)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`trophy-badge ${entry.unlocked ? "unlocked" : "locked"}`}
                  >
                    {entry.unlocked
                      ? t("trophies.unlocked")
                      : t("trophies.locked")}
                  </span>
                </div>

                <p className="trophy-description">{entry.description}</p>

                {entry.tags && entry.tags.length > 0 && (
                  <div className="trophy-tags">
                    {entry.tags.map((tag: string) => (
                      <span key={tag} className="trophy-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))
          : null}
      </section>
    </div>
  );
};

export default TropheesPage;
