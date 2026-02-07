import { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../../common/CustomSelect';
import './yearChart.css';

const DATA_MOCK = {
    year: {
        '2010-2020': [
            { name: '2015', count: 4 },
            { name: '2016', count: 2 },
            { name: '2017', count: 1 },
            { name: '2018', count: 3 },
            { name: '2019', count: 5 },
        ],
        '2020-2030': [
            { name: '2020', count: 6 },
            { name: '2021', count: 3 },
            { name: '2022', count: 2 },
            { name: '2023', count: 4 },
            { name: '2024', count: 1 },
        ]
    },
    tag: {
        '1-5': [
            { name: 'RPG', count: 8 },
            { name: 'Action', count: 5 },
            { name: 'Retro', count: 4 },
            { name: 'Adventure', count: 6 },
            { name: 'Puzzle', count: 2 },
        ],
        '6-10': [
            { name: 'Sci-Fi', count: 6 },
            { name: 'FPS', count: 3 },
            { name: 'Open World', count: 7 },
            { name: 'Strategy', count: 4 },
            { name: 'Sports', count: 1 },
        ]
    }
};

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

    const [viewType, setViewType] = useState('year');
    const [period, setPeriod] = useState('2010-2020');

    const [activeIndex, setActiveIndex] = useState(null);
    const [tooltipPos, setTooltipPos] = useState(null);
    const [tooltipData, setTooltipData] = useState(null);

    const optionsByViewType = useMemo(() => ({
        year: [
            { value: '2010-2020', label: '2010 - 2020' },
            { value: '2020-2030', label: '2020 - 2030' }
        ],
        tag: [
            { value: '1-5', label: 'Tags 1 - 5' },
            { value: '6-10', label: 'Tags 6 - 10' }
        ]
    }), []);

    const handleViewTypeChange = (newType) => {
        setViewType(newType);
        const defaultOption = optionsByViewType[newType][0].value;
        setPeriod(defaultOption);
    };

    const currentData = useMemo(() => {
        return DATA_MOCK[viewType]?.[period] || [];
    }, [viewType, period]);

    const getBarClass = (index) => {
        if (activeIndex === index) return 'bar-cell active';
        if (activeIndex !== null) return 'bar-cell dimmed';
        return 'bar-cell';
    };

    const handleBarEnter = (data, index) => {
        if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;

        setActiveIndex(index);
        setTooltipPos({
            x: data.x + data.width / 2,
            y: data.y
        });
        
        const itemPayload = data.payload || {};
        setTooltipData({
            label: itemPayload.name,
            value: itemPayload.count || data.value
        });
    };

    const handleBarLeave = () => {
        setActiveIndex(null);
        setTooltipPos(null);
        setTooltipData(null);
    };

    return (
        <div className="year-chart-wrapper">
            <div className="year-chart-content">

                <div className="year-chart-header flex gap-4">
                    <CustomSelect
                        options={[
                            { value: 'year', label: t('statistics.barChart.gamesByYear') || 'Par Année' },
                            { value: 'tag', label: t('statistics.barChart.gamesByTag') || 'Par Tag' }
                        ]}
                        value={viewType}
                        onChange={handleViewTypeChange} 
                    />

                    <CustomSelect
                        options={optionsByViewType[viewType]}
                        value={period}
                        onChange={setPeriod}
                    />
                </div>

                <div className="year-chart-container relative">
                    <ResponsiveContainer>
                        <BarChart 
                            data={currentData}
                            margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
                        >
                            <XAxis
                                dataKey="name"
                                axisLine
                                tickLine={false}
                                stroke="#0068AC"
                                dy={10}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                            />

                            <Bar
                                dataKey="count"
                                radius={[4, 4, 0, 0]}
                                barSize={35}
                                onMouseEnter={handleBarEnter}
                                onMouseLeave={handleBarLeave}
                            >
                                {currentData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        className={getBarClass(index)}
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
                </div>
            </div>
        </div>
    );
};

export default YearChart;