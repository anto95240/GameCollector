import "./gameCard.css";

const GameCard = ({ name }) => {
    return (
        <div className="game-card flex flex-col justify-end items-center p-3">
            <p className="game-name text-center">{name}</p>
        </div>
    );
};

export default GameCard;