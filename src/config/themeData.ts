export interface ThemeInfo {
  id: string;
  name: string;
  colors: string[];
}

export interface ThemeCategory {
  id: string;
  title: string;
  themes: ThemeInfo[];
}

export const THEME_CATEGORIES_DATA: ThemeCategory[] = [
  {
    "id": "th_mes_classiques_16_id_es",
    "title": "🖥️ Thèmes Classiques (16 idées)",
    "themes": [
      {
        "id": "neon_night",
        "name": "Neon Night",
        "colors": [
          "#001128",
          "#0068ac"
        ]
      },
      {
        "id": "arctic_day",
        "name": "Arctic Day",
        "colors": [
          "#f0f5fa",
          "#0068ac"
        ]
      },
      {
        "id": "emerald_city",
        "name": "Emerald City",
        "colors": [
          "#f8fafc",
          "#059669"
        ]
      },
      {
        "id": "coral_reef",
        "name": "Coral Reef",
        "colors": [
          "#082f49",
          "#ff6b6b"
        ]
      },
      {
        "id": "ember",
        "name": "Ember",
        "colors": [
          "#7f1d1d",
          "#ea580c"
        ]
      },
      {
        "id": "arctic_neon",
        "name": "Arctic Neon",
        "colors": [
          "#f8fafc",
          "#00f0ff"
        ]
      },
      {
        "id": "gold_rush",
        "name": "Gold Rush",
        "colors": [
          "#f8fafc",
          "#f59e0b"
        ]
      },
      {
        "id": "midnight_ocean",
        "name": "Midnight Ocean",
        "colors": [
          "#020617",
          "#06b6d4"
        ]
      },
      {
        "id": "ocean_deep",
        "name": "Ocean Deep",
        "colors": [
          "#003459",
          "#00b4d8"
        ]
      },
      {
        "id": "lava",
        "name": "Lava",
        "colors": [
          "#020617",
          "#ff4500"
        ]
      },
      {
        "id": "forest_dark",
        "name": "Forest Dark",
        "colors": [
          "#064e3b",
          "#065f46"
        ]
      },
      {
        "id": "parchment",
        "name": "Parchment",
        "colors": [
          "#fef3c7",
          "#b45309"
        ]
      },
      {
        "id": "ice_cave",
        "name": "Ice Cave",
        "colors": [
          "#f8fafc",
          "#a5f3fc"
        ]
      },
      {
        "id": "aurora",
        "name": "Aurora",
        "colors": [
          "#020617",
          "#10b981"
        ]
      },
      {
        "id": "desert_night",
        "name": "Desert Night",
        "colors": [
          "#0f172a",
          "#d97706"
        ]
      },
      {
        "id": "vapor",
        "name": "Vapor",
        "colors": [
          "#f8fafc",
          "#0ea5e9"
        ]
      },
      {
        "id": "champagne",
        "name": "Champagne",
        "colors": [
          "#f8fafc",
          "#eab308"
        ]
      },
      {
        "id": "inferno",
        "name": "Inferno",
        "colors": [
          "#020617",
          "#ef4444"
        ]
      }
    ]
  },
  {
    "id": "th_mes_saisonniers_v_nementiels_9_th_mes_int_gr_s",
    "title": "🌸 Thèmes Saisonniers & Événementiels (9 thèmes intégrés)",
    "themes": [
      {
        "id": "halloween",
        "name": "Halloween",
        "colors": [
          "#020617",
          "#f97316"
        ]
      },
      {
        "id": "christmas",
        "name": "Christmas",
        "colors": [
          "#450a0a",
          "#22c55e"
        ]
      },
      {
        "id": "spring",
        "name": "Spring",
        "colors": [
          "#064e3b",
          "#ec4899"
        ]
      },
      {
        "id": "easter",
        "name": "Easter",
        "colors": [
          "#fef08a",
          "#8b5cf6"
        ]
      },
      {
        "id": "summer",
        "name": "Summer",
        "colors": [
          "#082f49",
          "#eab308"
        ]
      },
      {
        "id": "winter",
        "name": "Winter",
        "colors": [
          "#020617",
          "#0ea5e9"
        ]
      },
      {
        "id": "autumn",
        "name": "Autumn",
        "colors": [
          "#450a0a",
          "#d97706"
        ]
      },
      {
        "id": "chandeleur",
        "name": "Chandeleur",
        "colors": [
          "#fef08a",
          "#8b4513"
        ]
      },
      {
        "id": "epiphanie",
        "name": "Epiphanie",
        "colors": [
          "#334155",
          "#eab308"
        ]
      }
    ]
  },
  {
    "id": "autres_types_de_th_mes",
    "title": "🌌 Autres Types de Thèmes",
    "themes": []
  },
  {
    "id": "th_mes_gaming_univers",
    "title": "🎮 Thèmes Gaming / Univers",
    "themes": [
      {
        "id": "retro_pixel",
        "name": "Retro Pixel",
        "colors": [
          "#000000",
          "#00ff00"
        ]
      },
      {
        "id": "ps2_era",
        "name": "PS2 Era",
        "colors": [
          "#000000",
          "#00439c"
        ]
      },
      {
        "id": "game_boy",
        "name": "Game Boy",
        "colors": [
          "#787b82",
          "#8bac0f"
        ]
      },
      {
        "id": "retro_arcade",
        "name": "Retro Arcade",
        "colors": [
          "#000000",
          "#facc15"
        ]
      }
    ]
  },
  {
    "id": "th_mes_g_ographiques_culturels",
    "title": "🌍 Thèmes Géographiques / Culturels",
    "themes": [
      {
        "id": "egypte_antique",
        "name": "Egypte Antique",
        "colors": [
          "#fef3c7",
          "#d4a853"
        ]
      },
      {
        "id": "viking_norse",
        "name": "Viking Norse",
        "colors": [
          "#334155",
          "#991b1b"
        ]
      },
      {
        "id": "tundra",
        "name": "Tundra",
        "colors": [
          "#f8fafc",
          "#0ea5e9"
        ]
      },
      {
        "id": "andalousie",
        "name": "Andalousie",
        "colors": [
          "#fff7ed",
          "#ea580c"
        ]
      }
    ]
  },
  {
    "id": "th_mes_historiques_fantasy",
    "title": "🏛️ Thèmes Historiques / Fantasy",
    "themes": [
      {
        "id": "medieval_kingdom",
        "name": "Medieval Kingdom",
        "colors": [
          "#450a0a",
          "#eab308"
        ]
      },
      {
        "id": "roman_empire",
        "name": "Roman Empire",
        "colors": [
          "#7f1d1d",
          "#fef3c7"
        ]
      },
      {
        "id": "age_of_sail",
        "name": "Age of Sail",
        "colors": [
          "#082f49",
          "#8b4513"
        ]
      },
      {
        "id": "aztec",
        "name": "Aztec",
        "colors": [
          "#14b8a6",
          "#d4a853"
        ]
      },
      {
        "id": "elven_forest",
        "name": "Elven Forest",
        "colors": [
          "#064e3b",
          "#fef08a"
        ]
      },
      {
        "id": "deep_sea",
        "name": "Deep Sea",
        "colors": [
          "#020617",
          "#06b6d4"
        ]
      }
    ]
  },
  {
    "id": "th_mes_astronomie_espace_futurisme",
    "title": "🌠 Thèmes Astronomie / Espace / Futurisme",
    "themes": [
      {
        "id": "nebula",
        "name": "Nebula",
        "colors": [
          "#020617",
          "#7c3aed"
        ]
      },
      {
        "id": "black_hole",
        "name": "Black Hole",
        "colors": [
          "#000000",
          "#ea580c"
        ]
      },
      {
        "id": "quantum",
        "name": "Quantum",
        "colors": [
          "#f8fafc",
          "#0ea5e9"
        ]
      },
      {
        "id": "mars_colony",
        "name": "Mars Colony",
        "colors": [
          "#7f1d1d",
          "#ea580c"
        ]
      },
      {
        "id": "stargate",
        "name": "Stargate",
        "colors": [
          "#0f172a",
          "#3b82f6"
        ]
      },
      {
        "id": "deep_space",
        "name": "Deep Space",
        "colors": [
          "#000000",
          "#a855f7"
        ]
      }
    ]
  },
  {
    "id": "th_mes_films_s_ries_d_blocables_via_les_jeux",
    "title": "🎬 Thèmes Films & Séries (Déblocables via les Jeux)",
    "themes": [
      {
        "id": "upside_down",
        "name": "Upside Down",
        "colors": [
          "#020617",
          "#ef4444"
        ]
      },
      {
        "id": "replicant",
        "name": "Replicant",
        "colors": [
          "#020617",
          "#0ea5e9"
        ]
      },
      {
        "id": "dino_dna",
        "name": "Dino DNA",
        "colors": [
          "#14532d",
          "#d97706"
        ]
      },
      {
        "id": "isla_nublar",
        "name": "Isla Nublar",
        "colors": [
          "#064e3b",
          "#ea580c"
        ]
      },
      {
        "id": "whip_hat",
        "name": "Whip & Hat",
        "colors": [
          "#451a03",
          "#d4a853"
        ]
      },
      {
        "id": "delorean",
        "name": "Delorean",
        "colors": [
          "#94a3b8",
          "#0ea5e9"
        ]
      },
      {
        "id": "skynet",
        "name": "Skynet",
        "colors": [
          "#000000",
          "#ef4444"
        ]
      },
      {
        "id": "gargantua",
        "name": "Gargantua",
        "colors": [
          "#000000",
          "#eab308"
        ]
      },
      {
        "id": "unsinkable",
        "name": "Unsinkable",
        "colors": [
          "#082f49",
          "#f8fafc"
        ]
      },
      {
        "id": "butterfly_effect",
        "name": "Butterfly Effect",
        "colors": [
          "#1e293b",
          "#f8fafc"
        ]
      },
      {
        "id": "walking_sim",
        "name": "Walking Sim",
        "colors": [
          "#ea580c",
          "#064e3b"
        ]
      },
      {
        "id": "broken_screen",
        "name": "Broken Screen",
        "colors": [
          "#020617",
          "#94a3b8"
        ]
      },
      {
        "id": "221b",
        "name": "221B",
        "colors": [
          "#1e293b",
          "#facc15"
        ]
      },
      {
        "id": "the_truth",
        "name": "The Truth",
        "colors": [
          "#000000",
          "#22c55e"
        ]
      },
      {
        "id": "reactor_4",
        "name": "Reactor 4",
        "colors": [
          "#334155",
          "#84cc16"
        ]
      },
      {
        "id": "dark_passenger",
        "name": "Dark Passenger",
        "colors": [
          "#f8fafc",
          "#ef4444"
        ]
      },
      {
        "id": "nakatomi",
        "name": "Nakatomi",
        "colors": [
          "#334155",
          "#ea580c"
        ]
      },
      {
        "id": "proton_pack",
        "name": "Proton Pack",
        "colors": [
          "#000000",
          "#84cc16"
        ]
      }
    ]
  },
  {
    "id": "th_mes_jeux_vid_o",
    "title": "🎮 Thèmes Jeux Vidéo",
    "themes": [
      {
        "id": "mushroom_kingdom",
        "name": "Mushroom Kingdom",
        "colors": [
          "#ef4444",
          "#3b82f6"
        ]
      },
      {
        "id": "kanto",
        "name": "Kanto",
        "colors": [
          "#ef4444",
          "#ffffff"
        ]
      },
      {
        "id": "green_hill",
        "name": "Green Hill",
        "colors": [
          "#3b82f6",
          "#22c55e"
        ]
      },
      {
        "id": "sic_parvis_magna",
        "name": "Sic Parvis Magna",
        "colors": [
          "#451a03",
          "#d4a853"
        ]
      },
      {
        "id": "tomb_raider",
        "name": "Tomb Raider",
        "colors": [
          "#451a03",
          "#14b8a6"
        ]
      },
      {
        "id": "los_santos",
        "name": "Los Santos",
        "colors": [
          "#22c55e",
          "#ea580c"
        ]
      }
    ]
  },
  {
    "id": "th_mes_gestion_nature_animaux",
    "title": "🐾 Thèmes Gestion, Nature & Animaux",
    "themes": [
      {
        "id": "cozy_farm",
        "name": "Cozy Farm",
        "colors": [
          "#fef3c7",
          "#22c55e"
        ]
      },
      {
        "id": "tycoon",
        "name": "Tycoon",
        "colors": [
          "#2563eb",
          "#facc15"
        ]
      },
      {
        "id": "aquarium",
        "name": "Aquarium",
        "colors": [
          "#082f49",
          "#06b6d4"
        ]
      },
      {
        "id": "safari_zoo",
        "name": "Safari Zoo",
        "colors": [
          "#fef3c7",
          "#451a03"
        ]
      },
      {
        "id": "city_builder",
        "name": "City Builder",
        "colors": [
          "#334155",
          "#facc15"
        ]
      },
      {
        "id": "jurassic",
        "name": "Jurassic",
        "colors": [
          "#14532d",
          "#d97706"
        ]
      }
    ]
  },
  {
    "id": "th_mes_univers_entiers",
    "title": "🪐 Thèmes Univers Entiers",
    "themes": [
      {
        "id": "infinity",
        "name": "Infinity",
        "colors": [
          "#450a0a",
          "#facc15"
        ]
      },
      {
        "id": "multiverse",
        "name": "Multiverse",
        "colors": [
          "#1e3a8a",
          "#facc15"
        ]
      },
      {
        "id": "galaxy_far_away",
        "name": "Galaxy Far Away",
        "colors": [
          "#000000",
          "#3b82f6"
        ]
      },
      {
        "id": "hogwarts",
        "name": "Hogwarts",
        "colors": [
          "#7f1d1d",
          "#d4a853"
        ]
      },
      {
        "id": "forgotten_realms",
        "name": "Forgotten Realms",
        "colors": [
          "#7f1d1d",
          "#fef3c7"
        ]
      },
      {
        "id": "arrakis",
        "name": "Arrakis",
        "colors": [
          "#d97706",
          "#3b82f6"
        ]
      },
      {
        "id": "psychohistory",
        "name": "Psychohistory",
        "colors": [
          "#94a3b8",
          "#3b82f6"
        ]
      },
      {
        "id": "the_construct",
        "name": "The Construct",
        "colors": [
          "#000000",
          "#22c55e"
        ]
      },
      {
        "id": "cybertron",
        "name": "Cybertron",
        "colors": [
          "#ef4444",
          "#8b5cf6"
        ]
      },
      {
        "id": "forks",
        "name": "Forks",
        "colors": [
          "#475569",
          "#14532d"
        ]
      },
      {
        "id": "pandora",
        "name": "Pandora",
        "colors": [
          "#020617",
          "#06b6d4"
        ]
      },
      {
        "id": "once_upon_a_dream",
        "name": "Once Upon a Dream",
        "colors": [
          "#ec4899",
          "#3b82f6"
        ]
      },
      {
        "id": "luxo",
        "name": "Luxo",
        "colors": [
          "#3b82f6",
          "#facc15"
        ]
      },
      {
        "id": "castle_rock",
        "name": "Castle Rock",
        "colors": [
          "#0f172a",
          "#ef4444"
        ]
      },
      {
        "id": "wardrobe",
        "name": "Wardrobe",
        "colors": [
          "#f8fafc",
          "#064e3b"
        ]
      },
      {
        "id": "panem",
        "name": "Panem",
        "colors": [
          "#451a03",
          "#facc15"
        ]
      }
    ]
  },
  {
    "id": "th_mes_super_h_ros_marvel_dc",
    "title": "🦸 Thèmes Super-Héros (Marvel & DC)",
    "themes": [
      {
        "id": "web_slinger",
        "name": "Web-Slinger",
        "colors": [
          "#ef4444",
          "#3b82f6"
        ]
      },
      {
        "id": "the_dark_knight",
        "name": "The Dark Knight",
        "colors": [
          "#000000",
          "#facc15"
        ]
      },
      {
        "id": "stark_tech",
        "name": "Stark Tech",
        "colors": [
          "#b91c1c",
          "#facc15"
        ]
      },
      {
        "id": "man_of_steel",
        "name": "Man of Steel",
        "colors": [
          "#1d4ed8",
          "#ef4444"
        ]
      },
      {
        "id": "speed_force",
        "name": "Speed Force",
        "colors": [
          "#b91c1c",
          "#facc15"
        ]
      },
      {
        "id": "clown_prince",
        "name": "Clown Prince",
        "colors": [
          "#7c3aed",
          "#22c55e"
        ]
      },
      {
        "id": "first_avenger",
        "name": "First Avenger",
        "colors": [
          "#1e3a8a",
          "#ef4444"
        ]
      },
      {
        "id": "god_of_thunder",
        "name": "God of Thunder",
        "colors": [
          "#475569",
          "#ef4444"
        ]
      },
      {
        "id": "gamma_smash",
        "name": "Gamma Smash",
        "colors": [
          "#14532d",
          "#7c3aed"
        ]
      },
      {
        "id": "red_room",
        "name": "Red Room",
        "colors": [
          "#000000",
          "#ef4444"
        ]
      },
      {
        "id": "weapon_x",
        "name": "Weapon X",
        "colors": [
          "#facc15",
          "#3b82f6"
        ]
      },
      {
        "id": "wakanda_forever",
        "name": "Wakanda Forever",
        "colors": [
          "#000000",
          "#8b5cf6"
        ]
      },
      {
        "id": "sorcerer_supreme",
        "name": "Sorcerer Supreme",
        "colors": [
          "#1e3a8a",
          "#ef4444"
        ]
      },
      {
        "id": "symbiote",
        "name": "Symbiote",
        "colors": [
          "#000000",
          "#ffffff"
        ]
      }
    ]
  },
  {
    "id": "th_mes_disney_pixar_par_film",
    "title": "🏰 Thèmes Disney / Pixar (Par Film)",
    "themes": [
      {
        "id": "andy_s_room",
        "name": "Andy's Room",
        "colors": [
          "#3b82f6",
          "#facc15"
        ]
      },
      {
        "id": "motunui",
        "name": "Motunui",
        "colors": [
          "#0ea5e9",
          "#fef3c7"
        ]
      },
      {
        "id": "scare_floor",
        "name": "Scare Floor",
        "colors": [
          "#3b82f6",
          "#84cc16"
        ]
      },
      {
        "id": "route_66",
        "name": "Route 66",
        "colors": [
          "#ef4444",
          "#000000"
        ]
      },
      {
        "id": "arendelle",
        "name": "Arendelle",
        "colors": [
          "#e0f2fe",
          "#0ea5e9"
        ]
      },
      {
        "id": "eac",
        "name": "EAC",
        "colors": [
          "#082f49",
          "#ea580c"
        ]
      },
      {
        "id": "agrabah",
        "name": "Agrabah",
        "colors": [
          "#4c1d95",
          "#d4a853"
        ]
      },
      {
        "id": "pride_rock",
        "name": "Pride Rock",
        "colors": [
          "#ea580c",
          "#facc15"
        ]
      },
      {
        "id": "headquarters",
        "name": "Headquarters",
        "colors": [
          "#facc15",
          "#3b82f6"
        ]
      },
      {
        "id": "enchanted_rose",
        "name": "Enchanted Rose",
        "colors": [
          "#d4a853",
          "#1e3a8a"
        ]
      },
      {
        "id": "dragon_warrior",
        "name": "Dragon Warrior",
        "colors": [
          "#991b1b",
          "#d4a853"
        ]
      },
      {
        "id": "paradise_falls",
        "name": "Paradise Falls",
        "colors": [
          "#3b82f6",
          "#22c55e"
        ]
      },
      {
        "id": "gusteau_s",
        "name": "Gusteau's",
        "colors": [
          "#b45309",
          "#ffffff"
        ]
      },
      {
        "id": "axiom",
        "name": "Axiom",
        "colors": [
          "#9a3412",
          "#4ade80"
        ]
      },
      {
        "id": "olympus",
        "name": "Olympus",
        "colors": [
          "#fef3c7",
          "#d4a853"
        ]
      },
      {
        "id": "neverland",
        "name": "Neverland",
        "colors": [
          "#15803d",
          "#d4a853"
        ]
      },
      {
        "id": "bella_notte",
        "name": "Bella Notte",
        "colors": [
          "#991b1b",
          "#0f172a"
        ]
      }
    ]
  },
  {
    "id": "th_mes_clubs_de_sport",
    "title": "⚽ Thèmes Clubs de Sport",
    "themes": [
      {
        "id": "ici_c_est_paris",
        "name": "Ici c'est Paris",
        "colors": [
          "#1e3a8a",
          "#ef4444"
        ]
      },
      {
        "id": "citizens",
        "name": "Citizens",
        "colors": [
          "#38bdf8",
          "#ffffff"
        ]
      },
      {
        "id": "red_devils",
        "name": "Red Devils",
        "colors": [
          "#dc2626",
          "#000000"
        ]
      },
      {
        "id": "ynwa",
        "name": "YNWA",
        "colors": [
          "#ef4444",
          "#ffffff"
        ]
      },
      {
        "id": "gunners",
        "name": "Gunners",
        "colors": [
          "#dc2626",
          "#ffffff"
        ]
      },
      {
        "id": "los_blancos",
        "name": "Los Blancos",
        "colors": [
          "#ffffff",
          "#d4a853"
        ]
      },
      {
        "id": "blaugrana",
        "name": "Blaugrana",
        "colors": [
          "#1d4ed8",
          "#991b1b"
        ]
      },
      {
        "id": "colchoneros",
        "name": "Colchoneros",
        "colors": [
          "#dc2626",
          "#ffffff"
        ]
      },
      {
        "id": "mia_san_mia",
        "name": "Mia San Mia",
        "colors": [
          "#dc2626",
          "#ffffff"
        ]
      },
      {
        "id": "bianconeri",
        "name": "Bianconeri",
        "colors": [
          "#000000",
          "#ffffff"
        ]
      },
      {
        "id": "rossoneri",
        "name": "Rossoneri",
        "colors": [
          "#dc2626",
          "#000000"
        ]
      }
    ]
  },
  {
    "id": "th_mes_automobile_marques_iconiques",
    "title": "🏎️ Thèmes Automobile (Marques Iconiques)",
    "themes": [
      {
        "id": "pony_car",
        "name": "Pony Car",
        "colors": [
          "#1e3a8a",
          "#ef4444"
        ]
      },
      {
        "id": "m_power",
        "name": "M-Power",
        "colors": [
          "#ffffff",
          "#3b82f6"
        ]
      },
      {
        "id": "quattro",
        "name": "Quattro",
        "colors": [
          "#475569",
          "#ef4444"
        ]
      },
      {
        "id": "silver_star",
        "name": "Silver Star",
        "colors": [
          "#94a3b8",
          "#0f172a"
        ]
      },
      {
        "id": "stingray",
        "name": "Stingray",
        "colors": [
          "#ef4444",
          "#000000"
        ]
      },
      {
        "id": "carrera",
        "name": "Carrera",
        "colors": [
          "#94a3b8",
          "#ef4444"
        ]
      },
      {
        "id": "rosso_corsa",
        "name": "Rosso Corsa",
        "colors": [
          "#dc2626",
          "#facc15"
        ]
      },
      {
        "id": "sant_agata",
        "name": "Sant'Agata",
        "colors": [
          "#bef264",
          "#000000"
        ]
      },
      {
        "id": "db_series",
        "name": "DB Series",
        "colors": [
          "#064e3b",
          "#94a3b8"
        ]
      },
      {
        "id": "flying_b",
        "name": "Flying B",
        "colors": [
          "#14532d",
          "#fef3c7"
        ]
      },
      {
        "id": "molsheim",
        "name": "Molsheim",
        "colors": [
          "#1d4ed8",
          "#000000"
        ]
      },
      {
        "id": "spirit_of_ecstasy",
        "name": "Spirit of Ecstasy",
        "colors": [
          "#000000",
          "#f8fafc"
        ]
      }
    ]
  },
  {
    "id": "th_mes_films_s_ries_par_d_faut_ou_actions",
    "title": "🍿 Thèmes Films & Séries (Par Défaut ou Actions)",
    "themes": [
      {
        "id": "danger_zone",
        "name": "Danger Zone",
        "colors": [
          "#38bdf8",
          "#ea580c"
        ]
      },
      {
        "id": "winden",
        "name": "Winden",
        "colors": [
          "#475569",
          "#facc15"
        ]
      },
      {
        "id": "berk",
        "name": "Berk",
        "colors": [
          "#14532d",
          "#ef4444"
        ]
      },
      {
        "id": "phone_home",
        "name": "Phone Home",
        "colors": [
          "#0f172a",
          "#ef4444"
        ]
      },
      {
        "id": "mystery_machine",
        "name": "Mystery Machine",
        "colors": [
          "#86efac",
          "#0ea5e9"
        ]
      },
      {
        "id": "flux",
        "name": "Flux",
        "colors": [
          "#e0f2fe",
          "#000000"
        ]
      },
      {
        "id": "street_football",
        "name": "Street Football",
        "colors": [
          "#94a3b8",
          "#facc15"
        ]
      },
      {
        "id": "lasagna",
        "name": "Lasagna",
        "colors": [
          "#ea580c",
          "#000000"
        ]
      },
      {
        "id": "cambrioleur",
        "name": "Cambrioleur",
        "colors": [
          "#000000",
          "#d4a853"
        ]
      },
      {
        "id": "glade",
        "name": "Glade",
        "colors": [
          "#15803d",
          "#94a3b8"
        ]
      },
      {
        "id": "007",
        "name": "007",
        "colors": [
          "#000000",
          "#d4a853"
        ]
      },
      {
        "id": "manners",
        "name": "Manners",
        "colors": [
          "#1e3a8a",
          "#d4a853"
        ]
      },
      {
        "id": "flight_828",
        "name": "Flight 828",
        "colors": [
          "#0f172a",
          "#94a3b8"
        ]
      },
      {
        "id": "sarsaparilla",
        "name": "Sarsaparilla",
        "colors": [
          "#3b82f6",
          "#ffffff"
        ]
      },
      {
        "id": "potion_magique",
        "name": "Potion Magique",
        "colors": [
          "#ef4444",
          "#15803d"
        ]
      },
      {
        "id": "reporter",
        "name": "Reporter",
        "colors": [
          "#3b82f6",
          "#451a03"
        ]
      },
      {
        "id": "imhotep",
        "name": "Imhotep",
        "colors": [
          "#fde047",
          "#000000"
        ]
      },
      {
        "id": "ahkmenrah",
        "name": "Ahkmenrah",
        "colors": [
          "#0f172a",
          "#d4a853"
        ]
      },
      {
        "id": "kevin",
        "name": "Kevin!",
        "colors": [
          "#ef4444",
          "#15803d"
        ]
      },
      {
        "id": "slappy",
        "name": "Slappy",
        "colors": [
          "#84cc16",
          "#000000"
        ]
      },
      {
        "id": "lv_426",
        "name": "LV-426",
        "colors": [
          "#84cc16",
          "#000000"
        ]
      },
      {
        "id": "welcome_to_earth",
        "name": "Welcome to Earth",
        "colors": [
          "#0ea5e9",
          "#84cc16"
        ]
      },
      {
        "id": "street_racing",
        "name": "Street Racing",
        "colors": [
          "#000000",
          "#0ea5e9"
        ]
      },
      {
        "id": "imf",
        "name": "IMF",
        "colors": [
          "#000000",
          "#84cc16"
        ]
      },
      {
        "id": "jungle_board",
        "name": "Jungle Board",
        "colors": [
          "#15803d",
          "#d4a853"
        ]
      },
      {
        "id": "neuralyzer",
        "name": "Neuralyzer",
        "colors": [
          "#000000",
          "#ffffff"
        ]
      }
    ]
  },
  {
    "id": "th_mes_catastrophes_naturelles_m_ta",
    "title": "🌪️ Thèmes Catastrophes Naturelles (Méta)",
    "themes": [
      {
        "id": "eruption",
        "name": "Eruption",
        "colors": [
          "#000000",
          "#ea580c"
        ]
      },
      {
        "id": "tsunami",
        "name": "Tsunami",
        "colors": [
          "#082f49",
          "#0ea5e9"
        ]
      },
      {
        "id": "twister",
        "name": "Twister",
        "colors": [
          "#94a3b8",
          "#000000"
        ]
      },
      {
        "id": "whiteout",
        "name": "Whiteout",
        "colors": [
          "#f8fafc",
          "#0ea5e9"
        ]
      },
      {
        "id": "meteor_strike",
        "name": "Meteor Strike",
        "colors": [
          "#ef4444",
          "#facc15"
        ]
      },
      {
        "id": "sinkhole",
        "name": "Sinkhole",
        "colors": [
          "#000000",
          "#451a03"
        ]
      }
    ]
  }
];
