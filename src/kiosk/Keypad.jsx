const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok']

export default function Keypad({ value, onChange, onSubmit, maxLength = 10, masked = false }) {
  const press = key => {
    if (key === 'back') return onChange(value.slice(0, -1))
    if (key === 'ok') return value && onSubmit()
    if (value.length < maxLength) onChange(value + key)
  }

  return (
    <div className="keypad-wrap">
      <div className="keypad-display" aria-live="polite">
        {value ? (masked ? '•'.repeat(value.length) : value) : <span className="keypad-placeholder">—</span>}
      </div>
      <div className="keypad">
        {KEYS.map(key => (
          <button
            key={key}
            type="button"
            className={`key key-${key}`}
            disabled={key === 'ok' && !value}
            onClick={() => press(key)}
            aria-label={key === 'back' ? 'Delete' : key === 'ok' ? 'Enter' : key}
          >
            {key === 'back' ? '⌫' : key === 'ok' ? '✓' : key}
          </button>
        ))}
      </div>
    </div>
  )
}
