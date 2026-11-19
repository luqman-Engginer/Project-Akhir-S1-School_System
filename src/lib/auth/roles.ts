export type Role = 'admin' | 'teacher' | 'student' | 'parent'

export const ROLES: readonly Role[] = ['admin', 'teacher', 'student', 'parent'] as const

/**
 * Mengembalikan rute halaman beranda sesuai peran pengguna.
 */
export function homePathForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'teacher':
      return '/guru'
    case 'student':
      return '/murid'
    case 'parent':
      return '/ortu'
    default: {
      const _exhaustiveCheck: never = role
      return '/login'
    }
  }
}

/**
 * Type guard untuk memeriksa apakah suatu nilai merupakan Role yang valid.
 */
export function isRole(val: unknown): val is Role {
  return typeof val === 'string' && (ROLES as readonly string[]).includes(val)
}
