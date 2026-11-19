import { describe, it, expect } from 'vitest'
import { validateGmail, normalizeGmail } from './email'

describe('validateGmail & normalizeGmail Unit Tests', () => {
  it('menolak email non-gmail seperti "luqman@smk"', () => {
    const result = validateGmail('luqman@smk')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('@gmail.com')
      expect(result.suggestion).toBeUndefined()
    }
  })

  it('menolak typo domain "luqman@gmial.com" dan memberikan saran perbaikan', () => {
    const result = validateGmail('luqman@gmial.com')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.suggestion).toBe('Maksud kamu luqman@gmail.com?')
      expect(result.error).toContain('Maksud kamu luqman@gmail.com?')
    }
  })

  it('menerima dan merapikan email dengan spasi luar dan huruf besar " Luqman@Gmail.com "', () => {
    const result = validateGmail(' Luqman@Gmail.com ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.email).toBe('luqman@gmail.com')
      expect(result.normalized).toBe('luqman@gmail.com')
    }
  })

  it('menerima dan menormalisasi email bertitik & plus tag "l.uqman+tes@gmail.com"', () => {
    const result = validateGmail('l.uqman+tes@gmail.com')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.email).toBe('l.uqman+tes@gmail.com')
      expect(result.normalized).toBe('luqman@gmail.com')
    }
  })

  it('menolak string kosong atau hanya spasi', () => {
    const resultEmpty = validateGmail('')
    expect(resultEmpty.success).toBe(false)
    if (!resultEmpty.success) {
      expect(resultEmpty.error).toContain('kosong')
    }

    const resultSpacesOnly = validateGmail('   ')
    expect(resultSpacesOnly.success).toBe(false)
    if (!resultSpacesOnly.success) {
      expect(resultSpacesOnly.error).toContain('kosong')
    }
  })

  it('menolak email dengan spasi di tengah', () => {
    const result = validateGmail('luq man@gmail.com')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('spasi')
    }
  })

  it('memberikan saran untuk variasi typo lainnya (gmail.co, gmail.con, gmai.com, gmail tanpa domain)', () => {
    const typos = [
      { input: 'luqman@gmail.co', expected: 'Maksud kamu luqman@gmail.com?' },
      { input: 'luqman@gmail.con', expected: 'Maksud kamu luqman@gmail.com?' },
      { input: 'luqman@gmai.com', expected: 'Maksud kamu luqman@gmail.com?' },
      { input: 'luqman@gmail', expected: 'Maksud kamu luqman@gmail.com?' },
    ]

    for (const { input, expected } of typos) {
      const res = validateGmail(input)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.suggestion).toBe(expected)
      }
    }
  })

  it('fungsi normalizeGmail mengabaikan titik bertingkat dan tag kompleks', () => {
    expect(normalizeGmail('  l.u.q.m.a.n+kerja.tugas@gmail.com ')).toBe('luqman@gmail.com')
  })
})
