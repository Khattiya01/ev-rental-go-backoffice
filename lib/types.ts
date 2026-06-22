export type PermResource = 'vehicles' | 'customers' | 'contracts' | 'billing' | 'maintenance' | 'reports' | 'settings'
export type PermEntry = { canRead: boolean; canWrite: boolean; canDelete: boolean }
export type UserPermissions = Record<PermResource, PermEntry>

export type VehicleStatus = 'available' | 'rented' | 'charging' | 'under_repair' | 'offline'
export type CustomerStatus = 'pending_kyc' | 'rejected' | 'active' | 'suspended' | 'blacklisted'
export type ContractStatus = 'active' | 'completed' | 'overdue'
export type InvoiceStatus = 'paid' | 'pending' | 'overdue'
export type BillingType = 'daily' | 'monthly' | 'one_time'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type DriverType = 'Grab' | 'Bolt' | 'Private'
export type AdminRole = 'super_admin' | 'admin' | 'viewer'

export interface Vehicle {
  id: string
  plate: string
  model: string
  make: string
  year: number
  color: string | null
  status: VehicleStatus
  socPercent: number
  odometer: number
  lat: number
  lng: number
  imageUrl: string | null   // cover image — first of images[] (used in list/map)
  images: string[]          // all images (gallery)
  vin: string | null
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | string | null
  location: string | null
  nextServiceDate: string | null
  mileage: number
  motorCutoffActive: boolean
  geofenceZoneId: string | null
  geofenceZoneName: string | null
  version: number   // optimistic-lock counter — send as `expectedVersion` on PATCH
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  driverType: DriverType
  status: CustomerStatus
  avatarUrl: string
  idCardNumber?: string
  dateOfBirth?: string
  idCardFrontUrl?: string
  idCardBackUrl?: string
  driverLicenseUrl?: string
  grabBoltScreenshotUrl?: string
  notes?: string | null
  creditScore: number
  rating: number
  bannedDate?: string
  bannedReason?: string
  bannedBy?: string
  kycNotes?: string | null
}

export interface Contract {
  id: string
  contractNo: string
  customerId: string
  customerName: string
  vehicleId: string
  vehiclePlate: string
  startDate: string
  dueDate: string
  depositAmount: number
  billingType: 'monthly' | 'daily'
  dailyRate: number
  monthlyRate: number
  status: ContractStatus
  documentUrl?: string | null
  autoReminder: boolean
  createdAt: string
  version: number   // optimistic-lock counter — send as `expectedVersion` on PATCH
}

export interface Invoice {
  id: string
  invoiceNo: string
  contractId?: string | null
  customerId?: string | null
  customerName: string
  vehiclePlate?: string | null
  billingType: BillingType
  description?: string | null
  amount: number
  dueDate: string
  status: InvoiceStatus
  paidAt?: string | null
  daysOverdue?: number | null
  lastContacted?: string | null
  slipUrl?: string | null
  createdAt: string
}

export interface Alert {
  id: string
  type: 'battery_low' | 'geofence_breach' | 'payment_overdue' | 'payment_reminder' | 'service_due'
  message: string
  severity: AlertSeverity
  createdAt: string
  href?: string
}

// Full alerts-table row, as shown on the dedicated /alerts list page — unlike
// Alert above (used for the dashboard feed), this always maps 1:1 to a real
// `alerts` row, so it carries `resolved` and the raw entityId/timestamp.
export interface AlertRecord {
  id: string
  type: 'battery_low' | 'geofence_breach' | 'payment_reminder'
  message: string
  severity: AlertSeverity
  entityId: string
  resolved: boolean
  createdAt: string
  href: string
}

export interface GeofenceZone {
  id: string
  name: string
  coordinates: [number, number][]
  active: boolean
  alertRecipients: string[]
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  createdAt: string
}

export interface PricingPlan {
  id: string
  vehicleModel: string
  dailyRate: number
  monthlyRate: number
  deposit: number
  enabled: boolean
}

export interface RevenueDataPoint {
  day: string
  revenue: number
}
