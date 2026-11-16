import { createHash, timingSafeEqual } from 'node:crypto';

// Shortest ADMIN_KEY the API will accept. A short or guessable key is treated
// the same as a missing one, so a weak value can never switch the API on.
export const MIN_ADMIN_KEY_LENGTH = 32;

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest();
}

/**
 * Check the X-Admin-Key header against the configured key.
 * There is deliberately no default key: if ADMIN_KEY is missing or too short,
 * every request is refused with 503 so the problem is visible, never "open".
 *
 * @param {string|string[]|undefined} provided  value of the X-Admin-Key header
 * @param {string|undefined} configured         process.env.ADMIN_KEY
 * @returns {{ok: true} | {ok: false, status: number, error: string}}
 */
export function checkAdminKey(provided, configured) {
  if (typeof configured !== 'string' || configured.length < MIN_ADMIN_KEY_LENGTH) {
    console.error(
      `Admin API refused: ADMIN_KEY is not set or is shorter than ${MIN_ADMIN_KEY_LENGTH} characters`
    );
    return { ok: false, status: 503, error: 'Admin API is not configured' };
  }
  if (typeof provided !== 'string' || provided.length === 0) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  // Compare fixed-length hashes so the comparison time does not reveal the key.
  if (!timingSafeEqual(sha256(provided), sha256(configured))) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}
