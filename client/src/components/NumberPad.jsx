export default function NumberPad({ onNumber, onClear, disabled }) {
  return (
    <div className="w-full" style={{ maxWidth: 'min(calc(100vw - 2rem), 400px)' }}>
      <div className="grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            onClick={() => onNumber(n)}
            disabled={disabled}
            className="aspect-square flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-40 text-white font-semibold rounded-lg text-base transition-colors"
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={onClear}
        disabled={disabled}
        className="w-full mt-1 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-40 text-slate-300 rounded-lg text-sm transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
