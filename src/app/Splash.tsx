import { Wordmark } from '../ui/Wordmark';

export function Splash() {
  return (
    <div className="splash" aria-busy="true" aria-label="Ładowanie PULSE">
      <Wordmark />
    </div>
  );
}
