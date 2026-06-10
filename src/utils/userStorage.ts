const SENSITIVE_KEYS = new Set([
  "id",
  "_id",
  "uid",
  "userId",
  "token",
  "accessToken",
  "refreshToken",
  "password",
  "secret",
]);

const isPlainObject = (value: any) =>
  Object.prototype.toString.call(value) === "[object Object]";

export const sanitizeStoredUser = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sanitizeStoredUser);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((accumulator: Record<string, any>, [key, entryValue]) => {
    if (SENSITIVE_KEYS.has(key)) {
      return accumulator;
    }

    accumulator[key] = sanitizeStoredUser(entryValue);
    return accumulator;
  }, {} as Record<string, any>);
};

export const readStoredUser = () => {
  try {
    const savedItem = localStorage.getItem("user");
    if (!savedItem) return null;

    const parsedItem = JSON.parse(savedItem);

    // Vérification de l'expiration (24 heures)
    if (parsedItem.expiresAt && Date.now() > parsedItem.expiresAt) {
      localStorage.removeItem("user");
      return null;
    }

    // Compatibilité avec l'ancien format sans expiresAt
    if (!parsedItem.value && !parsedItem.expiresAt) {
      return sanitizeStoredUser(parsedItem);
    }

    return sanitizeStoredUser(parsedItem.value);
  } catch {
    return null;
  }
};

export const writeStoredUser = (user: any) => {
  if (!user) {
    localStorage.removeItem("user");
    return;
  }

  // Stocke l'utilisateur avec une expiration de 24 heures (86400000 ms)
  const itemToStore = {
    value: sanitizeStoredUser(user),
    expiresAt: Date.now() + 86400000,
  };

  localStorage.setItem("user", JSON.stringify(itemToStore));
};

export const mergeStoredUser = (patch: any) => {
  const currentUser = readStoredUser() || {};
  writeStoredUser({ ...currentUser, ...patch });
};

export const incrementStoredUserMetric = (key: string, step = 1) => {
  const currentUser = readStoredUser() || {};
  const currentValue = Number(currentUser[key] || 0);
  const nextValue = currentValue + step;

  writeStoredUser({
    ...currentUser,
    [key]: nextValue,
  });

  return nextValue;
};

export const removeStoredUser = () => {
  localStorage.removeItem("user");
};