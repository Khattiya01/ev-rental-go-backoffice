interface BadgeProps {
  variant: 'available' | 'rented' | 'charging' | 'under_repair' | 'offline' | 'active' | 'pending' | 'pending_kyc' | 'rejected' | 'suspended' | 'blacklisted' | 'paid' | 'overdue' | 'completed' | 'inactive' | 'critical' | 'warning' | 'battery_low' | 'payment_overdue' | 'payment_reminder' | 'geofence_breach' | 'service_due' | 'vehicle_offline'
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
  completed: 'bg-slate-400/20 text-slate-500 border-slate-400/30',
  inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  battery_low:      'bg-red-100 text-red-600 border-red-200',
  payment_overdue:  'bg-rose-100 text-rose-600 border-rose-200',
  payment_reminder: 'bg-amber-100 text-amber-700 border-amber-200',
  geofence_breach:  'bg-orange-100 text-orange-600 border-orange-200',
  service_due:      'bg-blue-100 text-blue-600 border-blue-200',
  vehicle_offline:  'bg-slate-100 text-slate-600 border-slate-200',
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
  completed: 'Completed',
  inactive: 'Inactive',
  critical: 'Critical',
  warning: 'Warning',
  battery_low:      'แบตต่ำ',
  payment_overdue:  'เลยกำหนด',
  payment_reminder: 'ใกล้ครบกำหนด',
  geofence_breach:  'เขตพื้นที่',
  service_due:      'ซ่อมบำรุง',
  vehicle_offline:  'ขาดการเชื่อมต่อ',
}

export default function Badge({ variant, label, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}>
      {label ?? variantLabels[variant]}
    </span>
  )
}
