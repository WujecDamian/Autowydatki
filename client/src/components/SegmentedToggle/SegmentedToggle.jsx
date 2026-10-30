// Two or three exclusive choices as one pill; options are { value, label }.
export const SegmentedToggle = ({ label, options, value, onChange }) => (
  <div
    className={`grid gap-1 rounded-full bg-muted p-1 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
    role="group"
    aria-label={label}
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className="h-11 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-primary-fill aria-pressed:text-primary-foreground"
      >
        {option.label}
      </button>
    ))}
  </div>
);
