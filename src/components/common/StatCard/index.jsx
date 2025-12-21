import "./statCard.css";

const StatCard = ({ title, value }) => {
    return (
        <div className="stat-card flex flex-col justify-center">
            <p className="stat-title">{title}</p>
            <p className="stat-value">{value}</p>
        </div>
    );
};

export default StatCard;