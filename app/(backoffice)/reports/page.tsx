const reports = [
  {
    title: 'Financial Report',
    description: 'Revenue, bad debt, and payment summary. Export as Excel/CSV.',
    icon: '💰',
    color: 'bg-green-500/10 border-green-500/30',
    action: 'Generate Report',
  },
  {
    title: 'Asset Report',
    description: 'Vehicle utilization rate — % rented vs parked by period.',
    icon: '🚗',
    color: 'bg-blue-500/10 border-blue-500/30',
    action: 'Generate Report',
  },
  {
    title: 'Battery Health Report',
    description: 'Vehicles with low SoH flagged for battery replacement review.',
    icon: '🔋',
    color: 'bg-amber-500/10 border-amber-500/30',
    action: 'Generate Report',
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-white text-xl font-bold">Reports & Analytics</h1>
      <div className="grid grid-cols-3 gap-4">
        {reports.map(report => (
          <div key={report.title} className={`bg-slate-800 rounded-xl border p-6 ${report.color}`}>
            <div className="text-4xl mb-4">{report.icon}</div>
            <h2 className="text-white font-bold text-lg mb-2">{report.title}</h2>
            <p className="text-slate-400 text-sm mb-5">{report.description}</p>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {report.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
