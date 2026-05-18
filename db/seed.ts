import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import bcrypt from 'bcryptjs'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client, { schema })

async function seed() {
  console.log('🌱 Seeding database...')

  // Clear in reverse FK order
  await db.delete(schema.invoices)
  await db.delete(schema.contracts)
  await db.delete(schema.customers)
  await db.delete(schema.vehicles)
  await db.delete(schema.users)

  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin1234', 12)
  await db.insert(schema.users).values([
    { name: 'Super Admin', email: 'admin@evrentalgo.com', passwordHash, role: 'super_admin' },
    { name: 'Fleet Manager', email: 'fleet@evrentalgo.com', passwordHash, role: 'admin' },
    { name: 'Viewer Only', email: 'viewer@evrentalgo.com', passwordHash, role: 'viewer' },
  ])

  // ── Vehicles ───────────────────────────────────────────────────────────────
  const insertedVehicles = await db.insert(schema.vehicles).values([
    // Available (4)
    {
      plate: 'กข-1234', make: 'Tesla', model: 'Model 3', year: 2023, color: 'White',
      vin: 'LRWXB2FS8PC000001', status: 'available', socPercent: 87,
      odometer: 12500, mileage: 12500, lat: 13.7563, lng: 100.5018,
      condition: 'Excellent', location: 'Bangkok HQ', nextServiceDate: '2024-09-01',
    },
    {
      plate: 'ชซ-4488', make: 'BYD', model: 'Atto 3', year: 2023, color: 'Blue',
      vin: 'LGXCE4CB7P2000001', status: 'available', socPercent: 95,
      odometer: 5200, mileage: 5200, lat: 13.7450, lng: 100.5014,
      condition: 'Excellent', location: 'Bangkok HQ', nextServiceDate: '2024-10-15',
    },
    {
      plate: 'ตถ-7799', make: 'Neta', model: 'V Pro', year: 2023, color: 'Orange',
      vin: 'LS5A3EJB8PA000001', status: 'available', socPercent: 72,
      odometer: 18700, mileage: 18700, lat: 13.7510, lng: 100.4952,
      condition: 'Good', location: 'Chatuchak Hub', nextServiceDate: '2024-08-20',
    },
    {
      plate: 'นบ-2211', make: 'MG', model: 'MG4', year: 2024, color: 'Silver',
      vin: 'LSJA24C08R7000001', status: 'available', socPercent: 100,
      odometer: 1800, mileage: 1800, lat: 13.7580, lng: 100.5235,
      condition: 'Excellent', location: 'Rama 9 Hub', nextServiceDate: '2025-01-01',
    },
    // Rented (3)
    {
      plate: 'คง-5678', make: 'Tesla', model: 'Model Y', year: 2023, color: 'Black',
      vin: 'LRWYGCFS0PA000001', status: 'rented', socPercent: 62,
      odometer: 8900, mileage: 8900, lat: 13.7600, lng: 100.5100,
      condition: 'Good', location: 'On Road - Asok', nextServiceDate: '2024-08-15',
    },
    {
      plate: 'ดต-3322', make: 'Hyundai', model: 'Ioniq 5', year: 2022, color: 'Cyber Gray',
      vin: 'KMHM3817XNU000001', status: 'rented', socPercent: 45,
      odometer: 22100, mileage: 22100, lat: 13.7290, lng: 100.5245,
      condition: 'Good', location: 'On Road - Silom', nextServiceDate: '2024-09-10',
    },
    {
      plate: 'พฟ-6655', make: 'ORA', model: 'Good Cat', year: 2022, color: 'Pink',
      vin: 'LSGTADB38N3000001', status: 'rented', socPercent: 33,
      odometer: 31500, mileage: 31500, lat: 13.7120, lng: 100.5370,
      condition: 'Fair', location: 'On Road - Sathon', nextServiceDate: '2024-07-30',
    },
    // Charging (2)
    {
      plate: 'ภม-9900', make: 'BYD', model: 'Dolphin', year: 2023, color: 'White',
      vin: 'LGXCEKCB7P3000001', status: 'charging', socPercent: 34,
      odometer: 14300, mileage: 14300, lat: 13.7481, lng: 100.4953,
      condition: 'Good', location: 'EV Station - Ladprao', nextServiceDate: '2024-09-20',
    },
    {
      plate: 'ยร-1100', make: 'Neta', model: 'U Pro', year: 2023, color: 'Gray',
      vin: 'LS5A3EJB8PB000001', status: 'charging', socPercent: 18,
      odometer: 27600, mileage: 27600, lat: 13.7390, lng: 100.5160,
      condition: 'Good', location: 'EV Station - Thonglor', nextServiceDate: '2024-08-05',
    },
    // Under Repair (2)
    {
      plate: 'ลว-5544', make: 'Tesla', model: 'Model 3', year: 2021, color: 'Red',
      vin: 'LRWXB2FS8MC000001', status: 'under_repair', socPercent: 91,
      odometer: 55000, mileage: 55000, lat: 13.7650, lng: 100.5080,
      condition: 'Fair', location: 'Workshop - Bangna', nextServiceDate: '2024-06-01',
    },
    {
      plate: 'ศษ-8877', make: 'MG', model: 'ZS EV', year: 2021, color: 'Green',
      vin: 'LSJA24C05M7000001', status: 'under_repair', socPercent: 55,
      odometer: 43800, mileage: 43800, lat: 13.7520, lng: 100.5320,
      condition: 'Poor', location: 'Workshop - Bangna', nextServiceDate: '2024-06-15',
    },
    // Offline (1)
    {
      plate: 'ถท-2345', make: 'ORA', model: 'Good Cat', year: 2021, color: 'Teal',
      vin: 'LSGTADB38M3000001', status: 'offline', socPercent: 8,
      odometer: 62000, mileage: 62000, lat: 13.7620, lng: 100.4980,
      condition: 'Poor', location: 'Unknown', nextServiceDate: '2024-05-01',
    },
  ]).returning()

  // ── Customers ──────────────────────────────────────────────────────────────
  const insertedCustomers = await db.insert(schema.customers).values([
    // Active — full KYC (4)
    {
      name: 'สมชาย ใจดี',
      phone: '089-123-4567',
      email: 'somchai.j@email.com',
      address: '123/5 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
      status: 'active',
      driverType: 'Grab',
      idCardNumber: '1100800123456',
      dateOfBirth: '15/03/1990',
      creditScore: 820,
      rating: 4.8,
      notes: 'ลูกค้าดี ชำระตรงเวลาเสมอ',
    },
    {
      name: 'วิชัย มั่นคง',
      phone: '081-456-7890',
      email: 'wichai.m@email.com',
      address: '45/2 ถ.รามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
      status: 'active',
      driverType: 'Bolt',
      idCardNumber: '1100800234567',
      dateOfBirth: '22/07/1985',
      creditScore: 750,
      rating: 4.5,
    },
    {
      name: 'สุภา รักชาติ',
      phone: '086-789-0123',
      email: 'supa.r@email.com',
      address: '88 ซ.ลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',
      status: 'active',
      driverType: 'Grab',
      idCardNumber: '1100800345678',
      dateOfBirth: '05/11/1992',
      creditScore: 680,
      rating: 4.2,
    },
    {
      name: 'รัตนา พงษ์ทอง',
      phone: '092-234-5678',
      email: 'rattana.p@email.com',
      address: '200/10 ถ.สาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพฯ 10120',
      status: 'active',
      driverType: 'Bolt',
      idCardNumber: '1100800456789',
      dateOfBirth: '18/04/1988',
      creditScore: 790,
      rating: 4.9,
    },
    // Pending KYC (3)
    {
      name: 'มาลี สุวรรณ',
      phone: '081-234-5678',
      email: 'malee.s@email.com',
      address: '456 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
      status: 'pending_kyc',
      driverType: 'Bolt',
      idCardNumber: '1100800567890',
      dateOfBirth: '30/09/1995',
      creditScore: 0,
      rating: 0,
    },
    {
      name: 'ประทีป สีทอง',
      phone: '083-345-6789',
      email: 'prateep.s@email.com',
      address: '15/3 ถ.เพชรบุรีตัดใหม่ แขวงมักกะสัน เขตราชเทวี กรุงเทพฯ 10400',
      status: 'pending_kyc',
      driverType: 'Grab',
      creditScore: 0,
      rating: 0,
    },
    {
      name: 'กนกวรรณ ดาวเรือง',
      phone: '095-456-7890',
      email: 'kanokwan.d@email.com',
      address: '67 ถ.งามวงศ์วาน แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพฯ 10210',
      status: 'pending_kyc',
      driverType: 'Grab',
      idCardNumber: '1100800678901',
      dateOfBirth: '12/01/1997',
      creditScore: 0,
      rating: 0,
    },
    // Rejected (1)
    {
      name: 'อนุชา วงษ์สวัสดิ์',
      phone: '097-567-8901',
      email: 'anucha.w@email.com',
      address: '300 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900',
      status: 'rejected',
      driverType: 'Bolt',
      kycNotes: 'เอกสารบัตรประชาชนหมดอายุ กรุณานำเอกสารใหม่มายื่นอีกครั้ง',
      creditScore: 0,
      rating: 0,
    },
    // Suspended (1)
    {
      name: 'เพชรรัตน์ บุญมา',
      phone: '098-678-9012',
      email: 'phetrat.b@email.com',
      address: '512 ถ.รัชดาภิเษก แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900',
      status: 'suspended',
      driverType: 'Grab',
      idCardNumber: '1100800789012',
      dateOfBirth: '03/06/1987',
      creditScore: 420,
      rating: 3.1,
      notes: 'พักสิทธิ์ชั่วคราว เนื่องจากชำระล่าช้าหลายครั้ง',
    },
    // Blacklisted (1)
    {
      name: 'นรงค์ ชัยชนะ',
      phone: '090-345-6789',
      email: 'narong.c@email.com',
      address: '789 ถ.ลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ 10230',
      status: 'blacklisted',
      driverType: 'Grab',
      idCardNumber: '1100800890123',
      dateOfBirth: '10/12/1983',
      creditScore: 280,
      rating: 2.8,
      bannedDate: '01/03/2024',
      bannedReason: 'ค้างชำระเงินมากกว่า 90 วัน และไม่ติดต่อกลับ',
      bannedBy: 'Super Admin',
    },
  ]).returning()

  // Build lookup maps
  const veh = Object.fromEntries(insertedVehicles.map(v => [v.plate, v]))
  const cust = Object.fromEntries(insertedCustomers.map(c => [c.phone, c]))

  const somchai  = cust['089-123-4567']
  const wichai   = cust['081-456-7890']
  const supa     = cust['086-789-0123']
  const rattana  = cust['092-234-5678']
  const phetrat  = cust['098-678-9012']
  const narong   = cust['090-345-6789']

  const teslaY    = veh['คง-5678']   // rented
  const ioniq5    = veh['ดต-3322']   // rented
  const oraCat    = veh['พฟ-6655']   // rented
  const atto3     = veh['ชซ-4488']   // available (completed contract)
  const tesla3Old = veh['ลว-5544']   // under_repair (completed contract)
  const mgZs      = veh['ศษ-8877']   // under_repair (overdue contract)

  // ── Contracts ──────────────────────────────────────────────────────────────
  const insertedContracts = await db.insert(schema.contracts).values([
    // Active (2)
    {
      contractNo: 'EVR-2024-001',
      customerId: somchai.id, vehicleId: teslaY.id,
      customerName: somchai.name, vehiclePlate: teslaY.plate,
      startDate: '01/05/2024', dueDate: '31/05/2024', status: 'active',
      dailyRate: 1200, monthlyRate: 28000, depositAmount: 10000,
    },
    {
      contractNo: 'EVR-2024-002',
      customerId: wichai.id, vehicleId: ioniq5.id,
      customerName: wichai.name, vehiclePlate: ioniq5.plate,
      startDate: '10/05/2024', dueDate: '10/06/2024', status: 'active',
      dailyRate: 1000, monthlyRate: 24000, depositAmount: 8000,
    },
    // Overdue (2)
    {
      contractNo: 'EVR-2024-003',
      customerId: supa.id, vehicleId: oraCat.id,
      customerName: supa.name, vehiclePlate: oraCat.plate,
      startDate: '01/04/2024', dueDate: '30/04/2024', status: 'overdue',
      dailyRate: 900, monthlyRate: 21000, depositAmount: 7000,
    },
    {
      contractNo: 'EVR-2024-006',
      customerId: phetrat.id, vehicleId: mgZs.id,
      customerName: phetrat.name, vehiclePlate: mgZs.plate,
      startDate: '01/02/2024', dueDate: '29/02/2024', status: 'overdue',
      dailyRate: 800, monthlyRate: 19000, depositAmount: 6000,
    },
    // Completed (2)
    {
      contractNo: 'EVR-2024-004',
      customerId: rattana.id, vehicleId: atto3.id,
      customerName: rattana.name, vehiclePlate: atto3.plate,
      startDate: '01/03/2024', dueDate: '31/03/2024', status: 'completed',
      dailyRate: 1100, monthlyRate: 26000, depositAmount: 9000,
    },
    {
      contractNo: 'EVR-2024-005',
      customerId: narong.id, vehicleId: tesla3Old.id,
      customerName: narong.name, vehiclePlate: tesla3Old.plate,
      startDate: '01/01/2024', dueDate: '31/01/2024', status: 'completed',
      dailyRate: 1200, monthlyRate: 28000, depositAmount: 10000,
    },
  ]).returning()

  const contr = Object.fromEntries(insertedContracts.map(c => [c.contractNo, c]))
  const c001 = contr['EVR-2024-001']
  const c002 = contr['EVR-2024-002']
  const c003 = contr['EVR-2024-003']
  const c004 = contr['EVR-2024-004']
  const c005 = contr['EVR-2024-005']
  const c006 = contr['EVR-2024-006']

  // ── Invoices ───────────────────────────────────────────────────────────────
  await db.insert(schema.invoices).values([
    // C001 — Active (Somchai / Tesla Y)
    {
      invoiceNo: 'INV-2024-001',
      contractId: c001.id, customerId: somchai.id,
      customerName: somchai.name, vehiclePlate: teslaY.plate,
      billingType: 'one_time', description: 'เงินมัดจำสัญญา EVR-2024-001',
      amount: 10000, dueDate: '01/05/2024', status: 'paid',
      paidAt: '01/05/2024', daysOverdue: 0,
    },
    {
      invoiceNo: 'INV-2024-002',
      contractId: c001.id, customerId: somchai.id,
      customerName: somchai.name, vehiclePlate: teslaY.plate,
      billingType: 'monthly', description: 'ค่าเช่ารถประจำเดือนพฤษภาคม 2567',
      amount: 28000, dueDate: '31/05/2024', status: 'pending', daysOverdue: 0,
    },
    // C002 — Active (Wichai / Ioniq 5)
    {
      invoiceNo: 'INV-2024-003',
      contractId: c002.id, customerId: wichai.id,
      customerName: wichai.name, vehiclePlate: ioniq5.plate,
      billingType: 'one_time', description: 'เงินมัดจำสัญญา EVR-2024-002',
      amount: 8000, dueDate: '10/05/2024', status: 'paid',
      paidAt: '10/05/2024', daysOverdue: 0,
    },
    {
      invoiceNo: 'INV-2024-004',
      contractId: c002.id, customerId: wichai.id,
      customerName: wichai.name, vehiclePlate: ioniq5.plate,
      billingType: 'monthly', description: 'ค่าเช่ารถประจำเดือนมิถุนายน 2567',
      amount: 24000, dueDate: '10/06/2024', status: 'pending', daysOverdue: 0,
    },
    // C003 — Overdue (Supa / ORA Cat)
    {
      invoiceNo: 'INV-2024-005',
      contractId: c003.id, customerId: supa.id,
      customerName: supa.name, vehiclePlate: oraCat.plate,
      billingType: 'one_time', description: 'เงินมัดจำสัญญา EVR-2024-003',
      amount: 7000, dueDate: '01/04/2024', status: 'paid',
      paidAt: '01/04/2024', daysOverdue: 0,
    },
    {
      invoiceNo: 'INV-2024-006',
      contractId: c003.id, customerId: supa.id,
      customerName: supa.name, vehiclePlate: oraCat.plate,
      billingType: 'monthly', description: 'ค่าเช่ารถประจำเดือนเมษายน 2567',
      amount: 21000, dueDate: '30/04/2024', status: 'overdue',
      daysOverdue: 34, lastContacted: '10/05/2024',
    },
    {
      invoiceNo: 'INV-2024-007',
      contractId: c003.id, customerId: supa.id,
      customerName: supa.name, vehiclePlate: oraCat.plate,
      billingType: 'one_time', description: 'ค่าปรับความล่าช้าในการชำระเงิน',
      amount: 2100, dueDate: '15/05/2024', status: 'overdue',
      daysOverdue: 19, lastContacted: '12/05/2024',
    },
    // C004 — Completed (Rattana / Atto 3)
    {
      invoiceNo: 'INV-2024-008',
      contractId: c004.id, customerId: rattana.id,
      customerName: rattana.name, vehiclePlate: atto3.plate,
      billingType: 'one_time', description: 'เงินมัดจำสัญญา EVR-2024-004',
      amount: 9000, dueDate: '01/03/2024', status: 'paid',
      paidAt: '01/03/2024', daysOverdue: 0,
    },
    {
      invoiceNo: 'INV-2024-009',
      contractId: c004.id, customerId: rattana.id,
      customerName: rattana.name, vehiclePlate: atto3.plate,
      billingType: 'monthly', description: 'ค่าเช่ารถประจำเดือนมีนาคม 2567',
      amount: 26000, dueDate: '31/03/2024', status: 'paid',
      paidAt: '28/03/2024', daysOverdue: 0,
    },
    // C005 — Completed (Narong / Tesla 3 old)
    {
      invoiceNo: 'INV-2024-010',
      contractId: c005.id, customerId: narong.id,
      customerName: narong.name, vehiclePlate: tesla3Old.plate,
      billingType: 'one_time', description: 'เงินมัดจำสัญญา EVR-2024-005',
      amount: 10000, dueDate: '01/01/2024', status: 'paid',
      paidAt: '01/01/2024', daysOverdue: 0,
    },
    {
      invoiceNo: 'INV-2024-011',
      contractId: c005.id, customerId: narong.id,
      customerName: narong.name, vehiclePlate: tesla3Old.plate,
      billingType: 'monthly', description: 'ค่าเช่ารถประจำเดือนมกราคม 2567',
      amount: 28000, dueDate: '31/01/2024', status: 'paid',
      paidAt: '30/01/2024', daysOverdue: 0,
    },
    // C006 — Overdue (Phetrat / MG ZS)
    {
      invoiceNo: 'INV-2024-012',
      contractId: c006.id, customerId: phetrat.id,
      customerName: phetrat.name, vehiclePlate: mgZs.plate,
      billingType: 'monthly', description: 'ค่าเช่ารถประจำเดือนกุมภาพันธ์ 2567',
      amount: 19000, dueDate: '29/02/2024', status: 'overdue',
      daysOverdue: 91, lastContacted: '15/04/2024',
    },
    {
      invoiceNo: 'INV-2024-013',
      contractId: c006.id, customerId: phetrat.id,
      customerName: phetrat.name, vehiclePlate: mgZs.plate,
      billingType: 'one_time', description: 'ค่าปรับความล่าช้า + ดอกเบี้ย 3 เดือน',
      amount: 5700, dueDate: '29/05/2024', status: 'overdue',
      daysOverdue: 5,
    },
  ])

  console.log('✅ Seed complete!')
  console.log(`  Users:     3`)
  console.log(`  Vehicles:  ${insertedVehicles.length}`)
  console.log(`  Customers: ${insertedCustomers.length}`)
  console.log(`  Contracts: ${insertedContracts.length}`)
  console.log(`  Invoices:  13`)
  await client.end()
}

seed().catch(e => { console.error(e); process.exit(1) })
