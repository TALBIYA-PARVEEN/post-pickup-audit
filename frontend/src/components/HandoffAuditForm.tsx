import React, { useState, useEffect } from 'react';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Building,
  Factory,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { WasteRoute, WasteStream, AiAuditAnalysis, SampleImage } from '../types';
import { analyzeAuditImage, recordHandoffAudit } from '../services/api';

interface HandoffAuditFormProps {
  routes: WasteRoute[];
  sampleImages: SampleImage[];
  selectedRouteId?: string;
  onAuditCommitted: (updatedRoute: WasteRoute) => void;
  onViewRouteDetail: (route: WasteRoute) => void;
}

export const HandoffAuditForm: React.FC<HandoffAuditFormProps> = ({
  routes,
  sampleImages,
  selectedRouteId,
  onAuditCommitted,
  onViewRouteDetail,
}) => {
  const [routeId, setRouteId] = useState<string>(selectedRouteId || routes[1]?.id || 'ROUTE-B');
  const [stage, setStage] = useState<string>('Transfer Station');
  const [locationName, setLocationName] = useState<string>('Bellandur Transfer Station TS-04');
  const [stream, setStream] = useState<WasteStream>('wet');
  const [selectedSample, setSelectedSample] = useState<string>('contaminated_wet_waste.jpg');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('/api/sample-images/contaminated_wet_waste.jpg');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AiAuditAnalysis | null>(null);
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<boolean>(false);

  // Sync route's expected stream when route changes
  useEffect(() => {
    const activeRoute = routes.find((r) => r.id === routeId);
    if (activeRoute) {
      setStream(activeRoute.expected_stream);
      if (routeId === 'ROUTE-B') {
        setSelectedSample('contaminated_wet_waste.jpg');
        setPreviewUrl('/api/sample-images/contaminated_wet_waste.jpg');
      } else if (routeId === 'ROUTE-A') {
        setSelectedSample('clean_wet_waste.jpg');
        setPreviewUrl('/api/sample-images/clean_wet_waste.jpg');
      } else if (routeId === 'ROUTE-C') {
        setSelectedSample('clean_dry_waste.jpg');
        setPreviewUrl('/api/sample-images/clean_dry_waste.jpg');
      }
    }
  }, [routeId, routes]);

  const handleSampleSelect = (sample: SampleImage) => {
    setSelectedSample(sample.file);
    setCustomFile(null);
    setPreviewUrl(sample.url);
    setAnalysisResult(null);
    setCommitSuccess(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      setSelectedSample('');
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysisResult(null);
      setCommitSuccess(false);
    }
  };

  const handleRunAudit = async () => {
    setIsAnalyzing(true);
    setCommitSuccess(false);
    try {
      const result = await analyzeAuditImage({
        sample_filename: selectedSample || undefined,
        image_file: customFile || undefined,
        expected_stream: stream,
        route_id: routeId,
        stage: stage,
      });
      setAnalysisResult(result);
      if (result.foreign_material_detected) {
        setOperatorNotes(
          `AI FLAGGED: Visible contamination detected (${result.contamination_estimate}% foreign material: ${result.foreign_materials.join(', ')}). Immediate inspection required.`
        );
      } else {
        setOperatorNotes(
          `AI VERIFIED: Compartment adheres to ${stream.toUpperCase()} waste stream segregation specifications.`
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to analyze image with AI model');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommitAudit = async () => {
    if (!analysisResult) return;
    setIsCommitting(true);
    try {
      const res = await recordHandoffAudit(routeId, {
        stage: stage,
        location: locationName,
        score: analysisResult.audit_score,
        contamination_percentage: analysisResult.contamination_estimate,
        status: analysisResult.status,
        foreign_materials: analysisResult.foreign_materials,
        detected_materials: analysisResult.detected_materials,
        operator_notes: operatorNotes,
        image_url: analysisResult.annotated_image || previewUrl,
      });
      setCommitSuccess(true);
      onAuditCommitted(res.updated_route);
    } catch (err) {
      console.error(err);
      alert('Failed to commit audit to chain of custody');
    } finally {
      setIsCommitting(false);
    }
  };

  const activeRoute = routes.find((r) => r.id === routeId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Truck className="w-4 h-4" />
          <span>FIELD TEAM · NEW AUDIT</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
          Record a handoff audit
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-3xl">
          Choose a route and handoff, add a photo, then review the findings before saving them to the route history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Audit Configuration & Image Selection */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Route and handoff details</span>
            </h2>

            {/* Route Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Route
                </label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — Vehicle: {r.vehicle} ({r.expected_stream.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Handoff Stage Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Where was the photo taken?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStage('Collection Vehicle');
                      setLocationName('Doorstep Collection Hub');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center space-y-1.5 transition-all ${
                      stage === 'Collection Vehicle'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span className="text-center">Collection</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStage('Transfer Station');
                      setLocationName('Secondary Transfer Station TS-04');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center space-y-1.5 transition-all ${
                      stage === 'Transfer Station'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span className="text-center">Transfer station</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStage('Processing Plant Gate');
                      setLocationName('Biomethanation Facility Gate #1');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center space-y-1.5 transition-all ${
                      stage === 'Processing Plant Gate'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Factory className="w-4 h-4" />
                    <span className="text-center">Plant Gate</span>
                  </button>
                </div>
              </div>

              {/* Stream Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Waste stream
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStream('wet')}
                    className={`p-2 rounded-lg border text-xs font-semibold ${
                      stream === 'wet'
                        ? 'border-green-500 bg-green-500/20 text-green-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}
                  >
                    Wet (Organic)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStream('dry')}
                    className={`p-2 rounded-lg border text-xs font-semibold ${
                      stream === 'dry'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}
                  >
                    Dry (Recyclable)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStream('hazardous')}
                    className={`p-2 rounded-lg border text-xs font-semibold ${
                      stream === 'hazardous'
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : 'border-gray-800 bg-gray-950 text-gray-400'
                    }`}
                  >
                    Hazardous
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Input / Demo Presets */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Add a photo</span>
              </h2>
              <span className="text-xs text-amber-400 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Sample photos</span>
              </span>
            </div>

            {/* Quick Sample Selector */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-gray-400">Choose a sample photo or upload your own</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleImages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSampleSelect(s)}
                    className={`p-2 rounded-xl border text-left text-xs transition-all flex items-start space-x-2 ${
                      selectedSample === s.file
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm'
                        : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <img
                      src={s.url}
                      alt={s.name}
                      className="w-10 h-10 object-cover rounded-lg border border-gray-700 shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-semibold text-gray-200 truncate">{s.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{s.stream.toUpperCase()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Upload */}
            <div className="relative border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl p-4 text-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1">
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-300 font-medium">
                  {customFile ? customFile.name : 'Upload a photo from your device'}
                </span>
                <span className="text-[10px] text-gray-500">Supports JPG, PNG, WEBP</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleRunAudit}
              disabled={isAnalyzing}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${
                isAnalyzing
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-gray-950 hover:brightness-110 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  <span>Reviewing photo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Review photo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis Result & Visual Bounding Box Inspection */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Photo review</span>
              </h2>
              {analysisResult && (
                <div
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    analysisResult.status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}
                >
                  {analysisResult.status === 'VERIFIED' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>{analysisResult.status}</span>
                </div>
              )}
            </div>

            {/* Photographic View */}
            <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-950 aspect-video flex items-center justify-center">
              {isAnalyzing && (
                <div className="absolute inset-0 z-20 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Reviewing your photo</p>
                    <p className="text-xs text-gray-400">Looking for materials that do not belong in this waste stream.</p>
                  </div>
                </div>
              )}

              <img
                src={analysisResult?.annotated_image || previewUrl}
                alt="Waste Compartment"
                className="w-full h-full object-contain"
              />

              <div className="absolute top-2 left-2 bg-gray-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-gray-700 text-[11px] text-gray-300 flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{stage} Photo Proof</span>
              </div>
            </div>

            {/* Analysis Metrics */}
            {analysisResult ? (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <span className="text-[11px] text-gray-400 uppercase font-medium">Integrity score</span>
                    <div
                      className={`text-xl font-extrabold mt-0.5 ${
                        analysisResult.audit_score >= 90
                          ? 'text-emerald-400'
                          : analysisResult.audit_score >= 70
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {analysisResult.audit_score}/100
                    </div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <span className="text-[11px] text-gray-400 uppercase font-medium">Possible contamination</span>
                    <div
                      className={`text-xl font-extrabold mt-0.5 ${
                        analysisResult.contamination_estimate > 10 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {analysisResult.contamination_estimate}%
                    </div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <span className="text-[11px] text-gray-400 uppercase font-medium">Model confidence</span>
                    <div className="text-xl font-extrabold text-blue-400 mt-0.5">
                      {Math.round(analysisResult.confidence * 100)}%
                    </div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <span className="text-[11px] text-gray-400 uppercase font-medium">Foreign items</span>
                    <div
                      className={`text-sm font-bold mt-1.5 ${
                        analysisResult.foreign_material_detected ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {analysisResult.foreign_material_detected ? 'Found' : 'Clear'}
                    </div>
                  </div>
                </div>

                {/* Detected Materials Breakdown */}
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                    <span>Materials found</span>
                    <span className="text-[11px] text-gray-400">
                      Expected stream {stream.toUpperCase()} WASTE
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.detected_materials.map((m, idx) => {
                      const isForeign = analysisResult.foreign_materials.includes(m);
                      return (
                        <span
                          key={idx}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1 ${
                            isForeign
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isForeign ? (
                            <XCircle className="w-3 h-3 text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                          <span>{m.replace('_', ' ').toUpperCase()}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Operator Notes & Commit */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Notes for the next team
                    </label>
                    <textarea
                      rows={2}
                      value={operatorNotes}
                      onChange={(e) => setOperatorNotes(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleCommitAudit}
                      disabled={isCommitting}
                      className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      {isCommitting ? (
                        <span>Saving audit...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Save audit to route history</span>
                        </>
                      )}
                    </button>

                    {activeRoute && (
                      <button
                        onClick={() => onViewRouteDetail(activeRoute)}
                        className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        <span>View Route History</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {commitSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Audit saved. The route score and handoff history have been updated.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 p-6 rounded-xl bg-gray-950/40 border border-dashed border-gray-800 text-center text-gray-400 text-xs space-y-2">
                <Sparkles className="w-6 h-6 text-gray-500 mx-auto" />
                <p className="font-medium text-gray-300">Ready to review a photo</p>
                <p className="max-w-md mx-auto text-gray-500">
                  Choose a sample photo or upload one to check for materials outside the selected waste stream.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
