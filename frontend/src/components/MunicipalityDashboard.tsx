import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Truck,
  Building,
  Factory,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { WasteRoute, AnalyticsData } from '../types';

interface MunicipalityDashboardProps {
  routes: WasteRoute[];
  analytics: AnalyticsData | null;
  onSelectRoute: (route: WasteRoute) => void;
  onOpenAuditForRoute: (routeId: string) => void;
}

export const MunicipalityDashboard: React.FC<MunicipalityDashboardProps> = ({
  routes,
  analytics,
  onSelectRoute,
  onOpenAuditForRoute,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FLAGGED' | 'NEEDS_ATTENTION' | 'HIGH_INTEGRITY'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRoutes = routes.filter((r) => {
    const matchesFilter =
      statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.zone.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const flaggedRoute = routes.find((r) => r.status === 'FLAGGED');

  // Chart data for stage breakdown
  const stageChartData = [
    {
      stage: 'Collection Vehicle',
      score: analytics?.stage_breakdown['Collection Vehicle']?.avg_score || 97.5,
      failures: analytics?.stage_breakdown['Collection Vehicle']?.flagged || 0,
    },
    {
      stage: 'Transfer Station',
      score: analytics?.stage_breakdown['Transfer Station']?.avg_score || 86.2,
      failures: analytics?.stage_breakdown['Transfer Station']?.flagged || 1,
    },
    {
      stage: 'Plant Gate',
      score: analytics?.stage_breakdown['Processing Plant Gate']?.avg_score || 78.8,
      failures: analytics?.stage_breakdown['Processing Plant Gate']?.flagged || 1,
    },
  ];

  // Route score comparison data
  const routeComparisonData = routes.map((r) => ({
    name: r.name.split('(')[0].trim(),
    score: r.route_score,
    stream: r.expected_stream,
    status: r.status,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            <span>MUNICIPAL OPERATIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Route integrity overview
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Follow each handoff from collection to processing. Review route scores, spot issues early, and see where segregation needs attention.
          </p>
        </div>

        {/* Global Score Gauge */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center space-x-4 shadow-xl shrink-0">
          <div className="text-center">
            <span className="text-[11px] text-gray-400 uppercase font-semibold">
              Fleet integrity
            </span>
            <div className="text-3xl font-black text-emerald-400 mt-0.5">
              {analytics?.fleet_integrity_score || 84.8}%
            </div>
            <span className="text-[10px] text-gray-500">Target: ≥90.0%</span>
          </div>
          <div className="w-px h-12 bg-gray-800" />
          <div className="text-xs space-y-1">
            <div className="text-emerald-400 font-semibold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>90–100 · On track</span>
            </div>
            <div className="text-amber-400 font-semibold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>70–89 · Needs review</span>
            </div>
            <div className="text-red-400 font-semibold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span>&lt;70 · Action needed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Violation Alert Banner */}
      {flaggedRoute && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  ROUTE NEEDS ATTENTION
                </span>
                <span className="text-xs text-red-300/80">Photo review</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Contamination detected on {flaggedRoute.name}
              </h3>
              <p className="text-xs text-red-200 mt-1 max-w-3xl">
                {flaggedRoute.flag_reason ||
                  'Foreign materials were found at Transfer Station TS-04. The route score is now 66.7, so this handoff needs review.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => onSelectRoute(flaggedRoute)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Chain of Custody</span>
            </button>
            <button
              onClick={() => onOpenAuditForRoute(flaggedRoute.id)}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors"
            >
              <span>Re-Audit Handoff</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Routes monitored</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{routes.length} routes</div>
          <div className="text-[11px] text-gray-500 mt-1">100% telemetry coverage</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>On-track routes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {routes.filter((r) => r.status === 'HIGH_INTEGRITY').length} routes
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">≥90 Route Score</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Needs inspection</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">
            {routes.filter((r) => r.status === 'FLAGGED').length} Alert
          </div>
          <div className="text-[11px] text-red-400/80 mt-1">&lt;70 Route Score breach</div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Handoff to review</span>
            <Building className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">Transfer Station</div>
          <div className="text-[11px] text-gray-400 mt-1">Review transfer-stage handoffs</div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Average Score by Handoff Stage */}
        <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Integrity at each handoff</h3>
              <p className="text-xs text-gray-400">
                Average score from collection through to the processing plant
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Handoff records
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="stage" stroke="#6b7280" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e1e8e3', borderRadius: '0.75rem' }}
                  itemStyle={{ color: '#176b45' }}
                />
                <Bar dataKey="score" fill="#10b981" radius={[6, 6, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Contaminant Materials Breakdown */}
        <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Materials flagged</h3>
              <p className="text-xs text-gray-400">Items identified in audit photos</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
              CV Detections
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.foreign_material_frequency || [
                    { name: 'Plastic Bottles', count: 6 },
                    { name: 'Polythene Bags', count: 4 },
                    { name: 'Plastic Wrappers', count: 3 },
                    { name: 'Organic Leachate', count: 2 },
                  ]}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e1e8e3', borderRadius: '0.75rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Route Ranking & Integrity Telemetry Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Routes and handoff records</span>
            </h2>
            <p className="text-xs text-gray-400">
              Each route score is the average of its recorded handoff scores.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Find a route or vehicle"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>

            <div className="flex items-center space-x-1 bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs">
              {(['ALL', 'FLAGGED', 'NEEDS_ATTENTION', 'HIGH_INTEGRITY'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === st
                      ? 'bg-gray-800 text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All routes' : st === 'FLAGGED' ? 'Needs review' : st === 'NEEDS_ATTENTION' ? 'Needs attention' : 'On track'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Route & Zone</th>
                <th className="py-3 px-3">Vehicle & Driver</th>
                <th className="py-3 px-3">Stream</th>
                <th className="py-3 px-3 text-center">Collection Audit</th>
                <th className="py-3 px-3 text-center">Transfer Audit</th>
                <th className="py-3 px-3 text-center">Plant Gate Audit</th>
                <th className="py-3 px-3 text-center">Route Score</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filteredRoutes.map((route) => {
                const collAudit = route.audits.find((a) => a.stage_code === 'COLLECTION');
                const transAudit = route.audits.find((a) => a.stage_code === 'TRANSFER');
                const plantAudit = route.audits.find((a) => a.stage_code === 'PLANT_GATE');

                return (
                  <tr
                    key={route.id}
                    className="hover:bg-gray-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectRoute(route)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-sm">{route.name}</div>
                      <div className="text-[11px] text-gray-400">{route.zone}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono text-gray-200 font-semibold">{route.vehicle}</div>
                      <div className="text-[11px] text-gray-400">{route.driver}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          route.expected_stream === 'wet'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : route.expected_stream === 'dry'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {route.expected_stream}
                      </span>
                    </td>

                    {/* Collection Audit Score */}
                    <td className="py-3 px-3 text-center">
                      {collAudit ? (
                        <span
                          className={`font-bold ${
                            collAudit.score >= 90
                              ? 'text-emerald-400'
                              : collAudit.score >= 70
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {collAudit.score}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    {/* Transfer Audit Score */}
                    <td className="py-3 px-3 text-center">
                      {transAudit ? (
                        <span
                          className={`font-bold ${
                            transAudit.score >= 90
                              ? 'text-emerald-400'
                              : transAudit.score >= 70
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {transAudit.score}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    {/* Plant Gate Audit Score */}
                    <td className="py-3 px-3 text-center">
                      {plantAudit ? (
                        <span
                          className={`font-bold ${
                            plantAudit.score >= 90
                              ? 'text-emerald-400'
                              : plantAudit.score >= 70
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {plantAudit.score}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    {/* Overall Route Score */}
                    <td className="py-3 px-3 text-center">
                      <div
                        className={`text-sm font-black px-2.5 py-1 rounded-lg inline-block ${
                          route.route_score >= 90
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : route.route_score >= 70
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {route.route_score}/100
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          route.status === 'HIGH_INTEGRITY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : route.status === 'NEEDS_ATTENTION'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {route.status === 'HIGH_INTEGRITY' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : route.status === 'NEEDS_ATTENTION' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{route.status.replace('_', ' ')}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(route);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
