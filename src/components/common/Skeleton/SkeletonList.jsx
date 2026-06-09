import './Skeleton.css'

import SkeletonCard from './SkeletonCard'

const SkeletonList = ({ count = 5, className = '' }) => {
  return (
    <div className={`skeleton-list-container ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

export default SkeletonList
