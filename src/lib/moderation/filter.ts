/**
 * Minimal objectionable-content filter for user-generated text.
 * Intentionally simple: App Store 1.2 requires *a* mechanism, not a
 * production-grade filter. We block the most common slurs/hostile terms
 * and let the human report queue handle everything else.
 *
 * Keep this list conservative — over-filtering causes user frustration.
 */
const BLOCKLIST: RegExp[] = [
  // Slurs (word-boundary; case-insensitive)
  /\bf[a@]gg?[o0]t\b/i,
  /\bn[i1]gg?[e3]r\b/i,
  /\bn[i1]gg?[a4]\b/i,
  /\bk[i1]ke\b/i,
  /\bch[i1]nk\b/i,
  /\bsp[i1]c\b/i,
  /\bt[r][a4]nny\b/i,
  /\bre[t7][a4]rd\b/i,
  // Explicit sexual solicitation patterns
  /\bsend\s+nudes\b/i,
  /\bd[i1]ck\s+pic\b/i,
  // Doxing / threats
  /\bk[i1]ll\s+your?self\b/i,
  /\bkys\b/i,
];

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Check if text is allowed. Returns { ok: true } if fine, or
 * { ok: false, reason } if it contains objectionable content.
 */
export function checkContent(text: string): ModerationResult {
  if (!text || !text.trim()) {
    return { ok: true };
  }
  for (const rx of BLOCKLIST) {
    if (rx.test(text)) {
      return {
        ok: false,
        reason:
          "Your message was blocked because it appears to contain prohibited language. If you believe this is a mistake, please contact support.",
      };
    }
  }
  return { ok: true };
}
