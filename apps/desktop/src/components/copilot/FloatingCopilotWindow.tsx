import React, { useState, useEffect, useRef } from 'react';
import type { LocationSelection } from '../../stores/navigationStore';
import type { Place } from '../globe/globeGeography';
import type { Trend } from '../globe/globeData';
import { localApiFetch } from '../globe/localApi';
import { useDynamicAudioBrief } from './useDynamicAudioBrief';
import './floating-copilot.css';

export interface FloatingCopilotWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation?: (loc: LocationSelection) => void;
  onSelectVariable?: (variableId: string) => void;
  activeLocation?: Place | null;
  activeVariable?: string;
  activeTrend?: Trend | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text?: string;
  title?: string;
  hypothesis?: string;
  recommendedVariables?: string[];
  recommendedRegionId?: string | null;
  targetCoordinates?: { latitude: number; longitude: number } | null;
  mechanisms?: string;
  uncertainty?: string;
  audioText?: string;
  modelUsed?: string;
}

export const FloatingCopilotWindow: React.FC<FloatingCopilotWindowProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  onSelectVariable,
  activeLocation,
  activeVariable,
  activeTrend,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      title: 'Earth System Trend Detective',
      text: 'Welcome to NASA Mission Control Copilot. Ask me about planetary climate teleconnections, opposing regional trends, or request an evidence-grounded synthesis of your current observation data.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [availableModels, setAvailableModels] = useState<string[]>(['auto']);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { playSpeech, stopSpeech, isPlaying, isGenerating, error: audioError } = useDynamicAudioBrief();

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Check backend Gemini capability & active API key
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();

    void localApiFetch('/api/v1/ai/models', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json()) as {
          active_api_key_configured: boolean;
          models?: Array<{ model_id: string }>;
        };
        setHasApiKey(payload.active_api_key_configured);
        if (payload.models && payload.models.length > 0) {
          setAvailableModels(['auto', ...payload.models.map((m) => m.model_id)]);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: query }]);
    setLoading(true);

    try {
      const response = await localApiFetch('/api/v1/ai/investigate', {
        method: 'POST',
        body: JSON.stringify({ query, model: selectedModel }),
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorJson?.detail || `Investigation query failed (HTTP ${response.status})`);
      }

      const data = (await response.json()) as {
        hypothesis: string;
        recommended_variables: string[];
        recommended_region_id?: string | null;
        target_coordinates?: { latitude: number; longitude: number } | null;
        model_used: string;
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `copilot-${Date.now()}`,
          sender: 'copilot',
          title: 'Investigation Plan & Hypothesis',
          text: data.hypothesis,
          hypothesis: data.hypothesis,
          recommendedVariables: data.recommended_variables,
          recommendedRegionId: data.recommended_region_id,
          targetCoordinates: data.target_coordinates,
          audioText: `Scientific Investigation Plan: ${data.hypothesis}`,
          modelUsed: data.model_used,
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error connecting to Copilot service.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'copilot',
          title: 'Mission Advisory',
          text: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleExplainActiveTrend() {
    if (!activeTrend || loading) return;
    setLoading(true);

    const locationName = activeLocation?.name || 'Selected Region';
    const variableId = activeVariable || 'T2M';

    try {
      const response = await localApiFetch('/api/v1/ai/explain-trend', {
        method: 'POST',
        body: JSON.stringify({
          variable_id: variableId,
          location_name: locationName,
          direction: activeTrend.direction,
          rate_per_decade: activeTrend.rate_per_decade ?? 0,
          rate_unit: activeTrend.rate_unit,
          p_value: activeTrend.p_value ?? 1.0,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorJson?.detail || `Trend synthesis failed (HTTP ${response.status})`);
      }

      const data = (await response.json()) as {
        executive_summary: string;
        mechanisms_and_drivers: string;
        scientific_uncertainty: string;
        recommended_next_steps: string[];
        model_used: string;
      };

      const audioDebriefText = `${data.executive_summary} Regarding Earth system physical mechanisms: ${data.mechanisms_and_drivers}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `explain-${Date.now()}`,
          sender: 'copilot',
          title: `Scientific Trend Synthesis · ${locationName}`,
          text: data.executive_summary,
          mechanisms: data.mechanisms_and_drivers,
          uncertainty: data.scientific_uncertainty,
          audioText: audioDebriefText,
          modelUsed: data.model_used,
        },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate scientific explanation.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'copilot',
          title: 'Synthesis Warning',
          text: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="copilot-floating-window" aria-label="NASA AI Copilot Terminal">
      {/* Window Header */}
      <div className="copilot-window-header">
        <div className="copilot-header-title">
          <span className="trigger-pulse-dot" />
          <span>NASA Copilot Terminal</span>
        </div>
        <div className="copilot-header-actions">
          <select
            className="model-selector-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            title="Target Gemini AI Model"
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m === 'auto' ? 'Gemini 3 Auto' : m}
              </option>
            ))}
          </select>
          <button type="button" className="btn-window-close" onClick={onClose} aria-label="Close Copilot Window">
            ✕
          </button>
        </div>
      </div>

      {/* Active Observation Context Pill */}
      {activeLocation && (
        <div className="copilot-active-context">
          <span>
            Target: <strong className="context-tag">{activeLocation.name}</strong> ({activeVariable || 'T2M'})
          </span>
          {activeTrend && activeTrend.direction !== 'not_evaluable' && (
            <button
              type="button"
              className="btn-explain-active"
              disabled={loading}
              onClick={handleExplainActiveTrend}
            >
              Explain Trend with AI
            </button>
          )}
        </div>
      )}

      {/* Missing API Key Warning */}
      {!hasApiKey && (
        <div className="copilot-notice-banner">
          <strong>Notice: GEMINI_API_KEY Not Configured</strong>
          Configure your Google Gemini API key in <code>.env</code> at the project root to unlock live natural language investigation routing and real-time voice synthesis.
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="copilot-messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender}`}>
            {msg.title && <h5>{msg.title}</h5>}
            {msg.text && <p>{msg.text}</p>}

            {msg.mechanisms && (
              <p>
                <strong>Physical Mechanisms:</strong> {msg.mechanisms}
              </p>
            )}

            {msg.uncertainty && (
              <p>
                <em>Scientific Uncertainty:</em> {msg.uncertainty}
              </p>
            )}

            {/* Recommendations & Action Buttons */}
            {msg.recommendedVariables && msg.recommendedVariables.length > 0 && (
              <div className="copilot-recommendations">
                {msg.recommendedVariables.map((v) => (
                  <div key={v} className="rec-item">
                    <span>NASA Variable: <strong>{v}</strong></span>
                    {onSelectVariable && (
                      <button
                        type="button"
                        className="btn-rec-action"
                        onClick={() => onSelectVariable(v)}
                      >
                        Load {v}
                      </button>
                    )}
                  </div>
                ))}

                {msg.targetCoordinates && onSelectLocation && (
                  <div className="rec-item">
                    <span>
                      Coords: {msg.targetCoordinates.latitude.toFixed(2)}°, {msg.targetCoordinates.longitude.toFixed(2)}°
                    </span>
                    <button
                      type="button"
                      className="btn-rec-action"
                      onClick={() =>
                        onSelectLocation({
                          kind: 'coordinates',
                          lat: msg.targetCoordinates!.latitude,
                          lng: msg.targetCoordinates!.longitude,
                        })
                      }
                    >
                      Orbit to Target
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mission Control TTS Audio Player Bar */}
            {msg.audioText && (
              <div className="copilot-audio-bar">
                <div className="audio-label">
                  {isPlaying ? (
                    <div className="sound-wave">
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                    </div>
                  ) : (
                    <span>🎙 Mission Voice</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-audio-play"
                  disabled={isGenerating}
                  onClick={() => (isPlaying ? stopSpeech() : playSpeech(msg.audioText!))}
                >
                  {isGenerating ? 'Synthesizing…' : isPlaying ? '⏹ Stop Audio' : '▶ Play Audio Brief'}
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-bubble copilot">
            <h5>Mission Telemetry</h5>
            <p>Consulting Gemini extended thinking models and NASA Earth Science domain knowledge…</p>
          </div>
        )}

        {audioError && (
          <div className="message-bubble copilot">
            <h5>Audio Error</h5>
            <p>{audioError}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inquiry Chips */}
      <div className="copilot-suggestions">
        <button
          type="button"
          className="btn-chip"
          onClick={() => handleSend('Why is the Arctic warming triple the rate of the Amazon?')}
        >
          Polar Amplification vs Amazon
        </button>
        <button
          type="button"
          className="btn-chip"
          onClick={() => handleSend('How does ENSO cause opposing rainfall trends between California and La Guajira?')}
        >
          ENSO California vs Guajira
        </button>
        <button
          type="button"
          className="btn-chip"
          onClick={() => handleSend('Explain Hadley cell expansion causing subtropical drying')}
        >
          Hadley Cell Expansion
        </button>
      </div>

      {/* Input Area */}
      <form
        className="copilot-input-area"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          type="text"
          className="copilot-input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot about Earth system teleconnections…"
          disabled={loading}
        />
        <button type="submit" className="btn-copilot-send" disabled={loading || !input.trim()}>
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </aside>
  );
};
