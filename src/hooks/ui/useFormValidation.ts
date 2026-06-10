import { useCallback,useState } from 'react';

export const useFormValidation = (validateFn: any, data: any) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  // Derived errors (real-time validation)
  const derivedErrors = validateFn && data ? validateFn(data) : {};
  const errors: Record<string, string> = { ...derivedErrors, ...manualErrors };

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const validateAll = (dataToValidate = data) => {
    const currentErrors = validateFn ? validateFn(dataToValidate) : {};
    
    const allTouched = Object.keys(dataToValidate || {}).reduce((acc: Record<string, boolean>, key: string) => {
      acc[key] = true;
      return acc;
    }, {});
    // Add explicitly required fields that might be missing from data keys
    ["name", "platform", "genre", "status", "image"].forEach(key => {
        allTouched[key] = true;
    });

    setTouched(allTouched);
    
    return Object.keys(currentErrors).length === 0;
  };

  return {
    errors,
    touched,
    handleBlur,
    validateAll,
    setErrors: setManualErrors,
    setTouched
  };
};
