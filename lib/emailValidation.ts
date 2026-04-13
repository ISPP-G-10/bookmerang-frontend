const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function getEmailValidationError(
  value: string,
  required = true,
): string | null {
  const normalizedValue = normalizeEmail(value);

  if (!normalizedValue) {
    return required ? "El correo electrónico es obligatorio." : null;
  }

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    return "El correo electrónico no es válido.";
  }

  return null;
}
