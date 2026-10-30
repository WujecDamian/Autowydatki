const size = 120;
const stroke = 14;
const radius = (size - stroke) / 2;
const circumference = 2 * Math.PI * radius;
const gap = 5;

// Ring split into one arc per part; `color` is any CSS colour, `amount` its share.
export const CostDonut = ({ parts, label }) => {
  const visible = parts.filter((part) => part.amount > 0);
  const total = visible.reduce((sum, part) => sum + part.amount, 0);
  const useGaps = visible.length > 1;
  const arcs = visible.map((part, index) => ({
    ...part,
    length: (part.amount / total) * circumference,
    start: visible.slice(0, index).reduce((sum, earlier) => sum + (earlier.amount / total) * circumference, 0),
  }));

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      className="size-[120px] shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-foreground/8"
      />
      {arcs.map((arc, index) => (
        <circle
          key={arc.key}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(arc.length - (useGaps ? gap : 0), 0.5)} ${circumference}`}
          strokeDashoffset={-arc.start}
          className="donut-arc"
          style={{ "--i": index }}
        />
      ))}
    </svg>
  );
};
