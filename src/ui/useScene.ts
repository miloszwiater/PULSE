import { useStore } from '../data/store';
import { useHeroPhoto } from './heroPhoto';

/** Scene props shared by every screen that shows the night studio. */
export function useScene(nowMin: number) {
  const scene = useStore((s) => s.snap.profile?.scene ?? 'auto');
  const seed = useStore((s) => s.user?.id ?? 'pulse');
  const photo = useHeroPhoto();
  return {
    mode: scene,
    seed,
    minute: scene === 'night' || scene === 'rain' ? 23 * 60 : nowMin,
    rain: scene === 'rain',
    photo: scene === 'photo' ? photo : null,
  };
}
