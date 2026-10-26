import { NightScene } from './NightScene';
import { useScene } from './useScene';

/**
 * Backdrop of the Start and Profile heroes. Default: the PULSE studio photograph (graded to the palette).
 * Profile → "Tło": a generated night city (optionally with rain) or the person's own photo, kept on this device.
 */
export function HeroBackdrop({ nowMin, src = '/photos/desk.webp' }: { nowMin: number; src?: string }) {
  const scene = useScene(nowMin);
  if (scene.mode === 'photo' && scene.photo) return <div className="hero-bg"><img src={scene.photo} alt="" /></div>;
  if (scene.mode === 'night' || scene.mode === 'rain') return <div className="hero-bg hero-bg--scene"><NightScene seed={scene.seed} minute={scene.minute} rain={scene.rain} /></div>;
  return <div className="hero-bg"><img src={src} alt="" decoding="async" fetchPriority="high" /></div>;
}
