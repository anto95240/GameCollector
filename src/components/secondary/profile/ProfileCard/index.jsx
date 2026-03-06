import "./ProfileCard.css";

const ProfileCard = ({ id, title, children, actions, className = "" }) => {
  return (
    <section
      className={`profile-card console-border-card-profile ${className}`}
      id={id}
    >
      {title && (
        <>
          <h3>{title}</h3>
          <hr />
        </>
      )}

      <div className="profile-card-content">{children}</div>

      {actions && <div className="profile-actions-container">{actions}</div>}
    </section>
  );
};

export default ProfileCard;
