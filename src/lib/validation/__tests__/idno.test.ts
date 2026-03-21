import { describe, it, expect } from 'vitest'
import { validateIdno } from '../idno'

describe('validateIdno', () => {
  it('accepts a valid 13-digit IDNO with correct check digit', () => {
    // 7,3,1 weighted checksum: sum of (digit[i]*weight[i]) for i=0..11, mod 10 = check digit (13th)
    const result = validateIdno('1003600070656')
    expect(result).toEqual({ valid: true, idno: '1003600070656' })
  })

  it('rejects an IDNO with wrong check digit', () => {
    // Same prefix but last digit is 0 instead of correct 6
    const result = validateIdno('1003600070650')
    expect(result).toEqual({
      valid: false,
      error: 'IDNO invalid (cifra de control incorecta)',
    })
  })

  it('rejects an IDNO with wrong length', () => {
    const result = validateIdno('12345')
    expect(result).toEqual({
      valid: false,
      error: 'IDNO trebuie sa aiba exact 13 cifre',
    })
  })

  it('rejects an IDNO with non-digit characters', () => {
    const result = validateIdno('abcdefghijklm')
    expect(result).toEqual({
      valid: false,
      error: 'IDNO trebuie sa contina doar cifre',
    })
  })

  it('trims whitespace before validation', () => {
    const result = validateIdno(' 1003600070656 ')
    expect(result).toEqual({ valid: true, idno: '1003600070656' })
  })

  it('rejects an empty string', () => {
    const result = validateIdno('')
    expect(result).toEqual({
      valid: false,
      error: 'IDNO trebuie sa contina doar cifre',
    })
  })
})
