import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface AudioState {
  masterVolume: number;
  sfxVolume: number;
  setMasterVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
}
export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      masterVolume: 1,
      sfxVolume: 1,
      setMasterVolume: (volume) => set({ masterVolume: volume }),
      setSfxVolume: (volume) => set({ sfxVolume: volume }),
    }),
    {
      name: 'audio-storage',
    }
  )
);