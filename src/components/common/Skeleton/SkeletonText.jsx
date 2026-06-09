import './Skeleton.css'

const SkeletonText = ({ width = '100%', height = '16px', className = '' }) => {
  return <div className={`skeleton-pulse skeleton-text ${className}`} style={{ width, height }} />
}

export default SkeletonText
