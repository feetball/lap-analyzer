// AiM Race Studio CSV normalization utilities
// Maps verbose AiM headers to concise canonical keys used by the app
// (lat, lon, speed, time, rpm, throttle, brake) while retaining original columns.

export interface AimNormalizationResult {
  data: any[];
  mappings: Record<string, string>; // original header -> canonical header
  normalized: boolean;
  notes: string[];
}

interface NormalizeOptions {
  convertSpeedTo?: 'mps' | 'mph' | 'none';
}

const SPEED_KMH_TO_MPS = 1000 / 3600;
const SPEED_KMH_TO_MPH = 0.621371;

const HEADER_MAPPINGS: Array<{
  test: (h: string) => boolean;
  canonical: string;
  note?: string;
  transform?: (v: any, opts: NormalizeOptions) => any;
}> = [
  { test: h => /^gps latitude$/i.test(h), canonical: 'lat' },
  { test: h => /^latitude$|^lat$/i.test(h), canonical: 'lat' },
  { test: h => /^gps longitude$/i.test(h), canonical: 'lon' },
  { test: h => /^longitude$|^lon$|^lng$/i.test(h), canonical: 'lon' },
  {
    test: h => /^gps speed.*km\/h$/i.test(h) || /^speed \(km\/h\)$/i.test(h) || /^speed kmh$/i.test(h),
    canonical: 'speed',
    note: 'Speed originally in km/h',
    transform: (v, opts) => {
      if (typeof v !== 'number' || isNaN(v)) return v;
      switch (opts.convertSpeedTo) {
        case 'mps': return v * SPEED_KMH_TO_MPS;
        case 'mph': return v * SPEED_KMH_TO_MPH;
        default: return v; // keep km/h
      }
    }
  },
  { test: h => /^gps speed$/i.test(h), canonical: 'speed' },
  { test: h => /^speed$/i.test(h), canonical: 'speed' },
  { test: h => /^engine rpm$|^rpm$/i.test(h), canonical: 'rpm' },
  { test: h => /^throttle position$|^throttle pos$|^throttle$/i.test(h), canonical: 'throttle' },
  { test: h => /^brake pressure.*$/i.test(h), canonical: 'brake' },
  { test: h => /^gps time$|^time$|^timestamp$|^session time$/i.test(h), canonical: 'time' },
];

export function normalizeAimCsv(data: any[], options: NormalizeOptions = { convertSpeedTo: 'none' }): AimNormalizationResult {
  if (!data || data.length === 0) {
    return { data, mappings: {}, normalized: false, notes: ['Empty data set'] };
  }

  const firstRow = data[0];
  const headers = Object.keys(firstRow);
  const mappings: Record<string, string> = {};
  const notes: string[] = [];

  const aimIndicators = headers.filter(h => /gps /i.test(h) || /engine rpm/i.test(h));
  const isLikelyAim = aimIndicators.length >= 2;
  if (!isLikelyAim) {
    return { data, mappings: {}, normalized: false, notes: ['Not detected as AiM format'] };
  }

  headers.forEach(h => {
    const rule = HEADER_MAPPINGS.find(r => r.test(h));
    if (rule) {
      if (!headers.includes(rule.canonical) || rule.canonical === 'time') {
        mappings[h] = rule.canonical;
        if (rule.note) notes.push(rule.note);
      }
    }
  });

  if (Object.keys(mappings).length === 0) {
    return { data, mappings, normalized: false, notes: ['AiM detected but no mappable headers found'] };
  }

  const transformed = data.map(row => {
    const newRow = { ...row };
    for (const [original, canonical] of Object.entries(mappings)) {
      if (original in row) {
        const rule = HEADER_MAPPINGS.find(r => r.test(original));
        let value = row[original];
        if (rule?.transform) value = rule.transform(value, options);
        if (!(canonical in newRow)) newRow[canonical] = value;
      }
    }
    return newRow;
  });

  if (options.convertSpeedTo && options.convertSpeedTo !== 'none') {
    notes.push(`Speed converted to ${options.convertSpeedTo}`);
  }

  return { data: transformed, mappings, normalized: true, notes };
}

export function maybeNormalizeAimCsv(data: any[]): AimNormalizationResult {
  return normalizeAimCsv(data, { convertSpeedTo: 'none' });
}
