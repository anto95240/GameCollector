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
    <div className="account-info-item">
      <div>
        <p className="label">{label}</p>
        <p className="value">{value}</p>
      </div>
      <button className="btn-light-small" onClick={toggleForm}>
        {buttonLabel}
      </button>
    </div>  
    
    {showForm && (
      <div className="inline-form">
        <input
          type={inputType}
          placeholder={placeholder}
          value={formValue}
          onChange={onFormChange}
        />
      </div>
    )}
  </>
);

export default InlineFormItem;