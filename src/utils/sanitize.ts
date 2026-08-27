/**
 * Strips all undefined properties recursively from objects before persisting to Firestore.
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const result: any = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      continue;
    }
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      result[key] = sanitizeFirestorePayload(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}
