import { pgTable, varchar, boolean, timestamp, pgEnum, primaryKey } from 'drizzle-orm/pg-core'

export const resourceEnum = pgEnum('resource', [
  'vehicles',
  'customers',
  'contracts',
  'billing',
  'maintenance',
  'reports',
  'settings',
])

export const rolePermissions = pgTable('role_permissions', {
  role: varchar('role', { length: 50 }).notNull(),
  resource: resourceEnum('resource').notNull(),
  canRead: boolean('can_read').notNull().default(false),
  canWrite: boolean('can_write').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.role, t.resource] })])

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert
