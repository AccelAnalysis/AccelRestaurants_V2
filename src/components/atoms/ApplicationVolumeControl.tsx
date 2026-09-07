import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  audioExperienceCoordinator,
  getApplicationAudioState,
  setApplicationAudioMuted,
  setApplicationAudioVolume,
} from '../../lib/audioExperience';

export const ApplicationVolumeControl = () => {
  const [state, setState] = useState(() => getApplicationAudioState());

  useEffect(() => {
    const handleChange = () => setState(getApplicationAudioState());
    window.addEventListener('accelrestaurants:application-audio-change', handleChange);
    return () => window.removeEventListener('accelrestaurants:application-audio-change', handleChange);
  }, []);

  const updateVolume = (value: number) => {
    setApplicationAudioVolume(value);
    audioExperienceCoordinator.refresh();
    setState(getApplicationAudioState());
  };

  const toggleMuted = () => {
    setApplicationAudioMuted(!state.muted);
    audioExperienceCoordinator.refresh();
    setState(getApplicationAudioState());
  };

  return (
    <div className="ml-auto flex items-center gap-2" aria-label="Application audio volume">
      <button
        type="button"
        onClick={toggleMuted}
        className="ui-button ui-button-secondary p-2"
        aria-label={state.muted ? 'Unmute application audio' : 'Mute application audio'}
        title={state.muted ? 'Unmute application audio' : 'Mute application audio'}
      >
        {state.muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
      </button>
      <label className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
        <span className="sr-only">Application volume</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={state.volume}
          onChange={event => updateVolume(Number(event.target.value))}
          className="w-24 accent-primary"
          aria-label="Application volume"
        />
        <span className="w-9 text-right tabular-nums">{state.volume}%</span>
      </label>
    </div>
  );
};
