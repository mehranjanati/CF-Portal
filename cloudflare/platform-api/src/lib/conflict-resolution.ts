export type VersionVector = Record<string, number>;

export function compareVersionVectors(v1: VersionVector, v2: VersionVector): 'less' | 'greater' | 'equal' | 'concurrent' {
  let v1Less = false;
  let v1Greater = false;

  const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);

  for (const key of allKeys) {
    const val1 = v1[key] || 0;
    const val2 = v2[key] || 0;

    if (val1 < val2) {
      v1Less = true;
    } else if (val1 > val2) {
      v1Greater = true;
    }
  }

  if (v1Less && v1Greater) {
    return 'concurrent';
  } else if (v1Less) {
    return 'less';
  } else if (v1Greater) {
    return 'greater';
  } else {
    return 'equal';
  }
}

export function mergeVersionVectors(v1: VersionVector, v2: VersionVector): VersionVector {
  const merged: VersionVector = { ...v1 };
  for (const [key, val] of Object.entries(v2)) {
    merged[key] = Math.max(merged[key] || 0, val);
  }
  return merged;
}
