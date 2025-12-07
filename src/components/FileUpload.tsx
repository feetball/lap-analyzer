'use client';

import { useState, useCallback } from 'react';
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { maybeNormalizeAimCsv } from '../utils/aimNormalization';

interface FileUploadProps {
  onDataLoad: (data: any[], fileName?: string) => void;
}

export default function FileUpload({ onDataLoad }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadedFile(file);

    let attemptedFallback = false;

    const parseWithHeaderTrue = () => Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: '', // allow auto-detect (AiM exports may vary)
      beforeFirstChunk: (chunk) => {
        // Trim AiM metadata preamble so the header row is first
        try {
          const lines = chunk.split(/\r\n|\n/);
          // find header row containing GPS Latitude and GPS Longitude
          const headerIdx = lines.findIndex((ln) => /gps latitude/i.test(ln) && /gps longitude/i.test(ln));
          if (headerIdx > 0) {
            return lines.slice(headerIdx).join('\n');
          }
        } catch (e) {
          // fall through to default chunk
        }
        return chunk;
      },
      complete: (results) => {
        if (results.errors.length > 0) {
          const msg = results.errors[0].message || '';
          // If Papa complains about field count mismatch, try fallback parser
          if (/Too many fields|Too few fields/i.test(msg)) {
            attemptedFallback = true;
            parseAimStyleFallback();
            return;
          }
          // Non-field-count errors are treated as fatal
          setError('Error parsing CSV file: ' + msg);
          setIsLoading(false);
          return;
        }

        // Validate that we have GPS data
        let data = results.data as any[];
        // If first row is a units row (AiM), drop it
        const unitPattern = /(km\/h|deg|rpm|°C|%|g|V|bar|gear|m\/s|mm|l\/s|A\/F|s\b)/i;
        const looksLikeUnitsRow = (row: any) => row && typeof row === 'object' && Object.values(row).some(v => typeof v === 'string' && unitPattern.test(v));
        if (data.length > 0 && looksLikeUnitsRow(data[0])) {
          data = data.slice(1);
        }
        const headers = Object.keys(data[0] || {});
        const hasLatitude = headers.some(h => h.toLowerCase().includes('lat'));
  const hasLongitude = headers.some(h => h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng'));
        
        if (!hasLatitude || !hasLongitude) {
          // Attempt fallback for AiM metadata preamble format only once
          if (!attemptedFallback) {
            attemptedFallback = true;
            parseAimStyleFallback();
            return;
          }
          // Attempt AiM normalization to produce canonical lat/lon keys
          const aimResult = maybeNormalizeAimCsv(data);
          if (aimResult.normalized) {
            data = aimResult.data;
          }
          const postHeaders = Object.keys(data[0] || {});
            const postHasLat = postHeaders.some(h => h.toLowerCase() === 'lat');
            const postHasLon = postHeaders.some(h => h.toLowerCase() === 'lon');
            if (!postHasLat || !postHasLon) {
              setError('CSV file must contain (or map to) latitude and longitude columns');
              setIsLoading(false);
              return;
            }
        }

        onDataLoad(data, file.name);
        setIsLoading(false);
      },
      error: (error) => {
        setError('Error reading file: ' + error.message);
        setIsLoading(false);
      }
    });

  const parseAimStyleFallback = () => Papa.parse(file, {
      header: false,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: '',
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file (fallback): ' + results.errors[0].message);
          setIsLoading(false);
          return;
        }
        const rows = results.data as any[];
        if (!Array.isArray(rows) || rows.length === 0) {
          setError('CSV appears empty after fallback parsing');
          setIsLoading(false);
          return;
        }
        // Try 1) fixed AiM row indices (1-based: header 15, units 16, data 18) -> 0-based: 14,15,17
        let headerIndex = 14;
        const unitIndex = 15;
        let dataStart = 17;
        const unitPattern = /(km\/h|deg|rpm|°C|%|g|V|bar|gear|m\/s|mm|l\/s|A\/F)/i;

        const hasFixedHeader = rows[headerIndex] && Array.isArray(rows[headerIndex]) && rows[headerIndex].length >= 2;
        const fixedLooksLikeUnits = rows[unitIndex] && Array.isArray(rows[unitIndex]) && rows[unitIndex].some((c: any) => unitPattern.test(String(c)));

        if (!hasFixedHeader || !fixedLooksLikeUnits) {
          // 2) Fallback: scan for a row containing both latitude & longitude headers
          const scannedHeaderIndex = rows.findIndex(r => Array.isArray(r) && r.some((c: any) => /gps latitude|latitude|lat/i.test(String(c))) && r.some((c: any) => /gps longitude|longitude|lon|lng/i.test(String(c))));
          if (scannedHeaderIndex === -1) {
            setError('Could not locate header row with GPS latitude/longitude');
            setIsLoading(false);
            return;
          }
          headerIndex = scannedHeaderIndex;
          const nextRow = rows[headerIndex + 1] || [];
          const hasUnits = Array.isArray(nextRow) && nextRow.some((c: any) => unitPattern.test(String(c)));
          dataStart = headerIndex + 1 + (hasUnits ? 1 : 0);
        }

        const headerRow = rows[headerIndex].map((c: any) => String(c).trim().replace(/^\"|\"$/g, ''));

        // If dataStart row isn't numeric data yet, skip until a row with mostly numeric values appears
        const isMostlyNumeric = (arr: any[]) => {
          if (!Array.isArray(arr) || arr.length === 0) return false;
          const nums = arr.filter((v: any) => /^-?\d+(\.\d+)?$/.test(String(v).trim()));
          return nums.length >= Math.max(3, Math.floor(arr.length * 0.5));
        };
        let startIdx = dataStart;
        while (startIdx < rows.length && (!Array.isArray(rows[startIdx]) || rows[startIdx].length < 2 || !isMostlyNumeric(rows[startIdx]))) {
          startIdx++;
        }
        if (startIdx >= rows.length) {
          setError('Did not find data rows after header');
          setIsLoading(false);
          return;
        }
        const objects: any[] = [];
    for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
            if (!Array.isArray(row)) continue;
            if (row.length < 2) continue; // skip trivial lines
            const obj: any = {};
      const len = Math.min(headerRow.length, row.length);
      for (let c = 0; c < len; c++) {
              const key = headerRow[c];
              const value = row[c];
              if (key === undefined) continue;
              obj[key] = value;
            }
            objects.push(obj);
        }
        if (objects.length === 0) {
          setError('No data rows found after header in fallback parsing');
          setIsLoading(false);
          return;
        }
        // Attempt normalization (adds lat/lon shortcuts if needed)
        let data = objects;
  const headers = Object.keys(data[0] || {});
        const hasLatitude = headers.some(h => h.toLowerCase().includes('lat'));
        const hasLongitude = headers.some(h => h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng'));
        if (!hasLatitude || !hasLongitude) {
          const aimResult = maybeNormalizeAimCsv(data);
          if (aimResult.normalized) data = aimResult.data;
        }
        const finalHeaders = Object.keys(data[0] || {});
        if (!finalHeaders.some(h => h.toLowerCase() === 'lat') || !finalHeaders.some(h => h.toLowerCase() === 'lon')) {
          setError('Failed to derive lat/lon columns from AiM CSV');
          setIsLoading(false);
          return;
        }
        onDataLoad(data, file.name);
        setIsLoading(false);
      },
      error: (error) => {
        setError('Error reading file (fallback): ' + error.message);
        setIsLoading(false);
      }
    });

    parseWithHeaderTrue();
  }, [onDataLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Upload Race Data</h2>
        <p className="text-gray-300">
          Upload a CSV file from your data logger with GPS coordinates and telemetry data
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          isDragOver
            ? 'border-red-400 bg-red-500/10'
            : 'border-gray-500 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto h-12 w-12 border-4 border-red-500 border-t-transparent rounded-full"></div>
            <p className="text-white">Processing CSV file...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-16 w-16 text-gray-400" />
            <div>
              <p className="text-xl text-white mb-2">
                Drop your CSV file here or{' '}
                <label className="text-red-400 hover:text-red-300 cursor-pointer underline">
                  browse
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-400">
                Supports CSV files with GPS coordinates and telemetry data
              </p>
            </div>
          </div>
        )}
      </div>

      {uploadedFile && !error && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <File className="h-5 w-5 text-gray-300" />
            <div>
              <p className="text-white font-medium">{uploadedFile.name}</p>
              <p className="text-sm text-gray-400">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              📋 Expected CSV Format
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Required</span>
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              Your CSV file should include columns for:
            </p>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li><strong>Latitude</strong> (lat, latitude, etc.) - GPS coordinate</li>
              <li><strong>Longitude</strong> (lon, lng, longitude, etc.) - GPS coordinate</li>
              <li>Timestamp or time data (recommended)</li>
              <li>Speed, RPM, throttle position, brake pressure (optional)</li>
              <li>Any other telemetry data you want to analyze</li>
            </ul>
          </div>
        </div>
        
        {/* Sample CSV example */}
        <div className="mt-4 p-3 bg-gray-900/50 rounded border border-blue-500/30">
          <h4 className="text-xs font-medium text-blue-300 mb-2 uppercase tracking-wide">Sample CSV Header</h4>
          <code className="text-xs text-gray-300 font-mono">
            timestamp,lat,lon,speed,rpm,throttle,brake<br/>
            1.0,42.5614,-84.1397,85.2,4500,78.5,0.0<br/>
            1.1,42.5615,-84.1396,86.1,4520,80.2,0.0
          </code>
        </div>
      </div>
    </div>
  );
}
