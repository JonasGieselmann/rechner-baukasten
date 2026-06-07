// Current versions of the legal texts a user consents to. Bump the value when
// the corresponding document changes so the consent log stays auditable
// (DSGVO Art. 7 Abs. 1: which exact wording did the person agree to).
export const LEGAL_VERSIONS = {
  privacy: '2026-06',
  terms: '2026-06',
  marketing: '2026-06',
} as const;

export type ConsentType = keyof typeof LEGAL_VERSIONS;
