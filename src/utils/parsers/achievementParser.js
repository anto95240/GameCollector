/**
 * Normalise le texte pour les comparaisons d'identifiants
 * (enlève les accents et met en minuscules)
 * @param {string} value 
 * @returns {string}
 */
export const normalizeText = (value) => (
  String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
);

/**
 * Évalue si les conditions d'un achievement sont remplies
 * @param {Object} achievement 
 * @param {Object} stats 
 * @returns {boolean}
 */
export const evaluateAchievementCondition = (achievement, stats) => {
  const idName = normalizeText(achievement?.id_name || achievement?.idName || achievement?.slug || achievement?.title);
  
  switch (idName) {
    case "insert_coin": return stats.totalGames >= 1;
    case "critique_art": return stats.reviewedGamesCount > 0;
    case "coup_de_foudre": return stats.favoritesCount > 0;
    case "identite_secrete": return stats.profileUpdatedCount > 0;
    case "mon_precieux": return stats.customCategoriesCreated > 0;
    case "etagere_virtuelle": return stats.totalGames >= 10;
    case "boutique_independante": return stats.totalGames >= 50;
    case "musee_jeu_video": return stats.totalGames >= 100;
    case "generique_fin": return stats.completedGamesCount >= 10;
    case "completionniste": return stats.completedGamesCount >= 25;
    case "backlog_sueur": return stats.soonGamesCount > 20;
    case "guerre_consoles": return stats.uniquePlatformsCount >= 5;
    case "eclectique": return stats.uniqueGenresCount >= 7;
    case "retro_gamer": return stats.retroGamesCount > 0;
    case "archiviste": return stats.archivisteCount > 0;
    case "data_analyst": return stats.viewedStats;
    case "nostalgie": return stats.startupAnimationSeen;
    case "its_a_me": return stats.marioGames > 0;
    case "rage_quit": return stats.deletedGamesCount > 0;
    case "voyage_temps": return stats.historyCount >= 10;
    case "insomniaque": return stats.lateNightActionsCount > 0;
    default: return false;
  }
};
