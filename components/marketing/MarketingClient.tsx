'use client'

import { formatNumber, formatDate } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface Campaign {
  id: string
  name: string
  channel: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  status: string
  startDate: Date | string
  endDate: Date | string | null
  project: { id: string; name: string } | null
}

interface ChannelStat {
  channel: string
  totalLeads: number
  wonLeads: number
  budget: number
  spent: number
  impressions: number
  clicks: number
  campaignLeads: number
}

interface MarketingData {
  campaigns: Campaign[]
  leads: Array<{ source: string; _count: { source: number } }>
  channelStats: ChannelStat[]
}

const CHANNEL_CONFIG = {
  META: { label: 'Meta Ads', icon: '📘', color: '#1877f2' },
  GOOGLE: { label: 'Google Ads', icon: '🔍', color: '#ea4335' },
  WHATSAPP: { label: 'WhatsApp', icon: '💬', color: '#25d366' },
  WEB: { label: 'Web', icon: '🌐', color: '#8b5cf6' },
  REFERIDO: { label: 'Referido', icon: '👥', color: '#f59e0b' },
  EMAIL: { label: 'Email', icon: '📧', color: '#06b6d4' },
  OUTDOOR: { label: 'Exterior', icon: '🪧', color: '#6b7280' },
} as const

function formatPct(num: number, den: number): string {
  if (den === 0) return '0.0%'
  return `${((num / den) * 100).toFixed(1)}%`
}

export default function MarketingClient({ data }: { data: MarketingData }) {
  const { campaigns, channelStats } = data

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalLeadsFromCamps = campaigns.reduce((s, c) => s + c.leads, 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVA').length

  const cpl = totalLeadsFromCamps > 0 ? Math.round(totalSpent / totalLeadsFromCamps) : 0
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'

  // Channel performance chart data
  const channelChartData = channelStats
    .filter(c => c.totalLeads > 0)
    .map(c => ({
      name: CHANNEL_CONFIG[c.channel as keyof typeof CHANNEL_CONFIG]?.icon + ' ' +
            (CHANNEL_CONFIG[c.channel as keyof typeof CHANNEL_CONFIG]?.label || c.channel),
      leads: c.totalLeads,
      ganados: c.wonLeads,
      cpl: c.campaignLeads > 0 ? Math.round(c.spent / c.campaignLeads) : 0,
    }))

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketing & Campañas</h1>
        <p className="text-gray-500 mt-1">Rendimiento de canales y campañas activas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Campañas Activas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeCampaigns}</p>
          <p className="text-xs text-gray-400 mt-1">de {campaigns.length} totales</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Inversión Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${formatNumber(Math.round(totalSpent / 1000))}K</p>
          <p className="text-xs text-gray-400 mt-1">de ${formatNumber(Math.round(totalBudget / 1000))}K presupuesto</p>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">CPL Promedio</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${formatNumber(cpl)}</p>
          <p className="text-xs text-gray-400 mt-1">{formatNumber(totalLeadsFromCamps)} leads de campañas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">CTR Global</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{ctr}%</p>
          <p className="text-xs text-gray-400 mt-1">{formatNumber(totalClicks)} clicks · {formatNumber(totalImpressions)} impresiones</p>
        </div>
      </div>

      {/* Channel performance */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Leads por Canal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channelChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" name="Total Leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="ganados" name="Ganados" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channel stats table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Métricas por Canal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2">Canal</th>
                  <th className="text-right text-xs font-semibold text-gray-500 pb-2">Leads</th>
                  <th className="text-right text-xs font-semibold text-gray-500 pb-2">Conv.</th>
                  <th className="text-right text-xs font-semibold text-gray-500 pb-2">CPL</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {channelStats.filter(c => c.totalLeads > 0).map(c => {
                  const cfg = CHANNEL_CONFIG[c.channel as keyof typeof CHANNEL_CONFIG]
                  const cplVal = c.campaignLeads > 0 ? Math.round(c.spent / c.campaignLeads) : null
                  return (
                    <tr key={c.channel} className="border-b border-gray-50">
                      <td className="py-3">
                        <span className="font-medium">{cfg?.icon} {cfg?.label || c.channel}</span>
                      </td>
                      <td className="text-right py-3 font-semibold">{c.totalLeads}</td>
                      <td className="text-right py-3">
                        <span className="text-green-600 font-semibold">{c.wonLeads}</span>
                        <span className="text-gray-400 text-xs ml-1">({formatPct(c.wonLeads, c.totalLeads)})</span>
                      </td>
                      <td className="text-right py-3 text-gray-600">
                        {cplVal ? `$${formatNumber(cplVal)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Todas las Campañas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Campaña', 'Canal', 'Proyecto', 'Presupuesto', 'Gastado', 'Impresiones', 'Clics', 'CTR', 'Leads', 'CPL', 'Estado'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign, i) => {
                const cfg = CHANNEL_CONFIG[campaign.channel as keyof typeof CHANNEL_CONFIG]
                const ctr = campaign.impressions > 0
                  ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                  : '0'
                const cpl = campaign.leads > 0
                  ? Math.round(campaign.spent / campaign.leads)
                  : null
                const spentPct = campaign.budget > 0
                  ? Math.min((campaign.spent / campaign.budget) * 100, 100)
                  : 0

                return (
                  <tr key={campaign.id} className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900 max-w-48 truncate">{campaign.name}</div>
                      <div className="text-xs text-gray-400">{formatDate(campaign.startDate as string)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{cfg?.icon} {cfg?.label || campaign.channel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 truncate max-w-32 block">{campaign.project?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">${formatNumber(Math.round(campaign.budget / 1000))}K</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium">${formatNumber(Math.round(campaign.spent / 1000))}K</span>
                        <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${spentPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(campaign.impressions)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(campaign.clicks)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ctr}%</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-blue-600">{campaign.leads}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cpl ? `$${formatNumber(cpl)}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        campaign.status === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                        campaign.status === 'PAUSADA' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
