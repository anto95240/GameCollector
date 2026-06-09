export * from './gameValidators'
export * from './userValidators'

export const getFirstValidationError = (errors: Record<string, string>) => {
  const keys = Object.keys(errors)
  if (keys.length > 0) {
    return errors[keys[0]]
  }
  return null
}
