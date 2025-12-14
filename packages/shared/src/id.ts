import { customAlphabet } from 'nanoid';

// Custom alphabet excluding i/I/l/L/o/O for clarity
const ALPHABET = '0123456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ';

// Create nanoid generators with specific lengths
const nano9 = customAlphabet(ALPHABET, 9);
const nano11 = customAlphabet(ALPHABET, 11);
const nano12 = customAlphabet(ALPHABET, 12);

/**
 * Entity type identifiers with compact prefixes
 * Format: [EntityLetter][0][nanoid(9-12)]
 * 
 * Examples:
 * - U0sFFDmgde (user, 11 chars)
 * - S0mK9pQxCa (session, 13 chars)
 * - C0pN7mKqXc9A (auth code, 14 chars)
 */
export const id = {
  /** Generate user ID (U0, 11 chars total) */
  user: () => `U0${nano9()}`,

  /** Generate session ID (S0, 13 chars total) */
  session: () => `S0${nano11()}`,

  /** Generate project ID (P0, 11 chars total) */
  project: () => `P0${nano9()}`,

  /** Generate app ID (A0, 11 chars total) */
  app: () => `A0${nano9()}`,

  /** Generate identity ID (I0, 11 chars total) */
  identity: () => `I0${nano9()}`,

  /** Generate project member ID (M0, 11 chars total) */
  projectMember: () => `M0${nano9()}`,

  /** Generate license ID (L0, 11 chars total) */
  license: () => `L0${nano9()}`,

  /** Generate auth code (C0, 14 chars total) */
  authCode: () => `C0${nano12()}`,

  /** Generate email verification code (E0, 11 chars total) */
  emailVerification: () => `E0${nano9()}`,

  /** Generate audit log ID (AL0, 12 chars total) */
  auditLog: () => `AL0${nano9()}`,
} as const;

/**
 * Validation patterns for ID formats
 */
export const idPatterns = {
  user: /^U0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  project: /^P0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  app: /^A0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  license: /^L0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  identity: /^I0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  session: /^S0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{11}$/,
  authCode: /^C0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{12}$/,
  emailVerification: /^E0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
  auditLog: /^AL0[0-9a-hjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTVWXYZ]{9}$/,
} as const;

/**
 * Validate an ID against a specific pattern
 */
export function validateId(type: keyof typeof idPatterns, id: string): boolean {
  return idPatterns[type].test(id);
}
