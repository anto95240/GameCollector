import './SimpleInput.css';

export interface SimpleInputProps {
  label: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}

const SimpleInput: React.FC<SimpleInputProps> = ({ label, value, onChange, type = 'text', placeholder }: any) => {
  return (
    <div className="simple-input-group floating-label-group">
      <input type={type} value={value} onChange={onChange} placeholder={placeholder || " "} />
      <label>{label}</label>
    </div>
  )
}

export default SimpleInput
