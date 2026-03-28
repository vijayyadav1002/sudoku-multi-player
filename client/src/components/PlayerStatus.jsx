import ProgressBar from './ProgressBar';

export default function PlayerStatus({ nickname, progress, isYou, isOpponent }) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        isOpponent
          ? 'bg-slate-800 border-slate-600'
          : 'bg-indigo-950 border-indigo-800'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isOpponent ? 'bg-orange-400' : 'bg-indigo-400'
          }`}
        />
        <span className="font-semibold text-white text-sm truncate">{nickname}</span>
        {isYou && <span className="text-xs text-slate-500 flex-shrink-0">(you)</span>}
      </div>
      <ProgressBar
        progress={progress}
        label="Progress"
        color={isOpponent ? 'orange' : 'indigo'}
      />
    </div>
  );
}
