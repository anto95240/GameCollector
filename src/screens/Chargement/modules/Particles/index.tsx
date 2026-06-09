import './Particles.css'

const Particles = () => {
  const particles = Array.from({ length: 6 })

  return (
    <div className="particle-container">
      {particles.map((_: any, i: any) => (
        <div key={i} className="particle" style={{ '--delay': `${i * 0.3}s` } as React.CSSProperties}></div>
      ))}
    </div>
  )
}

export default Particles
