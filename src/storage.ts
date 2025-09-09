import { CroissantSpot } from './types';

const KEY = 'croissant-spots-v1';
const AVATAR_KEY = 'croissant-avatar';

export function loadSpots(): CroissantSpot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as CroissantSpot[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSpots(spots: CroissantSpot[]) {
  try { localStorage.setItem(KEY, JSON.stringify(spots)); } catch {}
}

export function loadAvatar(): string | null {
  return localStorage.getItem(AVATAR_KEY);
}

export function saveAvatar(dataUrl: string) {
  try { localStorage.setItem(AVATAR_KEY, dataUrl); } catch {}
}
