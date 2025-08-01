'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface ContextualTipsProps {
  currentTab: string;
  hasData: boolean;
  selectedLap: number | null;
  selectedLaps: number[];
}

export default function ContextualTips({ currentTab, hasData, selectedLap, selectedLaps }: ContextualTipsProps) {
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);

  const tips = useMemo(() => ({
    upload: [
      {
        id: 'upload-format',
        condition: !hasData,
        message: "💡 Tip: Your CSV file must have latitude and longitude columns for GPS tracking. Speed, RPM, and other telemetry data are optional but enhance analysis."
      }
    ],
    analysis: [
      {
        id: 'analysis-channels',
        condition: hasData && !selectedLap,
        message: "💡 Tip: Select different telemetry channels from the dropdown to analyze various aspects of your driving. Try comparing speed with throttle position to optimize acceleration zones."
      },
      {
        id: 'analysis-laps',
        condition: hasData && selectedLap,
        message: "💡 Tip: Compare your selected lap with other laps to identify areas for improvement. Look for sections where speed or throttle application differs."
      }
    ],
    map: [
      {
        id: 'map-colors',
        condition: hasData,
        message: "💡 Tip: Track colors indicate speed - red for high speed sections, blue for slow corners. Use this to identify braking zones and acceleration points."
      }
    ],
    comparison: [
      {
        id: 'comparison-select',
        condition: hasData && selectedLaps.length < 2,
        message: "💡 Tip: Select two or more laps to see detailed performance comparisons. This helps identify which sectors need the most improvement."
      },
      {
        id: 'comparison-delta',
        condition: hasData && selectedLaps.length >= 2,
        message: "💡 Tip: The delta time shows where you're gaining or losing time compared to your best lap. Focus on the areas with the biggest time losses."
      }
    ],
    sessions: [
      {
        id: 'sessions-save',
        condition: hasData,
        message: "💡 Tip: Save your current session to analyze it later or compare with future track days. This helps track your progress over time."
      }
    ]
  }), [hasData, selectedLap, selectedLaps]);

  useEffect(() => {
    const relevantTips = tips[currentTab as keyof typeof tips] || [];
    const applicableTip = relevantTips.find(tip => 
      tip.condition && !dismissedTips.includes(tip.id)
    );

    if (applicableTip) {
      setCurrentTip(applicableTip.id);
    } else {
      setCurrentTip(null);
    }
  }, [currentTab, hasData, selectedLap, selectedLaps, dismissedTips, tips]);

  const dismissTip = (tipId: string) => {
    const newDismissed = [...dismissedTips, tipId];
    setDismissedTips(newDismissed);
    localStorage.setItem('lap-analyzer-dismissed-tips', JSON.stringify(newDismissed));
    setCurrentTip(null);
  };

  // Load dismissed tips from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lap-analyzer-dismissed-tips');
    if (saved) {
      try {
        setDismissedTips(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading dismissed tips:', e);
      }
    }
  }, []);

  if (!currentTip) return null;

  const relevantTips = tips[currentTab as keyof typeof tips] || [];
  const tipData = relevantTips.find(tip => tip.id === currentTip);

  if (!tipData) return null;

  return (
    <div className="mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-yellow-200 text-sm">
            {tipData.message}
          </p>
        </div>
        <button
          onClick={() => dismissTip(currentTip)}
          className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors flex-shrink-0"
          title="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
