import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MunicipalityDashboard } from './components/MunicipalityDashboard';
import { HandoffAuditForm } from './components/HandoffAuditForm';
import { CustodyMap } from './components/CustodyMap';
import { CitizenPortal } from './components/CitizenPortal';
import { RouteDetailModal } from './components/RouteDetailModal';
import { PitchDemoBanner } from './components/PitchDemoBanner';
import {
  fetchRoutes,
  fetchAnalytics,
  fetchSampleImages,
  checkBackendHealth,
  resetDemoData,
  simulateRouteBreakdown,
  FALLBACK_ROUTES,
  FALLBACK_ANALYTICS,
  FALLBACK_SAMPLE_IMAGES,
} from './services/api';
import { WasteRoute, AnalyticsData, SampleImage } from './types';
import confetti from 'canvas-confetti';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'audit' | 'map' | 'citizen' | 'demo'>('dashboard');
  const [routes, setRoutes] = useState<WasteRoute[]>(FALLBACK_ROUTES);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(FALLBACK_ANALYTICS);
  const [sampleImages, setSampleImages] = useState<SampleImage[]>(FALLBACK_SAMPLE_IMAGES);
  const [selectedRouteForModal, setSelectedRouteForModal] = useState<WasteRoute | null>(null);
  const [selectedRouteIdForAudit, setSelectedRouteIdForAudit] = useState<string>('ROUTE-B');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pitchStep, setPitchStep] = useState<number>(0);
  const [isDemoGuideActive, setIsDemoGuideActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      const [health, fetchedRoutes, fetchedAnalytics, fetchedSamples] = await Promise.all([
        checkBackendHealth(),
        fetchRoutes(),
        fetchAnalytics(),
        fetchSampleImages(),
      ]);
      setIsOnline(health);
      setRoutes(fetchedRoutes);
      setAnalytics(fetchedAnalytics);
      setSampleImages(fetchedSamples);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const health = await checkBackendHealth();
        setIsOnline(health);
      } catch {
        setIsOnline(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    try {
      const freshRoutes = await resetDemoData();
      setRoutes(freshRoutes);
      const freshAnalytics = await fetchAnalytics();
      setAnalytics(freshAnalytics);
      setPitchStep(0);
      showToast('Demo data reset to baseline. Route A: 96.7, Route B: 100, Route C: 88.3.');
    } catch (err) {
      console.error(err);
      alert('Failed to reset demo data');
    }
  };

  const handleSimulateBreakdown = async () => {
    try {
      const brokenRoute = await simulateRouteBreakdown();
      const freshRoutes = await fetchRoutes();
      setRoutes(freshRoutes);
      const freshAnalytics = await fetchAnalytics();
      setAnalytics(freshAnalytics);
      showToast('🚨 Breakdown simulated on Route B! Score dropped to 66.7. Municipality alerted!');
      setActiveTab('dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to simulate breakdown');
    }
  };

  const handleAuditCommitted = async (updatedRoute: WasteRoute) => {
    // Refresh all routes and analytics
    const freshRoutes = await fetchRoutes();
    setRoutes(freshRoutes);
    const freshAnalytics = await fetchAnalytics();
    setAnalytics(freshAnalytics);

    if (updatedRoute.status === 'HIGH_INTEGRITY') {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
    }
    showToast(`Handoff audit logged! Route ${updatedRoute.name} score updated.`);
  };

  const handleOpenAuditForRoute = (routeId: string) => {
    setSelectedRouteIdForAudit(routeId);
    setActiveTab('audit');
  };

  const handleHeaderTabChange = (tab: 'dashboard' | 'audit' | 'map' | 'citizen' | 'demo') => {
    setActiveTab(tab);
    setIsDemoGuideActive(tab === 'demo');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-gray-950">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleHeaderTabChange}
        isOnline={isOnline}
      />

      {/* Interactive Hackathon Pitch Banner (visible on demo tab or togglable) */}
      {(activeTab === 'demo' || isDemoGuideActive) && (
        <PitchDemoBanner
          currentStep={pitchStep}
          onStepChange={setPitchStep}
          onTriggerBreakdown={handleSimulateBreakdown}
          onReset={handleResetDemo}
          onNavigateTab={(tab) => setActiveTab(tab)}
          routes={routes}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 bg-gray-900 border border-emerald-500/30 shadow-lg rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">
              Loading route and audit data...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <MunicipalityDashboard
                routes={routes}
                analytics={analytics}
                onSelectRoute={(r) => setSelectedRouteForModal(r)}
                onOpenAuditForRoute={handleOpenAuditForRoute}
              />
            )}

            {activeTab === 'audit' && (
              <HandoffAuditForm
                routes={routes}
                sampleImages={sampleImages}
                selectedRouteId={selectedRouteIdForAudit}
                onAuditCommitted={handleAuditCommitted}
                onViewRouteDetail={(r) => setSelectedRouteForModal(r)}
              />
            )}

            {activeTab === 'map' && (
              <CustodyMap
                routes={routes}
                onSelectRoute={(r) => setSelectedRouteForModal(r)}
              />
            )}

            {activeTab === 'citizen' && (
              <CitizenPortal
                routes={routes}
                onInspectRoute={(r) => setSelectedRouteForModal(r)}
              />
            )}

            {activeTab === 'demo' && (
              <MunicipalityDashboard
                routes={routes}
                analytics={analytics}
                onSelectRoute={(r) => setSelectedRouteForModal(r)}
                onOpenAuditForRoute={handleOpenAuditForRoute}
              />
            )}
          </>
        )}
      </main>

      {/* Route Detail / Digital Chain of Custody Inspector Modal */}
      {selectedRouteForModal && (
        <RouteDetailModal
          route={selectedRouteForModal}
          onClose={() => setSelectedRouteForModal(null)}
          onAuditStage={(routeId) => handleOpenAuditForRoute(routeId)}
        />
      )}

      {/* Footer */}
      <footer className="app-footer py-5 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-gray-500 font-semibold">CustodyWaste</strong> · A clear record of every waste handoff
          </div>
          <div className="flex items-center space-x-3">
            <span>Route records</span>
            <span>•</span>
            <span>Photo evidence</span>
            <span>•</span>
            <span>Handoff history</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
