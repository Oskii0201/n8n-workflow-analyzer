export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export function requireString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number; trim?: boolean }
): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { ok: false, error: `${fieldName} must be a string` }
  }

  const trimmed = options?.trim ? value.trim() : value

  if (options?.minLength !== undefined && trimmed.length < options.minLength) {
    return { ok: false, error: `${fieldName} is required` }
  }

  if (options?.maxLength !== undefined && trimmed.length > options.maxLength) {
    return { ok: false, error: `${fieldName} is too long` }
  }

  return { ok: true, value: trimmed }
}

export function requireUrl(
  value: unknown,
  fieldName: string,
  options?: { trim?: boolean }
): ValidationResult<string> {
  const base = requireString(value, fieldName, { minLength: 1, trim: options?.trim ?? true })
  if (!base.ok) {
    return base
  }

  try {
    const url = new URL(base.value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, error: `${fieldName} must start with http or https` }
    }
  } catch {
    return { ok: false, error: `${fieldName} must be a valid URL` }
  }

  return { ok: true, value: base.value.replace(/\/$/, '') }
}
