import { STATUS_STYLES, STATUS_LABELS } from '@/lib/config/document-types';

export function StatusBadge({
  status,
  isOverdue,
  size = 'sm',
}: {
  status: string;
  isOverdue?: boolean;
  size?: 'sm' | 'md';
}) {
  const displayStatus = isOverdue && status !== 'overdue' ? 'overdue' : status;
  const sizeClasses = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-block rounded-full font-medium ${sizeClasses} ${
        STATUS_STYLES[displayStatus] || STATUS_STYLES.draft
      }`}
    >
      {STATUS_LABELS[displayStatus] || status.replace(/_/g, ' ')}
    </span>
  );
}
