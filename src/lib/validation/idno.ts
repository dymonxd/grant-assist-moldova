const WEIGHTS = [7, 3, 1, 7, 3, 1, 7, 3, 1, 7, 3, 1] as const

function calcCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += WEIGHTS[i] * parseInt(digits[i], 10)
  }
  return sum % 10
}

export function validateIdno(
  input: string
): { valid: true; idno: string } | { valid: false; error: string } {
  const cleaned = input.replace(/\s/g, '')

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'IDNO trebuie sa contina doar cifre' }
  }
  if (cleaned.length !== 13) {
    return { valid: false, error: 'IDNO trebuie sa aiba exact 13 cifre' }
  }
  if (parseInt(cleaned[12], 10) !== calcCheckDigit(cleaned)) {
    return { valid: false, error: 'IDNO invalid (cifra de control incorecta)' }
  }

  return { valid: true, idno: cleaned }
}
