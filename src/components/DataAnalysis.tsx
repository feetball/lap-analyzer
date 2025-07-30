'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Timer, TrendingUp, Settings, Play } from 'lucide-react';

// Dynamically import Chart component to avoid SSR issues
const Line = dynamic(
  () => import('react-chartjs-2').then((mod) => mod.Line),
  { ssr: false }
);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DataAnalysisProps {
  data: any[];
  selectedLap: number | null;
  onLapSelect: (lap: number | null) => void;
}

interface LapData {
  lapNumber: number;
  startIndex: number;
  endIndex: number;
  lapTime: number;
  maxSpeed: number;
  avgSpeed: number;
  data: any[];
}

export default function DataAnalysis({ data, selectedLap, onLapSelect }: DataAnalysisProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [laps, setLaps] = useState<LapData[]>([]);
  const [bestTheoreticalLap, setBestTheoreticalLap] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get available columns from the data
  const availableColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(key => 
      typeof data[0][key] === 'number' && 
      !key.toLowerCase().includes('lat') && 
      !key.toLowerCase().includes('lon') &&
      !key.toLowerCase().includes('lng')
    );
  }, [data]);

  // Detect laps based on GPS coordinates
  useEffect(() => {
    if (!data || data.length === 0) return;

    // This is a simplified lap detection - in a real implementation,
    // you'd use the start/finish line coordinates to detect laps
    const detectedLaps: LapData[] = [];
    
    // For demo purposes, let's simulate lap detection by grouping data
    // In reality, you'd check when the car crosses the start/finish line
    const lapSize = Math.floor(data.length / 3); // Simulate 3 laps
    
    for (let i = 0; i < 3; i++) {
      const startIndex = i * lapSize;
      const endIndex = Math.min((i + 1) * lapSize, data.length - 1);
      const lapData = data.slice(startIndex, endIndex);
      
      if (lapData.length > 0) {
        const speeds = lapData.map(d => d.speed || d.Speed || 0).filter(s => s > 0);
        const maxSpeed = Math.max(...speeds);
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        
        // Simulate lap time (in reality, this would be calculated from timestamps)
        const lapTime = 60 + Math.random() * 30; // 1-1.5 minutes
        
        detectedLaps.push({
          lapNumber: i + 1,
          startIndex,
          endIndex,
          lapTime,
          maxSpeed,
          avgSpeed,
          data: lapData
        });
      }
    }
    
    setLaps(detectedLaps);
    
    // Calculate best theoretical lap
    if (detectedLaps.length > 0) {
      const bestTime = Math.min(...detectedLaps.map(lap => lap.lapTime));
      setBestTheoreticalLap(bestTime);
    }

    // Auto-select some columns
    if (selectedColumns.length === 0) {
      const autoSelect = availableColumns.slice(0, 3);
      setSelectedColumns(autoSelect);
    }
  }, [data, availableColumns, selectedColumns.length]);

  const chartData = useMemo(() => {
    if (!data || selectedColumns.length === 0) return null;

    let dataToShow = data;
    if (selectedLap !== null) {
      const lap = laps.find(l => l.lapNumber === selectedLap);
      if (lap) {
        dataToShow = lap.data;
      }
    }

    return {
      labels: dataToShow.map((_, index) => index),
      datasets: selectedColumns.map((column, index) => ({
        label: column,
        data: dataToShow.map(row => row[column] || 0),
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 60}, 70%, 50%, 0.1)`,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      })),
    };
  }, [data, selectedColumns, selectedLap, laps]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: selectedLap ? `Lap ${selectedLap} Data` : 'Session Data',
        color: 'white',
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
    },
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Data Analysis</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Timer className="h-4 w-4" />
            <span>{laps.length} laps detected</span>
          </div>
          {bestTheoreticalLap && (
            <div className="flex items-center space-x-2 text-sm text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>Best theoretical: {bestTheoreticalLap.toFixed(3)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Lap Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <Play className="h-4 w-4 mr-2" />
          Lap Selection
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onLapSelect(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedLap === null
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Session
          </button>
          {laps.map((lap) => (
            <button
              key={lap.lapNumber}
              onClick={() => onLapSelect(lap.lapNumber)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLap === lap.lapNumber
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Lap {lap.lapNumber}
              <span className="block text-xs opacity-75">
                {lap.lapTime.toFixed(2)}s
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Column Selection */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Data Channels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableColumns.map((column) => (
            <label
              key={column}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(column)}
                onChange={() => handleColumnToggle(column)}
                className="rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-800"
              />
              <span className="text-white text-sm">{column}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData && isMounted && (
        <div className="bg-white/5 rounded-lg p-4">
          <div className="h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Lap Times Table */}
      {laps.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Lap Times</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-300">Lap</th>
                  <th className="text-left py-2 text-gray-300">Time</th>
                  <th className="text-left py-2 text-gray-300">Max Speed</th>
                  <th className="text-left py-2 text-gray-300">Avg Speed</th>
                  <th className="text-left py-2 text-gray-300">Delta</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap) => {
                  const delta = bestTheoreticalLap ? lap.lapTime - bestTheoreticalLap : 0;
                  return (
                    <tr
                      key={lap.lapNumber}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                        selectedLap === lap.lapNumber ? 'bg-red-500/20' : ''
                      }`}
                      onClick={() => onLapSelect(lap.lapNumber)}
                    >
                      <td className="py-2 text-white">{lap.lapNumber}</td>
                      <td className="py-2 text-white">{lap.lapTime.toFixed(3)}s</td>
                      <td className="py-2 text-white">{lap.maxSpeed.toFixed(1)}</td>
                      <td className="py-2 text-white">{lap.avgSpeed.toFixed(1)}</td>
                      <td className={`py-2 ${delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
