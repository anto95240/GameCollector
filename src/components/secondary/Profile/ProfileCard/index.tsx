import './ProfileCard.css';

export interface ProfileCardProps {
  id?: string;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ id, title, children, actions, className = '' }: any) => {
  return (
    <section className={`profile-card ${className}`} id={id}>
      {title && (
        <>
          <h3>{title}</h3>
          <hr />
        </>
      )}

      <div className="profile-card-content">{children}</div>

      {actions && <div className="profile-actions-container">{actions}</div>}
    </section>
  )
}

export default ProfileCard
