export type VehicleStatus = 'available' | 'rented' | 'charging' | 'under_repair' | 'offline'
export type CustomerStatus = 'pending_kyc' | 'active' | 'blacklisted'
export type ContractStatus = 'active' | 'completed' | 'overdue'
export type InvoiceStatus = 'paid' | 'pending' | 'overdue'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type DriverType = 'Grab' | 'Bolt' | 'Private'
export type AdminRole = 'Super Admin' | 'Fleet Manager' | 'Accountant' | 'Mechanic'

export interface Vehicle {
  id: string
  plate: string
  model: string
  make: string
  year: number
  color: string
  status: VehicleStatus
  socPercent: number
  odometer: number
  lat: number
  lng: number
  imageUrl: string
  vin: string
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  location: string
  nextServiceDate: string
  mileage: number
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
  creditScore: number
  rating: number
  bannedDate?: string
  bannedReason?: string
  bannedBy?: string
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
  dailyRate: number
  monthlyRate: number
  status: ContractStatus
}

export interface Invoice {
  id: string
  contractId: string
  customerName: string
  amount: number
  dueDate: string
  status: InvoiceStatus
  slipUrl?: string
  lastContacted?: string
  daysOverdue?: number
}

export interface Alert {
  id: string
  type: 'battery_low' | 'geofence_breach' | 'payment_overdue' | 'service_due'
  message: string
  severity: AlertSeverity
  createdAt: string
}

export interface GeofenceZone {
  id: string
  name: string
  coordinates: [number, number][]
  active: boolean
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: 'Active' | 'Inactive'
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
