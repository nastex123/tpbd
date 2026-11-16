import React, { useEffect, useState } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { Place } from '../globe/globeGeography';
import type { Trend } from '../globe/globeData';
import { FloatingCopilotWindow } from './FloatingCopilotWindow';
import './floating-copilot.css';

export interface FloatingCopilotTriggerProps {
  onSelectLocation?: (loc: LocationSelection) => void;
  onSelectVariable?: (variableId: string) => void;
  activeLocation?: Place | null;
  activeVariable?: string;
  activeTrend?: Trend | null;
}

export const FloatingCopilotTrigger: React.FC<FloatingCopilotTriggerProps> = ({
  onSelectLocation,
  onSelectVariable,
  activeLocation,
  activeVariable,
  activeTrend,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener('tpbd:open-copilot', handleOpenEvent);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('tpbd:open-copilot', handleOpenEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="copilot-floating-trigger btn-tactile shadow-bevel"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open NASA Mission Control AI Copilot"
        title="Open NASA AI Copilot Terminal (Cmd+K / Ctrl+K)"
      >
        <span className="trigger-status-dot" />
        <span>AI Copilot · Mission Control</span>
      </button>

      <FloatingCopilotWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectLocation={onSelectLocation}
        onSelectVariable={onSelectVariable}
        activeLocation={activeLocation}
        activeVariable={activeVariable}
        activeTrend={activeTrend}
      />
    </>
  );
};
