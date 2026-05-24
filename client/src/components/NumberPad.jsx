export default function NumberPad({ onNumber, onClear, disabled, notesMode, onToggleNotes }) {
  return (
    <div className="numpad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button
          key={n}
          className="num"
          onClick={() => onNumber(n)}
          disabled={disabled}
        >
          {n}
        </button>
      ))}
      {onToggleNotes && (
        <button
          className={`num-action${notesMode ? ' active' : ''}`}
          onClick={onToggleNotes}
          title="Notes (N)"
          disabled={disabled}
        >
          ✎
        </button>
      )}
      <button
        className="num-action"
        onClick={onClear}
        disabled={disabled}
        title="Erase"
      >
        ⌫
      </button>
    </div>
  );
}
