import { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../../../common/CustomSelect';
import './yearChart.css';

/* ---------------- MOCK DATA ---------------- */
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
        '2010-2020': [
            { name: 'RPG', count: 8 },
            { name: 'Action', count: 5 },
            { name: 'Retro', count: 4 },
        ],
        '2020-2030': [
            { name: 'Sci-Fi', count: 6 },
            { name: 'FPS', count: 3 },
            { name: 'Open World', count: 7 },
        ]
    }
};

/* ---------------- TOOLTIP ---------------- */
const CustomTooltip = ({ active, payload, label, coordinate }) => {
    if (!active || !payload || !payload.length || !coordinate) return null;

    return (
        <div
            className="year-custom-tooltip"
            style={{
                left: coordinate.x,
                top: coordinate.y,
                position: 'absolute'
            }}
        >
            <p className="year-tooltip-label">{label}</p>
            <p className="year-tooltip-info">{payload[0].value} Jeux</p>
        </div>
    );
};

/* ---------------- COMPONENT ---------------- */
const YearChart = () => {
    const { t } = useTranslation();

    const [viewType, setViewType] = useState('year');
    const [period, setPeriod] = useState('2010-2020');
    const [activeIndex, setActiveIndex] = useState(null);

    const currentData = useMemo(() => {
        return DATA_MOCK[viewType]?.[period] || [];
    }, [viewType, period]);

    const getBarClass = (index) => {
        if (activeIndex === index) return 'bar-cell active';
        if (activeIndex !== null) return 'bar-cell dimmed';
        return 'bar-cell';
    };

    const typeOptions = [
        { value: 'year', label: t('statistics.barChart.gamesByYear') || 'Par Année' },
        { value: 'tag', label: t('statistics.barChart.gamesByTag') || 'Par Tag' }
    ];

    const periodOptions = [
        { value: '2010-2020', label: '2010 - 2020' },
        { value: '2020-2030', label: '2020 - 2030' }
    ];

    return (
        <div className="year-chart-wrapper">
            <div className="year-chart-content">

                <div className="year-chart-header flex gap-4">
                    <CustomSelect
                        options={typeOptions}
                        value={viewType}
                        onChange={setViewType}
                    />

                    <CustomSelect
                        options={periodOptions}
                        value={period}
                        onChange={setPeriod}
                    />
                </div>

                <div className="year-chart-container">
                    <ResponsiveContainer>
                        <BarChart
                            data={currentData}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <XAxis
                                dataKey="name"
                                axisLine
                                tickLine={false}
                                stroke="#0068AC"
                                dy={10}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: 'transparent' }}
                                isAnimationActive={false}
                            />

                            <Bar
                                dataKey="count"
                                radius={[4, 4, 0, 0]}
                                barSize={35}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
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
                </div>
            </div>
        </div>
    );
};

export default YearChart;
