#!/usr/bin/env ts-node
// Quick script to validate AiM CSV parsing & normalization without browser

import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { maybeNormalizeAimCsv } from '../src/utils/aimNormalization';

function parseCsv(file: string) {
  const text = fs.readFileSync(file, 'utf8');
  const result = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (result.errors.length) {
    throw new Error('Parse errors: ' + result.errors.map(e => e.message).join('; '));
  }
  return result.data as any[];
}

function main() {
  const rel = process.argv[2];
  if (!rel) {
    console.error('Usage: test-aim-parse <csv-file>');
    process.exit(1);
  }
  const file = path.resolve(rel);
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(1);
  }
  console.log('Reading', file);
  const raw = parseCsv(file);
  console.log('Raw rows:', raw.length);
  const headers = Object.keys(raw[0] || {});
  console.log('Original headers sample:', headers.slice(0, 15));
  const hasLat = headers.some(h => h.toLowerCase().includes('lat'));
  const hasLon = headers.some(h => h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng'));
  let data = raw;
  if (!hasLat || !hasLon) {
    const norm = maybeNormalizeAimCsv(raw);
    console.log('Normalization:', norm.normalized, norm.notes);
    data = norm.data;
  } else {
    const norm = maybeNormalizeAimCsv(raw);
    if (norm.normalized) {
      data = norm.data; // unify names
      console.log('Applied normalization (even though lat/lon detected). Notes:', norm.notes);
    }
  }
  const newHeaders = Object.keys(data[0] || {});
  console.log('Post headers include lat?', newHeaders.includes('lat'), 'lon?', newHeaders.includes('lon'));
  console.log('Sample row:', Object.fromEntries(Object.entries(data[0]).slice(0, 12)));
  const numericPoints = data.filter(r => typeof r.lat === 'number' && typeof r.lon === 'number').length;
  console.log('Rows with numeric lat/lon:', numericPoints);
}

main();
