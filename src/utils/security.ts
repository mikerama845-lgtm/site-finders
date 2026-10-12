/**
 * Owner Access Control & Lock System
 * Prevents unauthorized users, clients, or team members from deleting or modifying sheets.
 */

const PIN_STORAGE_KEY = 'seo_reseller_owner_pin';
const LOCK_STATE_KEY = 'seo_reseller_lock_state';

// Simple fast hash for client-side lock checking
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${hash}`;
}

export const OWNER_PASSWORD = 'mikerama433904';

export function getStoredPinHash(): string {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // fallback
  }
  // Default owner password
  return hashPin(OWNER_PASSWORD);
}

export function setCustomPin(newPin: string): void {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, hashPin(newPin));
  } catch {
    // ignore
  }
}

export function isPinCorrect(enteredPin: string): boolean {
  const clean = enteredPin.trim();
  if (clean === OWNER_PASSWORD) return true;
  const currentHash = getStoredPinHash();
  return hashPin(clean) === currentHash;
}

export function getInitialLockState(): boolean {
  try {
    const saved = localStorage.getItem(LOCK_STATE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    // fallback
  }
  // Default is locked for safety so only owner with PIN can edit
  return true;
}

export function saveLockState(isLocked: boolean): void {
  try {
    localStorage.setItem(LOCK_STATE_KEY, isLocked ? 'true' : 'false');
  } catch {
    // ignore
  }
}
