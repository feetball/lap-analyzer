'use client';

import { useState } from 'react';
import { X, FileUp, Play, BarChart3, Map } from 'lucide-react';

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
}

export default function QuickStartGuide({ isOpen, onClose, onOpenHelp }: QuickStartGuideProps) {
  if (!isOpen) return null;

  const steps = [
    {
      icon: FileUp,
      title: "1. Upload Your Data",
      description: "Drag and drop a CSV file from your data logger containing GPS coordinates and telemetry data.",
      tips: ["Ensure your CSV has latitude and longitude columns", "Include additional channels like speed, RPM, throttle for better analysis"]
    },
    {
      icon: BarChart3,
      title: "2. Analyze Performance",
      description: "The system automatically detects laps and creates interactive charts for detailed telemetry analysis.",
      tips: ["Select different data channels to compare", "Click on lap numbers to focus on specific laps"]
    },
    {
      icon: Map,
      title: "3. Visualize Your Track",
      description: "View your GPS racing line overlaid on satellite imagery with speed-color coding.",
      tips: ["Red lines = high speed", "Blue lines = low speed/braking zones"]
    },
    {
      icon: Play,
      title: "4. Compare & Improve",
      description: "Use lap comparison tools to identify areas for improvement and calculate your best theoretical lap time.",
      tips: ["Compare your fastest lap with slower laps", "Look for braking and acceleration differences"]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-red-600/20 to-blue-600/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏁</span>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to Race Car Data Analyzer</h2>
              <p className="text-gray-300 text-sm">Professional telemetry analysis in 4 easy steps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-gray-300 mb-3">{step.description}</p>
                    <div className="space-y-1">
                      {step.tips.map((tip, tipIndex) => (
                        <div key={tipIndex} className="flex items-start gap-2 text-sm text-blue-300">
                          <span className="text-blue-400 mt-0.5">💡</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature Highlights */}
          <div className="mt-8 p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
            <h3 className="text-lg font-semibold text-white mb-3">✨ Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Automatic lap detection
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Circuit recognition
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                GPS track visualization
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Speed color-coding
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Interactive charts
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Lap comparison tools
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Best theoretical lap
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400">✓</span>
                Session management
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onOpenHelp}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <span>📖</span>
                Detailed Help
              </button>
              <div className="text-sm text-gray-400">
                Need more assistance? Check the detailed help guide.
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
