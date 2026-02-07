import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../../common/CustomSelect';
import './platformChart.css';

const DATA = [
  { name: 'PS4', value: 4, color: '#5AF2FF' },
  { name: 'PS5', value: 3, color: '#0068AC' },
  { name: 'Xbox', value: 2, color: '#4AAC4E' },
  { name: 'Nintendo', value: 3, color: '#E9A23B' },
];

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
  const [chartType, setChartType] = useState('platform');

  const getCellClass = (index) => {
      if (activeIndex === index) return "platform-cell active";
      if (activeIndex !== null) return "platform-cell dimmed";
      return "platform-cell";
  };

  const options = [
      { value: 'platform', label: t('statistics.doughnut.platform') },
      { value: 'genre', label: t('statistics.doughnut.genre') },
      { value: 'status', label: t('statistics.doughnut.status') },
      { value: 'rating', label: t('statistics.doughnut.rating') }
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
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={DATA}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {DATA.map((entry, index) => (
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
                  content={(props) => <CustomTooltip {...props} externalActiveIndex={activeIndex} />} 
                  cursor={false} 
              />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                iconType="circle"
                formatter={(value, entry, index) => (
                    <span className={`legend-item-text ${activeIndex === index ? 'active' : ''}`}>
                        {value}
                    </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default PlatformChart;