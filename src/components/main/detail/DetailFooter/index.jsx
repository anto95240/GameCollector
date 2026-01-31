import GameCard from "../../../common/GameCard";
import "./DetailFooter.css";

const DetailFooter = () => {
    // Mock data plus complet pour simuler de vrais jeux dans la GameCard
    const recentGames = [
        { id: 101, name: "Elden Ring", image: "https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/phvVT0qZfcRms5qDAk0SI3CM.png", rating: 5, status: "Terminé" },
        { id: 102, name: "Cyberpunk 2077", image: "https://image.api.playstation.com/vulcan/ap/rnd/202311/2812/2855217417534444583b276707835109b02221295e869766.png", rating: 4, status: "En cours" },
        { id: 103, name: "Hades", image: "https://image.api.playstation.com/vulcan/ap/rnd/202104/0517/968c34749652f14300000000000000000000000000000000.png", rating: 5, status: "Terminé" },
        { id: 104, name: "Zelda BOTW", image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/software/switch/70010000000025/7137262b5a64d921e193653f8aa0b722925abc5680380ca0e18a77969113f010", rating: 5, status: "Terminé" },
    ];

    return (
        <footer className="footer-section">
            <h3 className="footer-title">Récemment consultés</h3>
            <div className="recent-scroll no-scrollbar">
                {recentGames.map((gameMock) => (
                    <div key={gameMock.id} className="recent-card-wrapper">
                        {/* Utilisation de la GameCard Dashboard */}
                        <GameCard 
                            variant="dashboard" 
                            game={gameMock} 
                        />
                    </div>
                ))}
            </div>
        </footer>
    );
};

export default DetailFooter;