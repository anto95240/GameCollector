import './StatCard.css';

import React from 'react';

const StatCard = ({ title, value }: { title: string; value: React.ReactNode }) => {
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
    </div>
  )
}

export default React.memo(StatCard)
