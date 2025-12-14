import { customAlphabet } from 'nanoid';

// Custom alphabet excluding i/I/l/L/o/O for clarity
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
const nanoid = customAlphabet(ALPHABET, 20);

/**
 * Entity type identifiers with custom prefixes
 * Format: [EntityLetter]0[nanoid(20)]
 */
export const id = {
  /** Generate user ID (U prefix) */
  user: () => `U0${nanoid()}`,

  /** Generate session ID (S prefix) */
  session: () => `S0${nanoid()}`,

  /** Generate project ID (P prefix) */
  project: () => `P0${nanoid()}`,

  /** Generate app ID (A prefix) */
  app: () => `A0${nanoid()}`,

  /** Generate identity ID (I prefix) */
  identity: () => `I0${nanoid()}`,

  /** Generate license ID (L prefix) */
  license: () => `L0${nanoid()}`,

  /** Generate auth code (C prefix) */
  authCode: () => `C0${nanoid()}`,

  /** Generate email verification code (E prefix) */
  emailVerification: () => `E0${nanoid()}`,
} as const;
