export default function ProgressBar({ progress, label, color = 'indigo' }) {
  const isUrgent = progress >= 70;
  const isAlarm = progress >= 90;

  const barClass = isAlarm
    ? 'bg-red-500'
    : isUrgent
    ? 'bg-orange-500'
    : color === 'indigo'
    ? 'bg-indigo-500'
    : 'bg-orange-500';

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{label}</span>
          <span className={`font-bold tabular-nums ${isUrgent ? 'text-orange-400' : 'text-slate-300'}`}>
            {progress}%
          </span>
        </div>
      )}
      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ease-out ${barClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
