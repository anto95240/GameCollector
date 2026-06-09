import './Skeleton.css'

import SkeletonText from './SkeletonText'

const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-card-bg skeleton-pulse" />
      <div className="skeleton-card-content">
        <SkeletonText width="80%" height="20px" />
        <SkeletonText width="50%" height="16px" />
      </div>
    </div>
  )
}

export default SkeletonCard
