interface BadgeProps {
  variant: 'available' | 'rented' | 'charging' | 'under_repair' | 'offline' | 'active' | 'pending' | 'pending_kyc' | 'rejected' | 'suspended' | 'blacklisted' | 'paid' | 'overdue' | 'inactive' | 'critical' | 'warning'
  label?: string
  className?: string
}

const variantStyles: Record<BadgeProps['variant'], string> = {
  available: 'bg-green-500/20 text-green-400 border-green-500/30',
  rented: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  charging: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  under_repair: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  offline: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  pending_kyc: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  rejected: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  blacklisted: 'bg-red-500/20 text-red-400 border-red-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
  inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const variantLabels: Record<BadgeProps['variant'], string> = {
  available: 'Available',
  rented: 'Rented',
  charging: 'Charging',
  under_repair: 'Maintenance',
  offline: 'Offline',
  active: 'Active',
  pending: 'Pending',
  pending_kyc: 'Pending KYC',
  rejected: 'KYC Rejected',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
  paid: 'Paid',
  overdue: 'Overdue',
  inactive: 'Inactive',
  critical: 'Critical',
  warning: 'Warning',
}

export default function Badge({ variant, label, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {label ?? variantLabels[variant]}
    </span>
  )
}
