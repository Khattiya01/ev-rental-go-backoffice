import { mockAdminUsers } from '@/lib/mock-data'
import Badge from '@/components/ui/badge'

export default function UsersSettingsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Users & Roles</h1>
        <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          + Add New Admin
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Name</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Email</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Role</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Status</th>
              <th className="text-left text-slate-400 text-xs font-medium px-5 py-3 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockAdminUsers.map(user => (
              <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-5 py-3 text-slate-200 text-sm font-medium">{user.name}</td>
                <td className="px-5 py-3 text-slate-400 text-sm">{user.email}</td>
                <td className="px-5 py-3 text-slate-300 text-sm">{user.role}</td>
                <td className="px-5 py-3">
                  <Badge variant={user.status === 'Active' ? 'active' : 'inactive'} />
                </td>
                <td className="px-5 py-3">
                  <button className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
