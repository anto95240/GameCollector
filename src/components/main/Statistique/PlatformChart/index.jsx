import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import CustomSelect from "../../../common/CustomSelect";
import { useApiGame } from "../../../../hooks/api/useApiGame";
import { useApiMetadata } from "../../../../hooks/api/useApiMetadata";
import "./platformChart.css";

const CustomTooltip = ({ active, payload, externalActiveIndex }) => {
  if (active && payload && payload.length && externalActiveIndex !== null) {
    const data = payload[0];
    return (
      <div className="platform-custom-tooltip">
        <p className="platform-tooltip-label">{data.name}</p>
        <p className="platform-tooltip-value">{`Quantité : ${data.value}`}</p>
      </div>
    );
  }
  return null;
};

const PlatformChart = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(null);
  const [chartType, setChartType] = useState("platform");

  const { getAllGames } = useApiGame();
  const { getAllMetadata } = useApiMetadata();
  const [games, setGames] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [gamesData, metaData] = await Promise.all([
          getAllGames(),
          getAllMetadata(),
        ]);
        setGames(Array.isArray(gamesData) ? gamesData : gamesData.games || []);
        setMetadata(metaData);
      } catch (error) {
        console.error("Erreur de chargement des données", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [getAllGames, getAllMetadata]);

  const chartData = useMemo(() => {
    if (!games.length || !metadata) return [];

    const counts = {};

    const getId = (item) => {
      if (!item) return null;
      if (typeof item === "object") return String(item._id || item.id);
      return String(item);
    };

    games.forEach((game) => {
      let name = "Inconnu";
      let color = "#cccccc";

      if (chartType === "platform") {
        const id = getId(game.platform_id);
        const exactMeta = metadata.platforms?.find((p) => getId(p) === id);
        name =
          exactMeta?.platform_name ||
          exactMeta?.name ||
          game.platform_id?.platform_name ||
          game.platform_id?.name ||
          "Inconnu";

        // RECHERCHE DU CUSTOM : On cherche s'il y a une version personnalisée (user_id présent) pour ce nom
        const customMeta = metadata.platforms?.find(
          (p) => (p.platform_name || p.name) === name && p.user_id,
        );
        const bestMeta = customMeta || exactMeta;

        color = bestMeta?.color || game.platform_id?.color || "#5AF2FF";
      } else if (chartType === "genre") {
        const id = getId(game.genre_id);
        const exactMeta = metadata.genres?.find((g) => getId(g) === id);
        name =
          exactMeta?.genre_name ||
          exactMeta?.name ||
          game.genre_id?.genre_name ||
          game.genre_id?.name ||
          "Inconnu";

        const customMeta = metadata.genres?.find(
          (g) => (g.genre_name || g.name) === name && g.user_id,
        );
        const bestMeta = customMeta || exactMeta;

        color = bestMeta?.color || game.genre_id?.color || "#0068AC";
      } else if (chartType === "status") {
        const id = getId(game.status_id);
        const exactMeta = metadata.statuses?.find((s) => getId(s) === id);
        name =
          exactMeta?.status_name ||
          exactMeta?.name ||
          game.status_id?.status_name ||
          game.status_id?.name ||
          "Inconnu";

        const customMeta = metadata.statuses?.find(
          (s) => (s.status_name || s.name) === name && s.user_id,
        );
        const bestMeta = customMeta || exactMeta;

        color = bestMeta?.color || game.status_id?.color || "#4AAC4E";
      } else if (chartType === "rating") {
        const note = game.note;
        if (note !== undefined && note !== null) {
          name = `${note} étoiles`;
          const colors = [
            "#EF4444",
            "#E9A23B",
            "#F1C40F",
            "#6EB269",
            "#4AAC4E",
            "#0068AC",
          ];
          color = colors[Math.min(Math.floor(note), 5)] || "#5AF2FF";
        } else {
          name = "Non noté";
          color = "#64748B";
        }
      }

      if (!counts[name]) counts[name] = { name, value: 0, color, fill: color };
      counts[name].value += 1;
    });

    return Object.values(counts).sort((a, b) => b.value - a.value);
  }, [games, metadata, chartType]);

  const getCellClass = (index) => {
    if (activeIndex === index) return "platform-cell active";
    if (activeIndex !== null) return "platform-cell dimmed";
    return "platform-cell";
  };

  const options = [
    { value: "platform", label: t("statistics.doughnut.platform") },
    { value: "genre", label: t("statistics.doughnut.genre") },
    { value: "status", label: t("statistics.doughnut.status") },
    { value: "rating", label: t("statistics.doughnut.rating") },
  ];

  return (
    <div className="platform-chart-wrapper">
      <div className="platform-chart-content">
        <div className="platform-chart-header">
          <CustomSelect
            options={options}
            value={chartType}
            onChange={setChartType}
          />
        </div>

        <div className="platform-chart-container">
          {isLoading ? (
            <p
              className="loading-text"
              style={{ textAlign: "center", marginTop: "50px" }}
            >
              Chargement...
            </p>
          ) : chartData.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                marginTop: "50px",
                color: "var(--text-secondary)",
              }}
            >
              Aucune donnée disponible
            </p>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className={getCellClass(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      {...props}
                      externalActiveIndex={activeIndex}
                    />
                  )}
                  cursor={false}
                  wrapperStyle={{
                    display: activeIndex !== null ? "block" : "none",
                  }}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  formatter={(value, entry, index) => (
                    <span
                      className={`legend-item-text ${activeIndex === index ? "active" : ""}`}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformChart;
