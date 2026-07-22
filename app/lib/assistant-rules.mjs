export function cryptoIndex(length) {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError("length must be positive");
  }
  const ceiling = Math.floor(0x100000000 / length) * length;
  const sample = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(sample); while (sample[0] >= ceiling);
  return sample[0] % length;
}

export function createSequenceRng(sequence) {
  let cursor = 0;
  return (length) => {
    if (!Number.isInteger(length) || length < 1) {
      throw new RangeError("length must be positive");
    }
    const next = sequence[cursor] ?? 0;
    cursor += 1;
    return Math.abs(next) % length;
  };
}

export function drawUnique(items, count, used = new Set(), rng = cryptoIndex) {
  const available = items.filter((item) => !used.has(item));
  const drawn = [];
  while (available.length && drawn.length < count) {
    drawn.push(available.splice(rng(available.length), 1)[0]);
  }
  return drawn;
}

export function getAssistantStorageKey(moduleId, heroId) {
  return `miansha-assistant:v1:${moduleId}:${heroId}`;
}

export function loadAssistantState(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveAssistantState(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearAssistantState(storage, key) {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
