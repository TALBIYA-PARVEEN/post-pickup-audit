import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Truck,
  Building,
  Factory,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Printer,
  FileCheck,
} from 'lucide-react';
import { WasteRoute } from '../types';

interface RouteDetailModalProps {
  route: WasteRoute;
  onClose: () => void;
  onAuditStage: (routeId: string) => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  route,
  onClose,
  onAuditStage,
}) => {
  const isFlagged = route.status === 'FLAGGED';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-800 flex items-start justify-between bg-gray-50">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                AUDIT RECORD
              </span>
              <span className="text-xs text-gray-400 font-mono">ID: {route.id}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <span>{route.name}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
              <span className="flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-gray-200">{route.vehicle}</span> ({route.vehicle_type})
              </span>
              <span>•</span>
              <span>Driver: {route.driver}</span>
              <span>•</span>
              <span>Zone: {route.zone}</span>
              <span>•</span>
              <span className="uppercase font-bold text-emerald-400">
                Stream: {route.expected_stream}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-300 border border-gray-700 transition-colors"
              title="Print audit record"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close audit record"
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Accountability Verdict Banner */}
        <div
          className={`p-5 border-b ${
            isFlagged
              ? 'bg-red-950/40 border-red-900/50 text-red-200'
              : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {isFlagged ? (
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isFlagged ? 'Needs review · segregation changed' : 'Integrity maintained'}
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-black/40">
                  Route Score: {route.route_score}/100
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed">
                {isFlagged ? (
                  <>
                    <strong className="text-white">Audit finding:</strong> Household collection was{' '}
                    <span className="text-emerald-400 font-bold">100% compliant</span> at doorstep. Segregation failed
                    specifically during bulk transfer at <strong className="text-white">Transfer Station TS-04</strong>,
                    where foreign PET plastic bottles and blue polybags were introduced.
                  </>
                ) : (
                  <>
                    <strong className="text-white">Pinpoint Audit Finding:</strong> Waste stream remained strictly
                    segregated across all 3 handoff custody points from doorstep collection to biomass digestion.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Sequential Handoff Audit Timeline (Audit A -> Audit B -> Audit C) */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Handoff timeline and photo evidence</span>
            </h3>
            <span className="text-xs text-gray-500 font-medium">3 Audited Handoffs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {route.audits.map((audit, idx) => {
              const isAuditFlagged = audit.status === 'FLAGGED';
              return (
                <div
                  key={audit.id}
                  className={`bg-gray-950 rounded-2xl border p-4 space-y-3 relative overflow-hidden transition-all ${
                    isAuditFlagged
                      ? 'border-red-600/60 shadow-lg shadow-red-950/40 ring-1 ring-red-500/30'
                      : 'border-gray-800'
                  }`}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">{audit.stage}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        audit.status === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {audit.score}/100
                    </span>
                  </div>

                  {/* Audit Photographic Evidence */}
                  <div className="relative rounded-xl overflow-hidden border border-gray-850 aspect-video bg-black flex items-center justify-center">
                    <img
                      src={audit.image_url}
                      alt={audit.stage}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-gray-300 font-mono">
                      Audit {audit.id}
                    </div>
                  </div>

                  {/* Location & Timestamp */}
                  <div className="text-[11px] text-gray-400 space-y-1">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                      <span className="truncate">{audit.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                      <span>{new Date(audit.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* AI Detection Summary */}
                  <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-850 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Contamination:</span>
                      <span
                        className={`font-bold ${
                          audit.contamination_percentage > 5 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {audit.contamination_percentage}%
                      </span>
                    </div>

                    <div className="text-gray-400">
                      <span>Detected: </span>
                      <span className="text-gray-200">
                        {audit.detected_materials.join(', ') || 'Organic scraps'}
                      </span>
                    </div>

                    {audit.foreign_materials.length > 0 && (
                      <div className="text-red-400 font-semibold">
                        <span>Foreign: </span>
                        <span>{audit.foreign_materials.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Operator Notes */}
                  <p className="text-[11px] text-gray-400 italic line-clamp-2">
                    "{audit.operator_notes}"
                  </p>
                </div>
              );
            })}
          </div>

          {/* Mathematical Proof Card */}
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 text-xs text-gray-400 space-y-1.5">
            <div className="font-semibold text-gray-200 flex items-center justify-between">
              <span>How the route score is calculated</span>
              <span className="text-emerald-400 font-mono font-bold">
                Route Score = {route.route_score} / 100
              </span>
            </div>
            <p className="font-mono text-[11px] text-gray-400">
              Score = ({route.audits.map((a) => a.score).join(' + ')}) / {route.audits.length} ={' '}
              {route.route_score}
            </p>
            <p className="text-[11px] text-gray-500">
              Each score summarises the visual check recorded at that handoff.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-900/60 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onAuditStage(route.id);
            }}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition-colors"
          >
            Record another handoff
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
