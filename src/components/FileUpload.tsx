'use client';

import { useState, useCallback } from 'react';
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

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

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file: ' + results.errors[0].message);
          setIsLoading(false);
          return;
        }

        // Validate that we have GPS data
        const data = results.data as any[];
        const headers = Object.keys(data[0] || {});
        const hasLatitude = headers.some(h => h.toLowerCase().includes('lat'));
        const hasLongitude = headers.some(h => h.toLowerCase().includes('lon') || h.toLowerCase().includes('lng'));
        
        if (!hasLatitude || !hasLongitude) {
          setError('CSV file must contain latitude and longitude columns');
          setIsLoading(false);
          return;
        }

        onDataLoad(data, file.name);
        setIsLoading(false);
      },
      error: (error) => {
        setError('Error reading file: ' + error.message);
        setIsLoading(false);
      }
    });
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
        <h3 className="text-white font-medium mb-2">Expected CSV Format</h3>
        <p className="text-sm text-gray-300 mb-2">
          Your CSV file should include columns for:
        </p>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>Latitude (lat, latitude, etc.)</li>
          <li>Longitude (lon, lng, longitude, etc.)</li>
          <li>Timestamp or time data</li>
          <li>Speed, RPM, throttle position, brake pressure (optional)</li>
          <li>Any other telemetry data you want to analyze</li>
        </ul>
      </div>
    </div>
  );
}
