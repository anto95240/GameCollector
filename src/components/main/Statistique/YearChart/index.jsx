import { useState, useMemo, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Cell } from "recharts";
import { useTranslation } from "react-i18next";
import CustomSelect from "../../../common/CustomSelect";
import { useApiGame } from "../../../../hooks/api/useApiGame";
import { useApiMetadata } from "../../../../hooks/api/useApiMetadata";
import "./yearChart.css";

const CustomTooltip = ({ label, value, position }) => {
  if (!position) return null;

  return (
    <div
      className="year-custom-tooltip"
      style={{ left: position.x, top: position.y }}
    >
      <p className="year-tooltip-label">{label}</p>
      <p className="year-tooltip-info">{value} Jeux</p>
    </div>
  );
};

const YearChart = () => {
  const { t } = useTranslation();

  const [viewType, setViewType] = useState("year");
  const [period, setPeriod] = useState("");

  const [activeIndex, setActiveIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);

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
        console.error("Erreur de chargement", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [getAllGames, getAllMetadata]);

  const processedData = useMemo(() => {
    if (!games.length) return { options: [], dataByPeriod: {} };

    const getId = (item) => (item ? String(item._id || item.id || item) : null);

    if (viewType === "year") {
      const yearCounts = {};
      games.forEach((g) => {
        if (g.year) {
          yearCounts[g.year] = (yearCounts[g.year] || 0) + 1;
        }
      });
      const years = Object.keys(yearCounts)
        .map(Number)
        .sort((a, b) => a - b);
      if (years.length === 0) return { options: [], dataByPeriod: {} };

      const minYear = Math.floor(years[0] / 10) * 10;
      const maxYear = Math.floor(years[years.length - 1] / 10) * 10;

      const options = [];
      const dataByPeriod = {};

      for (let y = minYear; y <= maxYear; y += 10) {
        const periodLabel = `${y} - ${y + 9}`;
        options.push({ value: periodLabel, label: periodLabel });
        dataByPeriod[periodLabel] = [];

        for (let curr = y; curr <= y + 9; curr++) {
          if (yearCounts[curr]) {
            dataByPeriod[periodLabel].push({
              name: curr.toString(),
              count: yearCounts[curr],
              color: "#0068AC",
            });
          }
        }
      }
      return { options: options.reverse(), dataByPeriod };
    } else if (viewType === "tag") {
      if (!metadata) return { options: [], dataByPeriod: {} };

      const tagCounts = {};
      games.forEach((g) => {
        g.tags_ids?.forEach((tagObj) => {
          const id = getId(tagObj);
          const exactMeta = metadata.tags?.find((t) => getId(t) === id);
          if (exactMeta) {
            const tagName = exactMeta.tag_name || exactMeta.name || "Inconnu";

            // Sécurité : on cherche la version customisée du Tag
            const customMeta = metadata.tags?.find(
              (t) => (t.tag_name || t.name) === tagName && t.user_id,
            );
            const bestMeta = customMeta || exactMeta;

            if (!tagCounts[tagName]) {
              tagCounts[tagName] = {
                count: 0,
                color: bestMeta.color || "#5AF2FF",
              };
            }
            tagCounts[tagName].count += 1;
          }
        });
      });

      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({
          name,
          count: data.count,
          color: data.color,
        }));

      const options = [];
      const dataByPeriod = {};
      const chunkSize = 5;

      if (sortedTags.length === 0) return { options: [], dataByPeriod: {} };

      for (let i = 0; i < sortedTags.length; i += chunkSize) {
        const periodLabel = `Top ${i + 1} - ${Math.min(i + chunkSize, sortedTags.length)}`;
        options.push({ value: periodLabel, label: periodLabel });
        dataByPeriod[periodLabel] = sortedTags.slice(i, i + chunkSize);
      }

      return { options, dataByPeriod };
    }
  }, [games, metadata, viewType]);

  useEffect(() => {
    if (processedData?.options?.length > 0) {
      if (!processedData.options.find((o) => o.value === period)) {
        setPeriod(processedData.options[0].value);
      }
    } else {
      setPeriod("");
    }
  }, [processedData, period]);

  const currentData = useMemo(() => {
    return processedData?.dataByPeriod?.[period] || [];
  }, [processedData, period]);

  const getBarClass = (index) => {
    if (activeIndex === index) return "bar-cell active";
    if (activeIndex !== null) return "bar-cell dimmed";
    return "bar-cell";
  };

  const handleBarEnter = (data, index) => {
    if (!data || typeof data.x !== "number" || typeof data.y !== "number")
      return;
    setActiveIndex(index);
    setTooltipPos({ x: data.x + data.width / 2, y: data.y });

    const itemPayload = data.payload || {};
    setTooltipData({
      label: itemPayload.name,
      value: itemPayload.count || data.value,
    });
  };

  const handleBarLeave = () => {
    setActiveIndex(null);
    setTooltipPos(null);
    setTooltipData(null);
  };

  const viewOptions = [
    { value: "year", label: t("statistics.barChart.gamesByYear") },
    { value: "tag", label: t("statistics.barChart.gamesByTag") },
  ];

  return (
    <div className="year-chart-wrapper">
      <div className="year-chart-content">
        <div className="year-chart-header">
          <CustomSelect
            options={viewOptions}
            value={viewType}
            onChange={setViewType}
          />

          {processedData?.options?.length > 0 && (
            <CustomSelect
              options={processedData.options}
              value={period}
              onChange={setPeriod}
            />
          )}
        </div>

        <div className="year-chart-container">
          {isLoading ? (
            <p
              className="loading-text"
              style={{ textAlign: "center", marginTop: "50px" }}
            >
              Chargement...
            </p>
          ) : currentData.length === 0 ? (
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
            <>
              <ResponsiveContainer>
                <BarChart
                  data={currentData}
                  margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine
                    tickLine={false}
                    stroke="var(--border-main)"
                    dy={10}
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    barSize={35}
                    onMouseEnter={handleBarEnter}
                    onMouseLeave={handleBarLeave}
                  >
                    {currentData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        className={getBarClass(index)}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {activeIndex !== null && tooltipPos && tooltipData && (
                <CustomTooltip
                  label={tooltipData.label}
                  value={tooltipData.value}
                  position={tooltipPos}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default YearChart;
