export default function FinanceCard({ label, value, variant }) {
  return (
    <div className="finance-card">
      <span className="finance-label">{label}</span>
      <span
        className={
          "finance-value " +
          (variant === "pos"
            ? "finance-value-pos"
            : variant === "neg"
            ? "finance-value-neg"
            : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
