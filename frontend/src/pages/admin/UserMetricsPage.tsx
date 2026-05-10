import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts'
import { metricsApi } from '../../api/metrics'
import type { UserSearchResult } from '../../api/metrics'
import { ProductCard } from '../../components/ProductCard'

export const UserMetricsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch search results
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['adminUsers', debouncedSearch],
    queryFn: () => metricsApi.searchUsers(debouncedSearch),
    enabled: debouncedSearch.length > 0,
  })

  // Fetch user metrics (recommendations + precision)
  const { data: userMetrics, isFetching: isLoadingMetrics } = useQuery({
    queryKey: ['userMetrics', selectedUser?.id],
    queryFn: () => metricsApi.getUserMetrics(selectedUser!.id),
    enabled: !!selectedUser,
  })

  // Fetch user stats (distributions, categories, overlap)
  const { data: userStats } = useQuery({
    queryKey: ['userStats', selectedUser?.id],
    queryFn: () => metricsApi.getUserStats(selectedUser!.id),
    enabled: !!selectedUser,
  })

  const exportCSV = () => {
    if (!userMetrics?.methods) return

    const methods = userMetrics.methods
    const header = methods.map(m => m.method).join(',')
    const maxLength = Math.max(...methods.map(m => m.list.length))

    const rows: string[] = []
    for (let i = 0; i < maxLength; i++) {
      const row = methods.map(m => {
        const item = m.list[i]
        return item ? `"${item.name.replace(/"/g, '""')}"` : ''
      })
      rows.push(row.join(','))
    }

    const csvContent = [header, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `user_${selectedUser?.id}_metrics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Find best method
  const bestMethod = React.useMemo(() => {
    if (!userMetrics?.methods.length) return null
    return userMetrics.methods.reduce((prev, current) =>
      (prev.precision_at_10 > current.precision_at_10) ? prev : current
    ).method
  }, [userMetrics])

  // Radar chart data
  const radarData = React.useMemo(() => {
    if (!userMetrics?.methods) return []
    return userMetrics.methods.map(m => ({
      method: m.method.replace('Item-Based Cosine CF', 'Item CF').replace('User-Based KNN', 'User KNN'),
      precision: m.precision_at_10,
      fullMethod: m.method,
    }))
  }, [userMetrics])

  // Rating distribution chart data
  const ratingChartData = React.useMemo(() => {
    if (!userStats?.rating_distribution) return []
    return Object.entries(userStats.rating_distribution).map(([star, count]) => ({
      star: `${star}★`,
      count,
    }))
  }, [userStats])

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-color)]">
        <div className="relative flex-grow max-w-md">
          <label className="block text-sm font-medium text-[var(--text-color-secondary)] mb-1">
            Search User
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type username or email..."
            className="w-full border border-[var(--border-color)] rounded px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-color)]"
            role="combobox"
            aria-expanded={searchResults && searchResults.length > 0}
          />
          {isSearching && <span className="absolute right-3 top-9 text-xs text-gray-400">Loading...</span>}

          {searchResults && searchResults.length > 0 && searchTerm !== '' && (
            <ul className="absolute z-10 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((user) => (
                <li
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user)
                    setSearchTerm('')
                  }}
                  className="px-4 py-2 hover:bg-[var(--bg-tertiary)] cursor-pointer"
                >
                  <div className="font-medium text-[var(--text-color)]">{user.username}</div>
                  <div className="text-xs text-[var(--text-color-secondary)]">{user.email}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {userMetrics && (
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-gray-100 text-[var(--text-color)] border border-[var(--border-color)] rounded font-medium hover:bg-gray-200 transition-colors self-end"
          >
            Export to CSV
          </button>
        )}
      </div>

      {isLoadingMetrics && <div className="text-center p-8">Loading user metrics...</div>}

      {userMetrics && userStats && (
        <div className="space-y-8">

          {/* ═══ 1. User Profile Card ═══ */}
          <div className="bg-[var(--bg-card)] rounded-xl shadow-md border border-[var(--border-color)] p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-brand-maroon)] to-[var(--color-brand-maroon-dark)] flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                {userStats.user.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Info */}
              <div className="flex-grow">
                <h2 className="text-2xl font-bold text-[var(--text-color)]">
                  {userStats.user.full_name}
                </h2>
                <p className="text-[var(--text-color-secondary)]">
                  @{userStats.user.username} · {userStats.user.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    userStats.user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {userStats.user.role.toUpperCase()}
                  </span>
                  <span className="text-xs text-[var(--text-color-muted)]">
                    Joined {formatDate(userStats.user.created_at)}
                  </span>
                </div>
              </div>

              {/* Stat Pills */}
              <div className="flex gap-4 flex-wrap">
                <StatPill label="Ratings" value={userStats.total_ratings} icon="⭐" color="amber" />
                <StatPill label="Favourites" value={userStats.total_favourites} icon="❤️" color="rose" />
                <StatPill label="Orders" value={userStats.total_orders} icon="📦" color="blue" />
                <StatPill label="Avg Rating" value={userStats.avg_rating.toFixed(1)} icon="📊" color="green" />
              </div>
            </div>
          </div>

          {/* ═══ 2 & 3. Charts Row: Rating Distribution + Top Categories ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <div className="bg-[var(--bg-card)] rounded-xl shadow border border-[var(--border-color)] p-5">
              <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Rating Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="star" tick={{ fill: 'var(--text-color-secondary)' }} />
                    <YAxis tick={{ fill: 'var(--text-color-secondary)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                    />
                    <Bar dataKey="count" fill="var(--color-brand-maroon)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-[var(--bg-card)] rounded-xl shadow border border-[var(--border-color)] p-5">
              <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Top Categories</h3>
              {userStats.top_categories.length > 0 ? (
                <div className="space-y-3">
                  {userStats.top_categories.map((cat, i) => {
                    const maxCount = userStats.top_categories[0]?.count || 1
                    const pct = Math.round((cat.count / maxCount) * 100)
                    const colors = ['#7a1e3e', '#9e2b50', '#b84d6a', '#d17a92', '#e5a4b5', '#f0c8d3']
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[var(--text-color)]">{cat.category}</span>
                          <span className="text-[var(--text-color-secondary)]">{cat.count} items</span>
                        </div>
                        <div className="w-full h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: colors[i] || colors[0] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[var(--text-color-muted)] text-sm">No category data available.</p>
              )}
            </div>
          </div>

          {/* ═══ 4. Radar Chart: Method Comparison ═══ */}
          {radarData.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl shadow border border-[var(--border-color)] p-5">
              <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Method Precision Comparison</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="method" tick={{ fill: 'var(--text-color-secondary)', fontSize: 12 }} />
                    <PolarRadiusAxis tick={{ fill: 'var(--text-color-muted)', fontSize: 10 }} />
                    <Radar
                      name="Precision@10"
                      dataKey="precision"
                      stroke="#7a1e3e"
                      fill="#7a1e3e"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Legend />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ═══ 5. Overlap Matrix ═══ */}
          {userStats.overlap_matrix.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl shadow border border-[var(--border-color)] p-5">
              <h3 className="font-bold text-lg mb-2 text-[var(--text-color)]">Method Overlap Analysis</h3>
              <p className="text-sm text-[var(--text-color-muted)] mb-4">
                Jaccard similarity between recommendation lists. Lower overlap = more diverse methods.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-semibold text-[var(--text-color)]" />
                      {userStats.overlap_matrix.map(row => (
                        <th key={row.method} className="p-2 text-center font-semibold text-[var(--text-color)] text-xs whitespace-nowrap">
                          {row.method.replace('Item-Based Cosine CF', 'Item CF').replace('User-Based KNN', 'User KNN')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.overlap_matrix.map(row => (
                      <tr key={row.method}>
                        <td className="p-2 font-medium text-[var(--text-color)] text-xs whitespace-nowrap">
                          {row.method.replace('Item-Based Cosine CF', 'Item CF').replace('User-Based KNN', 'User KNN')}
                        </td>
                        {userStats.overlap_matrix.map(col => {
                          const val = row[col.method] ?? 0
                          const isDiagonal = row.method === col.method
                          const intensity = Math.round(val * 255)
                          const bg = isDiagonal
                            ? 'var(--bg-tertiary)'
                            : `rgba(122, 30, 62, ${val * 0.6})`
                          const textColor = val > 0.5 && !isDiagonal ? '#fff' : 'var(--text-color)'
                          return (
                            <td
                              key={col.method}
                              className="p-2 text-center font-mono text-xs border border-[var(--border-color-light)]"
                              style={{ backgroundColor: bg, color: textColor }}
                            >
                              {isDiagonal ? '—' : val.toFixed(2)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ 6. Per-Method Recommendation Lists (existing) ═══ */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-[var(--text-color)]">Recommended Products by Method</h3>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {userMetrics.methods.map((m) => {
                const isBest = m.method === bestMethod
                return (
                  <div
                    key={m.method}
                    className={`flex-none w-80 flex flex-col gap-4 p-4 rounded-lg border ${
                      isBest
                      ? 'border-yellow-400 bg-yellow-50/50 shadow-md ring-1 ring-yellow-400'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2">
                      <h3 className={`font-bold ${isBest ? 'text-yellow-700' : 'text-[var(--text-color)]'}`}>
                        {m.method}
                        {isBest && <span className="ml-2" title="Best precision">🏆</span>}
                      </h3>
                      <span className="text-sm font-medium bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                        P@10: {m.precision_at_10.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {m.list.map((product) => (
                        <ProductCard key={product.id} product={product as any} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

/* ─── Stat Pill Component ─── */
const StatPill: React.FC<{ label: string; value: string | number; icon: string; color: string }> = ({ label, value, icon, color }) => {
  const bgMap: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200',
    rose: 'bg-rose-50 border-rose-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
  }
  const textMap: Record<string, string> = {
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
  }

  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${bgMap[color] || bgMap.blue} min-w-[80px]`}>
      <span className="text-lg">{icon}</span>
      <span className={`text-xl font-bold ${textMap[color] || textMap.blue}`}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
    </div>
  )
}
