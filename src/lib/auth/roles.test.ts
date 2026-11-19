import { describe, it, expect } from 'vitest'
import { homePathForRole, isRole } from './roles'

describe('roles.ts Unit Tests', () => {
  it('memetakan setiap role ke rute beranda yang tepat', () => {
    expect(homePathForRole('admin')).toBe('/admin')
    expect(homePathForRole('teacher')).toBe('/guru')
    expect(homePathForRole('student')).toBe('/murid')
    expect(homePathForRole('parent')).toBe('/ortu')
  })

  it('isRole mengidentifikasi string role yang valid dan tidak valid', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('teacher')).toBe(true)
    expect(isRole('student')).toBe(true)
    expect(isRole('parent')).toBe(true)
    expect(isRole('superuser')).toBe(false)
    expect(isRole('')).toBe(false)
    expect(isRole(null)).toBe(false)
  })
})
