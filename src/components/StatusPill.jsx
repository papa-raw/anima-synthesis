const styles = {
  wild: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  captured: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  dead: 'bg-red-500/20 text-red-400 border-red-500/30 line-through',
};

const sizeStyles = {
  xs: 'text-[0.55rem] px-1.5 py-0.5',
  sm: 'text-[0.65rem] px-2 py-0.5',
};

export default function StatusPill({ status, size = 'sm' }) {
  return (
    <span className={`inline-block uppercase tracking-wider font-bold border rounded-full ${styles[status] || styles.wild} ${sizeStyles[size]}`}>
      {status}
    </span>
  );
}
