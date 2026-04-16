import "./Particles.css";

const Particles = () => {
  const particles = Array.from({ length: 6 });

  return (
    <div className="particle-container">
      {particles.map((_, i) => (
        <div 
          key={i}
          className="particle"
          style={{ "--delay": `${i * 0.3}s` }}
        ></div>
      ))}
    </div>
  );
};

export default Particles;
