import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { metricsApi } from '../../api/metrics'
import type { MethodMetrics } from '../../api/metrics'
import { useToast } from '../../components/ToastProvider'

export const MetricsDashboardPage: React.FC = () => {
  const [excludeSynthetic, setExcludeSynthetic] = useState(true)
  const [sortKey, setSortKey] = useState<keyof MethodMetrics>('rmse')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['globalMetrics', excludeSynthetic],
    queryFn: () => metricsApi.getGlobalMetrics(!excludeSynthetic),
    retry: false
  })

  const recomputeMutation = useMutation({
    mutationFn: metricsApi.recomputeMetrics,
    onSuccess: () => {
      toast.success({ title: 'Success', body: 'Metrics recomputed successfully' })
      queryClient.invalidateQueries({ queryKey: ['globalMetrics'] })
    },
    onError: () => {
      toast.error({ title: 'Error', body: 'Failed to recompute metrics' })
    }
  })

  const methods = data?.methods || []

  // Find best methods
  const bestMethods = useMemo(() => {
    if (!methods.length) return {}
    
    return {
      precision_at_10: methods.reduce((prev, current) => (prev.precision_at_10 > current.precision_at_10) ? prev : current).method,
      recall_at_10: methods.reduce((prev, current) => (prev.recall_at_10 > current.recall_at_10) ? prev : current).method,
      ndcg_at_10: methods.reduce((prev, current) => (prev.ndcg_at_10 > current.ndcg_at_10) ? prev : current).method,
      rmse: methods.reduce((prev, current) => ((prev.rmse || 999) < (current.rmse || 999)) ? prev : current).method,
    }
  }, [methods])

  const sortedMethods = useMemo(() => {
    return [...methods].sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      
      // For string (method name)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      // For numbers
      if (sortOrder === 'asc') {
        return (aVal as number) - (bVal as number)
      } else {
        return (bVal as number) - (aVal as number)
      }
    })
  }, [methods, sortKey, sortOrder])

  const handleSort = (key: keyof MethodMetrics) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder(key === 'rmse' ? 'asc' : 'desc') // default RMSE asc (lower better), others desc
    }
  }

  const renderSortIcon = (key: keyof MethodMetrics) => {
    if (sortKey !== key) return <span className="text-gray-400">↕</span>
    return sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'just now'
    return `${diff}m ago`
  }

  if (isLoading) return <div className="p-8 text-center">Loading metrics...</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-color)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-color)]">Global Metrics</h1>
          {data?.generated_at && (
            <p className="text-sm text-[var(--text-color-secondary)]">
              Last computed: {formatTimeAgo(data.generated_at)}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={excludeSynthetic}
              onChange={(e) => setExcludeSynthetic(e.target.checked)}
              className="w-4 h-4 text-[var(--color-brand-navy)] rounded"
            />
            <span className="text-sm font-medium">Exclude synthetic data</span>
          </label>
          
          <button
            onClick={() => recomputeMutation.mutate()}
            disabled={recomputeMutation.isPending}
            className="px-4 py-2 bg-[var(--color-brand-maroon)] text-white rounded font-medium hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {recomputeMutation.isPending ? 'Computing...' : 'Recompute metrics'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200">
          No metrics available or failed to load. Try recomputing.
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-lg shadow overflow-hidden border border-[var(--border-color)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
                  <th className="p-3 cursor-pointer hover:bg-black/5" onClick={() => handleSort('method')}>
                    Method {renderSortIcon('method')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-black/5" onClick={() => handleSort('precision_at_10')}>
                    Precision@10 {renderSortIcon('precision_at_10')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-black/5" onClick={() => handleSort('recall_at_10')}>
                    Recall@10 {renderSortIcon('recall_at_10')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-black/5" onClick={() => handleSort('ndcg_at_10')}>
                    NDCG@10 {renderSortIcon('ndcg_at_10')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-black/5" onClick={() => handleSort('rmse')}>
                    RMSE <span className="bg-green-100 text-green-800 text-xs px-1 rounded ml-1">Lower is better</span> {renderSortIcon('rmse')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMethods.map((m) => (
                  <tr key={m.method} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="p-3 font-medium">{m.method}</td>
                    <td className="p-3">
                      {m.precision_at_10?.toFixed(3)}
                      {bestMethods.precision_at_10 === m.method && <span className="ml-2 text-yellow-500" aria-label="best precision">🏆</span>}
                    </td>
                    <td className="p-3">
                      {m.recall_at_10?.toFixed(3)}
                      {bestMethods.recall_at_10 === m.method && <span className="ml-2 text-yellow-500" aria-label="best recall">🏆</span>}
                    </td>
                    <td className="p-3">
                      {m.ndcg_at_10?.toFixed(3)}
                      {bestMethods.ndcg_at_10 === m.method && <span className="ml-2 text-yellow-500" aria-label="best ndcg">🏆</span>}
                    </td>
                    <td className="p-3">
                      {m.rmse ? m.rmse.toFixed(3) : '—'}
                      {bestMethods.rmse === m.method && <span className="ml-2 text-yellow-500" aria-label="best rmse">🏆</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Precision@10" data={methods} dataKey="precision_at_10" />
            <ChartCard title="Recall@10" data={methods} dataKey="recall_at_10" />
            <ChartCard title="NDCG@10" data={methods} dataKey="ndcg_at_10" />
            <ChartCard title="RMSE" data={methods} dataKey="rmse" />
          </div>
        </>
      )}
    </div>
  )
}

const ChartCard: React.FC<{ title: string, data: any[], dataKey: string }> = ({ title, data, dataKey }) => {
  return (
    <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-color)]">
      <h3 className="font-semibold mb-4 text-[var(--text-color)]">{title}</h3>
      <div className="h-64" aria-label={`${title} chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis dataKey="method" tick={{fill: 'var(--text-color-secondary)'}} />
            <YAxis tick={{fill: 'var(--text-color-secondary)'}} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
            />
            <Bar dataKey={dataKey} fill="var(--color-brand-navy)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
