import './SectionWrapper.css'

interface SectionWrapperProps {
  id: string
  title: React.ReactNode
  children: React.ReactNode
  className?: string
}

const SectionWrapper = ({ id, title, children, className = '' }: SectionWrapperProps) => {
  return (
    <div id={id} className={`form-section ${className}`}>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export default SectionWrapper
