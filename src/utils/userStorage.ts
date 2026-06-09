const SENSITIVE_KEYS = new Set([
  'id',
  '_id',
  'uid',
  'userId',
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'secret',
])

const isPlainObject = (value: any) => Object.prototype.toString.call(value) === '[object Object]'

export const sanitizeStoredUser = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sanitizeStoredUser)
  }

  if (!isPlainObject(value)) {
    return value
  }

  return Object.entries(value).reduce((accumulator: Record<string, any>, [key, entryValue]: any) => {
    if (SENSITIVE_KEYS.has(key)) {
      return accumulator
    }

    accumulator[key] = sanitizeStoredUser(entryValue)
    return accumulator
  }, {})
}

export const readStoredUser = (): any => {
  try {
    const savedUser = localStorage.getItem('user')
    if (!savedUser) return null

    return sanitizeStoredUser(JSON.parse(savedUser))
  } catch {
    return null
  }
}

export const writeStoredUser = (user: any) => {
  if (!user) {
    localStorage.removeItem('user')
    return
  }

  localStorage.setItem('user', JSON.stringify(sanitizeStoredUser(user)))
}

export const mergeStoredUser = (patch: any) => {
  const currentUser = readStoredUser() || {}
  writeStoredUser({ ...currentUser, ...patch })
}

export const incrementStoredUserMetric = (key: string, step = 1) => {
  const currentUser = readStoredUser() || {}
  const currentValue = Number(currentUser[key] || 0)
  const nextValue = currentValue + step

  writeStoredUser({
    ...currentUser,
    [key]: nextValue,
  })

  return nextValue
}

export const removeStoredUser = () => {
  localStorage.removeItem('user')
}
