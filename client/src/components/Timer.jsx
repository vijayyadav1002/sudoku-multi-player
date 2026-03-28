import { useState, useEffect } from 'react';
import { formatDuration } from '../lib/sudokuHelpers';

export default function Timer({ running }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <span className="font-mono text-slate-300 text-lg tabular-nums">
      {formatDuration(seconds)}
    </span>
  );
}
