export default function BackofficeLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Filter bar skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
        <div className="flex gap-3 items-center">
          <div className="h-9 flex-1 max-w-xs bg-slate-100 rounded-xl" />
          <div className="h-9 w-48 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header row */}
        <div className="flex gap-4 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          {[120, 100, 140, 80, 80].map((w, i) => (
            <div key={i} className="h-3.5 bg-slate-200 rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center px-5 py-4 border-b border-slate-100">
            <div className="h-4 w-28 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-36 bg-slate-100 rounded" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
            <div className="h-4 w-16 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
