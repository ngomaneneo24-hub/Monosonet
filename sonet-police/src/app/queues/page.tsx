"use client"
import React from 'react'

type Report = {
  id: string
  status: string
  priority: string
  report_type: string
  created_at: string
  target_id: string
}

export default function QueuesPage() {
  const [reports, setReports] = React.useState<Report[]>([])
  const [status, setStatus] = React.useState<string>('Pending')
  const [priority, setPriority] = React.useState<string>('')

  const fetchReports = React.useCallback(async () => {
    const params = new URLSearchParams()
    if (status) params.set('status', status.toLowerCase())
    if (priority) params.set('priority', priority.toLowerCase())
    params.set('limit', '50')
    const res = await fetch(`${process.env.NEXT_PUBLIC_MOD_API}/api/v1/reports?${params.toString()}`, { credentials: 'include' })
    const json = await res.json()
    setReports(json.data || [])
  }, [status, priority])

  React.useEffect(() => { fetchReports() }, [fetchReports])

  React.useEffect(() => {
    const es = new EventSource(`${process.env.NEXT_PUBLIC_MOD_API}/api/v1/stream/reports`, { withCredentials: true })
    es.onmessage = (ev) => {
      // naive refresh on any event for now
      fetchReports()
    }
    return () => es.close()
  }, [fetchReports])

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Queues</h1>
        <div className="flex gap-3 mb-4">
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Any status</option>
            <option>Pending</option>
            <option>UnderInvestigation</option>
            <option>Escalated</option>
            <option>Resolved</option>
            <option>Dismissed</option>
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Any priority</option>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
            <option>Urgent</option>
          </select>
        </div>
        <div className="border rounded bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">ID</th>
                <th className="p-2">Type</th>
                <th className="p-2">Priority</th>
                <th className="p-2">Status</th>
                <th className="p-2">Target</th>
                <th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-xs">{r.id}</td>
                  <td className="p-2">{r.report_type}</td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2 font-mono text-xs">{r.target_id}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

