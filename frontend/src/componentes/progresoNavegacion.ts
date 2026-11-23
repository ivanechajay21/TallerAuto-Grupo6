type Listener = () => void;

let active = 0;
let doneTimer: number | null = null;
const listeners = new Set<Listener>();

export function navStart() {
  active += 1;
  if (doneTimer) {
    window.clearTimeout(doneTimer);
    doneTimer = null;
  }
  listeners.forEach((l) => l());
}

export function navFinish() {
  if (doneTimer) return;
  doneTimer = window.setTimeout(() => {
    active = Math.max(0, active - 1);
    doneTimer = null;
    listeners.forEach((l) => l());
  }, 300);
}

export function subscribeNav(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isNavActive() {
  return active > 0;
}