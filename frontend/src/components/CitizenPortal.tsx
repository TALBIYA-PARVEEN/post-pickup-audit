import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Heart,
  Truck,
  Leaf,
  Recycle,
} from 'lucide-react';
import { WasteRoute } from '../types';

interface CitizenPortalProps {
  routes: WasteRoute[];
  onInspectRoute: (route: WasteRoute) => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({ routes, onInspectRoute }) => {
  const [selectedWardId, setSelectedWardId] = useState<string>('ROUTE-B');
  const activeRoute = routes.find((r) => r.id === selectedWardId) || routes[0];

  const isRouteFlagged = activeRoute.status === 'FLAGGED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Citizen Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
          <Leaf className="w-3.5 h-3.5" />
          <span>PUBLIC WASTE AUDIT</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
          See what happened after collection
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl mx-auto">
          Choose your ward to see whether waste stayed separated during collection, transfer, and delivery.
        </p>
      </div>

      {/* Ward Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm text-gray-300">
          <Search className="w-4 h-4 text-emerald-400" />
          <span>Choose a ward</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {routes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedWardId(r.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedWardId === r.id
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Accountability Comparison Cards: Household vs Post-Pickup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Citizen Effort */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
              <Heart className="w-4 h-4" />
              <span>At the household</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              100% Verified
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-white">Household sorting: 100/100</div>
            <p className="text-xs text-gray-400 mt-1">
              Residents of {activeRoute.name} properly separated their kitchen food waste into green bins
              before collection.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>AI Doorstep Audit: Zero foreign plastics detected at doorstep pickup.</span>
          </div>
        </div>

        {/* Card 2: Post-Pickup Hauler Custody */}
        <div
          className={`rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4 border ${
            isRouteFlagged
              ? 'bg-red-950/30 border-red-800/60'
              : 'bg-gray-900 border-gray-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 ${
                isRouteFlagged ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>After collection</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isRouteFlagged
                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isRouteFlagged ? 'Segregation Lost' : 'Chain Intact'}
            </span>
          </div>

          <div>
            <div
              className={`text-3xl font-black ${
                isRouteFlagged ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              Route Score: {activeRoute.route_score}/100
            </div>
            <p className="text-xs text-gray-300 mt-1">
              {isRouteFlagged ? (
                <>
                  Segregation broke down after collection at <strong>Transfer Station TS-04</strong>.
                  Municipal oversight has pinpointed the vehicle hauler responsible.
                </>
              ) : (
                <>
                  Waste remained segregated throughout transportation and arrived intact at the composting
                  facility.
                </>
              )}
            </p>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-2 ${
              isRouteFlagged
                ? 'bg-red-950/60 border-red-800 text-red-200'
                : 'bg-gray-950 border-gray-800 text-emerald-300'
            }`}
          >
            {isRouteFlagged ? (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>
              {isRouteFlagged
                ? 'The municipality is reviewing vehicle ' + activeRoute.vehicle + ' rather than placing responsibility on residents.'
                : 'Waste remained separated through delivery to the processing facility.'}
            </span>
          </div>
        </div>
      </div>

      {/* Citizen Trust Action Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">See the handoff photos</h3>
          <p className="text-xs text-gray-400">
            View the photographic proof captured at collection, transfer station, and plant gate.
          </p>
        </div>

        <button
          onClick={() => onInspectRoute(activeRoute)}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5 shrink-0"
        >
          <span>View audit record</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
