const PLAYER_COLORS = ['indigo', 'orange', 'green', 'pink', 'yellow', 'cyan', 'violet', 'red', 'lime', 'amber'];

const DOT_COLORS = {
  indigo: 'bg-indigo-400',
  orange: 'bg-orange-400',
  green: 'bg-green-400',
  pink: 'bg-pink-400',
  yellow: 'bg-yellow-400',
  cyan: 'bg-cyan-400',
  violet: 'bg-violet-400',
  red: 'bg-red-400',
  lime: 'bg-lime-400',
  amber: 'bg-amber-400',
};

const BAR_COLORS = {
  indigo: 'bg-indigo-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  pink: 'bg-pink-500',
  yellow: 'bg-yellow-500',
  cyan: 'bg-cyan-500',
  violet: 'bg-violet-500',
  red: 'bg-red-500',
  lime: 'bg-lime-500',
  amber: 'bg-amber-500',
};

export default function PlayerProgressStrip({ players, playersProgress, mySocketId }) {
  const sorted = [
    ...players.filter(p => p.socketId === mySocketId),
    ...players.filter(p => p.socketId !== mySocketId),
  ];

  return (
    <div className="w-full overflow-x-auto py-1">
      <div className="flex gap-2 min-w-max">
        {sorted.map((player, i) => {
          const isMe = player.socketId === mySocketId;
          const colorIdx = players.findIndex(p => p.socketId === player.socketId);
          const color = isMe ? 'indigo' : PLAYER_COLORS[colorIdx % PLAYER_COLORS.length];
          const progress = playersProgress.get(player.socketId) ?? 0;

          return (
            <div
              key={player.socketId}
              className={`flex flex-col gap-1 min-w-[72px] max-w-[88px] rounded-lg p-2 border ${
                isMe
                  ? 'bg-indigo-950 border-indigo-600 ring-1 ring-indigo-500'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[color]}`} />
                <span className="text-white text-xs font-medium truncate">{player.nickname}</span>
              </div>
              {progress >= 100 ? (
                <span className="text-green-400 text-xs font-bold text-right">✓ Done</span>
              ) : (
                <>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${BAR_COLORS[color]}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs tabular-nums text-right">{progress}%</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
