import "./InlineFormItem.css";

const InlineFormItem = ({
  label,
  value,
  placeholder,
  showForm,
  inputType = "text",
  toggleForm,
  formValue,
  onFormChange,
  buttonLabel,
}) => (
  <>
    {/* Partie Info (Inchangée) */}
    <div className="account-info-item">
      <div>
        <p className="label">{label}</p>
        <p className="value">{value}</p>
      </div>
      <button className="btn-light-small" onClick={toggleForm}>
        {buttonLabel}
      </button>
    </div>  
    
    {/* Partie Formulaire avec Animation */}
    {/* On retire {showForm && ...} et on utilise une classe */}
    <div className={`inline-form-wrapper ${showForm ? "open" : ""}`}>
      <div className="inline-form-content">
        <input
          type={inputType}
          placeholder={placeholder}
          value={formValue}
          onChange={onFormChange}
        />
      </div>
    </div>
  </>
);

export default InlineFormItem;