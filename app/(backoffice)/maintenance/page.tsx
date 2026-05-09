const tickets = [
  { id: '1', plate: 'ชซ-3456', model: 'Hyundai Ioniq 5', issue: 'Brake inspection', status: 'in_progress', assigned: 'David Lee', priority: 'High' },
  { id: '2', plate: 'กข-1234', model: 'Tesla Model 3', issue: 'Scheduled PM service', status: 'todo', assigned: 'David Lee', priority: 'Medium' },
  { id: '3', plate: 'คง-5678', model: 'Tesla Model Y', issue: 'AC system check', status: 'done', assigned: 'Technician B', priority: 'Low' },
] as const

const columns = [
  { key: 'todo', label: 'To Do', color: 'border-slate-500', bg: 'bg-slate-500/10' },
  { key: 'in_progress', label: 'In Progress', color: 'border-amber-500', bg: 'bg-amber-500/10' },
  { key: 'done', label: 'Done', color: 'border-green-500', bg: 'bg-green-500/10' },
] as const

const priorityStyles = {
  High: 'bg-red-500/20 text-red-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  Low: 'bg-green-500/20 text-green-400',
} as const

export default function MaintenancePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-white text-xl font-bold">Service Tickets</h1>
      <div className="grid grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.key} className={`${col.bg} border ${col.color} rounded-xl p-4`}>
            <h2 className="text-white font-semibold mb-3">{col.label}</h2>
            <div className="space-y-3">
              {tickets
                .filter(t => t.status === col.key)
                .map(ticket => (
                  <div key={ticket.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-200 font-medium text-sm">{ticket.plate}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityStyles[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">{ticket.model}</p>
                    <p className="text-slate-300 text-sm mt-1">{ticket.issue}</p>
                    <p className="text-slate-500 text-xs mt-2">👤 {ticket.assigned}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
