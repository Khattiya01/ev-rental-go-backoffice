import type { Vehicle, Customer, Contract, Invoice, Alert, GeofenceZone, AdminUser, PricingPlan, RevenueDataPoint } from '@/lib/types'

export const mockVehicles: Vehicle[] = [
  { id: '1', plate: 'กข-1234', model: 'Model 3', make: 'Tesla', year: 2023, color: 'Deep Blue Metallic', status: 'available', socPercent: 70, odometer: 12450, lat: 13.756, lng: 100.502, imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400', images: [], vin: 'T3SLA123456789', condition: 'Excellent', location: 'Bangkok Central', nextServiceDate: '2024-08-15', mileage: 12450, motorCutoffActive: false },
  { id: '2', plate: 'คง-5678', model: 'Model Y', make: 'Tesla', year: 2022, color: 'Pearl White', status: 'rented', socPercent: 85, odometer: 25300, lat: 13.762, lng: 100.521, imageUrl: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400', images: [], vin: 'TSLAY987654321', condition: 'Good', location: 'Sukhumvit', nextServiceDate: '2024-09-01', mileage: 25300, motorCutoffActive: false },
  { id: '3', plate: 'จฉ-9012', model: 'BYD Atto 3', make: 'BYD', year: 2023, color: 'Red', status: 'charging', socPercent: 45, odometer: 8200, lat: 13.748, lng: 100.493, imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400', images: [], vin: 'BYD345678901', condition: 'Excellent', location: 'Charger Station Rama9', nextServiceDate: '2024-10-20', mileage: 8200, motorCutoffActive: false },
  { id: '4', plate: 'ชซ-3456', model: 'Ioniq 5', make: 'Hyundai', year: 2022, color: 'Gravity Gold', status: 'under_repair', socPercent: 30, odometer: 41000, lat: 13.731, lng: 100.511, imageUrl: 'https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=400', images: [], vin: 'IONIQ5432109876', condition: 'Fair', location: 'Workshop Ladprao', nextServiceDate: '2024-07-30', mileage: 41000, motorCutoffActive: false },
  { id: '5', plate: 'ณด-7890', model: 'MG EP', make: 'MG', year: 2021, color: 'White', status: 'offline', socPercent: 12, odometer: 62000, lat: 13.771, lng: 100.543, imageUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400', images: [], vin: 'MGEP567890123', condition: 'Fair', location: 'Unknown', nextServiceDate: '2024-06-01', mileage: 62000, motorCutoffActive: false },
  { id: '6', plate: 'ตถ-2345', model: 'Dolphin', make: 'BYD', year: 2023, color: 'Sky Blue', status: 'available', socPercent: 90, odometer: 5100, lat: 13.744, lng: 100.497, imageUrl: 'https://images.unsplash.com/photo-1616788494672-ec7ca25495bf?w=400', images: [], vin: 'BYDF123456789', condition: 'Excellent', location: 'Siam Paragon', nextServiceDate: '2025-01-15', mileage: 5100, motorCutoffActive: false },
  { id: '7', plate: 'ทน-6789', model: 'Atto 3', make: 'BYD', year: 2022, color: 'Black', status: 'rented', socPercent: 73, odometer: 37600, lat: 13.758, lng: 100.535, imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400', images: [], vin: 'BYD987654321', condition: 'Good', location: 'On Road', nextServiceDate: '2024-11-01', mileage: 37600, motorCutoffActive: false },
]

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Alex Chen', phone: '+66 81 234 5678', email: 'alex.chen@email.com', address: '123 Sukhumvit Rd, Bangkok', driverType: 'Grab', status: 'active', avatarUrl: 'https://i.pravatar.cc/150?img=3', creditScore: 850, rating: 4.9 },
  { id: '2', name: 'สมชาย ใจดี', phone: '+66 89 876 5432', email: 'somchai@email.com', address: '456 Rama 9, Bangkok', driverType: 'Bolt', status: 'pending_kyc', avatarUrl: 'https://i.pravatar.cc/150?img=8', creditScore: 0, rating: 0 },
  { id: '3', name: 'Maria Garcia', phone: '+66 81 555 1234', email: 'maria@email.com', address: '789 Thonglor, Bangkok', driverType: 'Grab', status: 'active', avatarUrl: 'https://i.pravatar.cc/150?img=5', creditScore: 720, rating: 4.7 },
  { id: '4', name: 'John Doe', phone: '+66 85 999 0000', email: 'john.doe@email.com', address: '321 Silom, Bangkok', driverType: 'Grab', status: 'blacklisted', avatarUrl: 'https://i.pravatar.cc/150?img=12', creditScore: 200, rating: 2.1, bannedDate: 'Oct 15, 2023', bannedReason: 'Vehicle Theft', bannedBy: 'Jane Smith' },
  { id: '5', name: 'Michael Brown', phone: '+66 82 111 2222', email: 'michael@email.com', address: '654 Phrom Phong, Bangkok', driverType: 'Bolt', status: 'blacklisted', avatarUrl: 'https://i.pravatar.cc/150?img=15', creditScore: 150, rating: 1.8, bannedDate: 'Oct 20, 2023', bannedReason: 'Long Overdue Payment', bannedBy: 'David Lee' },
  { id: '6', name: 'Sarah Davis', phone: '+66 83 333 4444', email: 'sarah@email.com', address: '987 Asok, Bangkok', driverType: 'Private', status: 'blacklisted', avatarUrl: 'https://i.pravatar.cc/150?img=9', creditScore: 100, rating: 1.5, bannedDate: 'Nov 1, 2023', bannedReason: 'Multiple Traffic Violations', bannedBy: 'Sarah Davis' },
  { id: '7', name: 'สุดา รักดี', phone: '+66 84 567 8901', email: 'suda@email.com', address: '147 Ladprao, Bangkok', driverType: 'Bolt', status: 'active', avatarUrl: 'https://i.pravatar.cc/150?img=25', creditScore: 910, rating: 5.0 },
  { id: '8', name: 'Kim Johnson', phone: '+66 86 234 5670', email: 'kim@email.com', address: '258 Ekkamai, Bangkok', driverType: 'Grab', status: 'pending_kyc', avatarUrl: 'https://i.pravatar.cc/150?img=20', creditScore: 0, rating: 0 },
]

export const mockContracts: Contract[] = [
  { id: '1', contractNo: 'EV-2024-001', customerId: '1', customerName: 'Alex Chen', vehicleId: '2', vehiclePlate: 'คง-5678', startDate: 'Jan 15, 2024', dueDate: 'Feb 14, 2024', depositAmount: 500, billingType: 'monthly', dailyRate: 85, monthlyRate: 2100, status: 'overdue', createdAt: '2024-01-15T00:00:00.000Z' },
  { id: '2', contractNo: 'EV-2024-002', customerId: '3', customerName: 'Maria Garcia', vehicleId: '7', vehiclePlate: 'ทน-6789', startDate: 'Jan 20, 2024', dueDate: 'Feb 19, 2024', depositAmount: 500, billingType: 'monthly', dailyRate: 90, monthlyRate: 2200, status: 'overdue', createdAt: '2024-01-20T00:00:00.000Z' },
  { id: '3', contractNo: 'EV-2024-003', customerId: '7', customerName: 'สุดา รักดี', vehicleId: '6', vehiclePlate: 'ตถ-2345', startDate: 'Feb 1, 2024', dueDate: 'Mar 1, 2024', depositAmount: 500, billingType: 'monthly', dailyRate: 80, monthlyRate: 1900, status: 'active', createdAt: '2024-02-01T00:00:00.000Z' },
  { id: '4', contractNo: 'EV-2024-004', customerId: '1', customerName: 'Alex Chen', vehicleId: '1', vehiclePlate: 'กข-1234', startDate: 'Feb 1, 2024', dueDate: 'May 1, 2024', depositAmount: 1000, billingType: 'monthly', dailyRate: 120, monthlyRate: 2500, status: 'active', createdAt: '2024-02-01T00:00:00.000Z' },
  { id: '5', contractNo: 'EV-2024-005', customerId: '3', customerName: 'Maria Garcia', vehicleId: '3', vehiclePlate: 'จฉ-9012', startDate: 'Mar 15, 2024', dueDate: 'Mar 1, 2024', depositAmount: 500, billingType: 'monthly', dailyRate: 90, monthlyRate: 1900, status: 'active', createdAt: '2024-03-15T00:00:00.000Z' },
]

export const mockInvoices: Invoice[] = [
  { id: 'INV-1001', invoiceNo: 'INV-1001', contractId: '4', customerName: 'John Doe', billingType: 'monthly', amount: 150.00, dueDate: 'Oct 15', status: 'paid', slipUrl: 'https://via.placeholder.com/200x300?text=Payment+Slip', createdAt: '2024-10-01T00:00:00.000Z' },
  { id: 'INV-1002', invoiceNo: 'INV-1002', contractId: '2', customerName: 'Jane Smith', billingType: 'monthly', amount: 220.50, dueDate: 'Oct 20', status: 'pending', slipUrl: 'https://via.placeholder.com/200x300?text=Payment+Slip', createdAt: '2024-10-05T00:00:00.000Z' },
  { id: 'INV-1003', invoiceNo: 'INV-1003', contractId: '1', customerName: 'Robert Jones', billingType: 'monthly', amount: 310.00, dueDate: 'Oct 25', status: 'overdue', daysOverdue: 15, lastContacted: '2 hours ago', createdAt: '2024-10-05T00:00:00.000Z' },
  { id: 'INV-1004', invoiceNo: 'INV-1004', contractId: '3', customerName: 'John Doe', billingType: 'monthly', amount: 150.00, dueDate: 'Oct 15', status: 'paid', createdAt: '2024-10-01T00:00:00.000Z' },
  { id: 'INV-1005', invoiceNo: 'INV-1005', contractId: '5', customerName: 'Jane Smith', billingType: 'monthly', amount: 220.50, dueDate: 'Oct 20', status: 'paid', createdAt: '2024-10-01T00:00:00.000Z' },
  { id: 'INV-1006', invoiceNo: 'INV-1006', contractId: '4', customerName: 'John Doe', billingType: 'daily', amount: 150.00, dueDate: 'Oct 17', status: 'paid', createdAt: '2024-10-03T00:00:00.000Z' },
  { id: 'INV-1007', invoiceNo: 'INV-1007', contractId: '1', customerName: 'Maria Garcia', billingType: 'monthly', amount: 800.00, dueDate: 'Oct 28', status: 'overdue', daysOverdue: 21, lastContacted: 'Yesterday', createdAt: '2024-10-07T00:00:00.000Z' },
  { id: 'INV-1008', invoiceNo: 'INV-1008', contractId: '2', customerName: 'Maria Markina', billingType: 'monthly', amount: 200.00, dueDate: 'Oct 30', status: 'overdue', daysOverdue: 19, lastContacted: '3 hours ago', createdAt: '2024-10-07T00:00:00.000Z' },
]

export const mockAlerts: Alert[] = [
  { id: '1', type: 'battery_low', message: 'Battery Low (15%) - กข-1234', severity: 'critical', createdAt: '3 hours ago' },
  { id: '2', type: 'geofence_breach', message: 'Geofence Breach - ณด-7890', severity: 'warning', createdAt: '3 hours ago' },
  { id: '3', type: 'payment_overdue', message: 'Payment Overdue - INV-1003', severity: 'warning', createdAt: '3 hours ago' },
  { id: '4', type: 'service_due', message: 'Service Due - ชซ-3456', severity: 'info', createdAt: '3 hours ago' },
  { id: '5', type: 'battery_low', message: 'Battery Low (12%) - ณด-7890', severity: 'critical', createdAt: '5 hours ago' },
]

export const mockGeofences: GeofenceZone[] = [
  { id: '1', name: 'Bangkok Central Zone', coordinates: [[13.75, 100.49], [13.76, 100.52], [13.74, 100.53], [13.73, 100.50]], active: true },
  { id: '2', name: 'Airport Hub Zone', coordinates: [[13.92, 100.60], [13.93, 100.62], [13.91, 100.63], [13.90, 100.61]], active: true },
  { id: '3', name: 'Sukhumvit Zone', coordinates: [[13.74, 100.55], [13.76, 100.57], [13.75, 100.58], [13.73, 100.56]], active: false },
]

export const mockAdminUsers: AdminUser[] = [
  { id: '1', name: 'John Smith', email: 'john.smith@evgo.com', role: 'super_admin', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: '2', name: 'Maria Garcia', email: 'maria.garcia@evgo.com', role: 'admin', createdAt: '2024-01-15T00:00:00.000Z' },
  { id: '3', name: 'David Lee', email: 'david.lee@evgo.com', role: 'viewer', createdAt: '2024-02-01T00:00:00.000Z' },
  { id: '4', name: 'Sarah Khan', email: 'sarah.khan@evgo.com', role: 'super_admin', createdAt: '2024-02-10T00:00:00.000Z' },
]

export const mockPricingPlans: PricingPlan[] = [
  { id: '1', vehicleModel: 'Tesla Model 3', dailyRate: 120, monthlyRate: 2500, deposit: 1000, enabled: true },
  { id: '2', vehicleModel: 'BYD Atto 3', dailyRate: 90, monthlyRate: 1900, deposit: 800, enabled: true },
  { id: '3', vehicleModel: 'Hyundai Ioniq 5', dailyRate: 110, monthlyRate: 2300, deposit: 1000, enabled: false },
]

export const revenueData: RevenueDataPoint[] = [
  { day: 'Mon', revenue: 52000 },
  { day: 'Tue', revenue: 48000 },
  { day: 'Wed', revenue: 61000 },
  { day: 'Thu', revenue: 55000 },
  { day: 'Fri', revenue: 67000 },
  { day: 'Sat', revenue: 78000 },
  { day: 'Sun', revenue: 85400 },
]
