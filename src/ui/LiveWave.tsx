import { useEffect, useRef } from 'react';

/**
 * Animated waveform for the running session. Purely visual feedback that the
 * session is live; flattens when paused, static under reduced motion.
 */
export function LiveWave({ active, height = 72 }: { active: boolean; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let level = active ? 1 : 0.15;
    const draw = (t: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      level += ((active ? 1 : 0.12) - level) * 0.06;
      const n = Math.floor(w / 4);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#5b2be0');
      grad.addColorStop(0.5, '#a98bff');
      grad.addColorStop(1, '#4cb6ff');
      ctx.fillStyle = grad;
      const time = reduce ? 0 : t / 1000;
      for (let i = 0; i < n; i++) {
        const x = i * 4;
        const env = Math.sin((i / n) * Math.PI);
        const v = (Math.sin(i * 0.31 + time * 3.1) * 0.5 + Math.sin(i * 0.087 - time * 1.7) * 0.35 + Math.sin(i * 0.53 + time * 5.3) * 0.15);
        const amp = (0.18 + Math.abs(v) * 0.82) * env * level;
        const bh = Math.max(2, amp * (h - 6));
        ctx.globalAlpha = 0.35 + env * 0.65;
        ctx.beginPath();
        ctx.roundRect(x, (h - bh) / 2, 2, bh, 1);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={ref} className="livewave" style={{ height }} aria-hidden="true" />;
}
