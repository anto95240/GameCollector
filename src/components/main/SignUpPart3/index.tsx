import '@/screens/Register/Register.css'

import { faLock } from '@fortawesome/free-solid-svg-icons'

import AuthInput from '@/components/common/AuthInput'

const SignUpPart3 = ({ data, update, t }: any) => {
  return (
    <div className="step-form-anim">
      <AuthInput
        type="password"
        name="password"
        placeholder={t('auth.register.password')}
        value={data.password}
        onChange={update}
        icon={faLock}
        required={true}
        isPassword={true}
        ariaLabelToggle={t('common.arialLabelPassword')}
      />

      <AuthInput
        type="password"
        name="passwordConfirm"
        placeholder={t('auth.register.confirmPassword')}
        value={data.passwordConfirm}
        onChange={update}
        icon={faLock}
        required={true}
        isPassword={true}
        ariaLabelToggle={t('common.arialLabelPassword')}
      />
    </div>
  )
}

export default SignUpPart3
