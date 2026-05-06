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

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

export const sanitizeStoredUser = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeStoredUser);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((accumulator, [key, entryValue]) => {
    if (SENSITIVE_KEYS.has(key)) {
      return accumulator;
    }

    accumulator[key] = sanitizeStoredUser(entryValue);
    return accumulator;
  }, {});
};

export const readStoredUser = () => {
  try {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;

    return sanitizeStoredUser(JSON.parse(savedUser));
  } catch {
    return null;
  }
};

export const writeStoredUser = (user) => {
  if (!user) {
    localStorage.removeItem("user");
    return;
  }

  localStorage.setItem("user", JSON.stringify(sanitizeStoredUser(user)));
};

export const mergeStoredUser = (patch) => {
  const currentUser = readStoredUser() || {};
  writeStoredUser({ ...currentUser, ...patch });
};

export const incrementStoredUserMetric = (key, step = 1) => {
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