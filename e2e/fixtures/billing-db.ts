import fs from 'fs'
import path from 'path'
import postgres from 'postgres'

function loadTestDatabaseUrl(): string {
  const envPath = path.join(__dirname, '../../.env.test')
  const content = fs.readFileSync(envPath, 'utf-8')
  const match = content.match(/^DATABASE_URL=(.+)$/m)
  if (!match) throw new Error('DATABASE_URL not found in .env.test')
  return match[1].trim()
}

let sql: postgres.Sql | null = null
function client(): postgres.Sql {
  if (!sql) sql = postgres(loadTestDatabaseUrl(), { prepare: false, max: 1 })
  return sql
}

export async function closeBillingDb(): Promise<void> {
  if (sql) {
    await sql.end()
    sql = null
  }
}

export async function seedCustomer(name: string): Promise<string> {
  const db = client()
  const [row] = await db<{ id: string }[]>`
    insert into customers (name, phone, status)
    values (${name}, '0800000000', 'active')
    returning id
  `
  return row.id
}

export async function seedVehicle(plate: string): Promise<string> {
  const db = client()
  const [row] = await db<{ id: string }[]>`
    insert into vehicles (plate, make, model, year)
    values (${plate}, 'Test', 'Fixture', 2024)
    returning id
  `
  return row.id
}

export interface SeedContractInput {
  contractNo: string
  customerId: string
  vehicleId: string
  customerName: string
  vehiclePlate: string
  billingType: 'daily' | 'monthly'
  dailyRate: number
  monthlyRate: number
}

// startDate/dueDate aren't exercised by the daily-invoice path (only monthly
// uses startDate, via buildMonthlyDueDate), so fixed placeholder values are fine.
export async function seedContract(input: SeedContractInput): Promise<string> {
  const db = client()
  const [row] = await db<{ id: string }[]>`
    insert into contracts (
      contract_no, customer_id, vehicle_id, customer_name, vehicle_plate,
      start_date, due_date, status, billing_type, daily_rate, monthly_rate, deposit_amount
    )
    values (
      ${input.contractNo}, ${input.customerId}, ${input.vehicleId}, ${input.customerName}, ${input.vehiclePlate},
      '01/01/2026', '01/02/2026', 'active', ${input.billingType}, ${input.dailyRate}, ${input.monthlyRate}, 0
    )
    returning id
  `
  return row.id
}

export interface SeedInvoiceInput {
  invoiceNo: string
  customerName: string
  amount: number
  dueDate: string
  status: 'pending' | 'paid' | 'overdue'
}

export async function seedInvoice(input: SeedInvoiceInput): Promise<string> {
  const db = client()
  const [row] = await db<{ id: string }[]>`
    insert into invoices (invoice_no, customer_name, amount, due_date, status)
    values (${input.invoiceNo}, ${input.customerName}, ${input.amount}, ${input.dueDate}, ${input.status})
    returning id
  `
  return row.id
}

export async function deleteContracts(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = client()
  await db`delete from contracts where id in ${db(ids)}`
}

export async function deleteCustomers(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = client()
  await db`delete from customers where id in ${db(ids)}`
}

export async function deleteVehicles(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = client()
  await db`delete from vehicles where id in ${db(ids)}`
}

export async function deleteInvoices(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = client()
  await db`delete from invoices where id in ${db(ids)}`
}

// The generate-invoices cron response doesn't echo the new row's id, only its
// invoiceNo/contractNo — deleting by the FK instead lets the test clean up
// without an extra lookup query, and also clears the way for deleteContracts
// (invoices.contract_id has no ON DELETE CASCADE).
export async function deleteInvoicesByContractIds(contractIds: string[]): Promise<void> {
  if (contractIds.length === 0) return
  const db = client()
  await db`delete from invoices where contract_id in ${db(contractIds)}`
}
