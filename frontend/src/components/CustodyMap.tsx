import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { WasteRoute } from '../types';
import { Truck, Building, Factory, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CustodyMapProps {
  routes: WasteRoute[];
  onSelectRoute: (route: WasteRoute) => void;
}

// Custom Leaflet DivIcons with SVG badges to avoid broken image URLs
const createCustomIcon = (type: 'collection' | 'transfer' | 'plant', status: 'VERIFIED' | 'FLAGGED' | 'NEEDS_ATTENTION') => {
  const isFlagged = status === 'FLAGGED';
  const color = isFlagged ? '#ef4444' : (status === 'NEEDS_ATTENTION' ? '#f59e0b' : '#10b981');
  const label = type === 'collection' ? 'COL' : (type === 'transfer' ? 'TRF' : 'PLT');

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0b0f19;
        font-weight: 800;
        font-size: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        border: 2px solid #ffffff;
      ">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export const CustodyMap: React.FC<CustodyMapProps> = ({ routes, onSelectRoute }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ROUTE-B');
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  // Coordinates for polyline
  const polylineCoords: [number, number][] = activeRoute
    ? [
        activeRoute.coordinates.collection,
        activeRoute.coordinates.transfer,
        activeRoute.coordinates.plant,
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>ROUTE LOCATIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Route and handoff map
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            See the collection, transfer, and delivery points for each route.
          </p>
        </div>

        {/* Route Selector Pill */}
        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 p-1.5 rounded-2xl">
          {routes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRouteId(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedRouteId === r.id
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r.id}: {r.name.split('(')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 shadow-2xl overflow-hidden">
        <div className="h-[550px] w-full rounded-2xl overflow-hidden relative">
          <MapContainer
            center={activeRoute ? activeRoute.coordinates.transfer : [12.935, 77.63]}
            zoom={12}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Polyline connecting the 3 stages */}
            {polylineCoords.length > 0 && (
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: activeRoute.status === 'FLAGGED' ? '#ef4444' : '#10b981',
                  weight: 4,
                  dashArray: activeRoute.status === 'FLAGGED' ? '8, 8' : undefined,
                }}
              />
            )}

            {/* Markers */}
            {routes.map((route) => {
              const isCurrent = route.id === selectedRouteId;
              const colAudit = route.audits.find((a) => a.stage_code === 'COLLECTION');
              const trfAudit = route.audits.find((a) => a.stage_code === 'TRANSFER');
              const pltAudit = route.audits.find((a) => a.stage_code === 'PLANT_GATE');

              return (
                <React.Fragment key={route.id}>
                  {/* Collection Marker */}
                  <Marker
                    position={route.coordinates.collection}
                    icon={createCustomIcon('collection', colAudit?.status || 'VERIFIED')}
                  >
                    <Popup>
                      <div className="p-2 space-y-1 text-xs text-gray-900">
                        <strong className="text-emerald-700 font-bold">1. Collection Point</strong>
                        <div>Route: {route.name}</div>
                        <div>Vehicle: {route.vehicle}</div>
                        <div>Audit Score: {colAudit?.score || 100}/100</div>
                        <div className="text-[11px] text-gray-600">Doorstep household pickup</div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Transfer Station Marker */}
                  <Marker
                    position={route.coordinates.transfer}
                    icon={createCustomIcon('transfer', trfAudit?.status || 'VERIFIED')}
                  >
                    <Popup>
                      <div className="p-2 space-y-1 text-xs text-gray-900">
                        <strong className={trfAudit?.status === 'FLAGGED' ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                          2. Secondary Transfer Station
                        </strong>
                        <div>Route: {route.name}</div>
                        <div>Audit Score: {trfAudit?.score || 100}/100</div>
                        {trfAudit?.status === 'FLAGGED' && (
                          <div className="text-red-600 font-bold text-[11px]">
                            ⚠️ Segregation Breakdown Detected!
                          </div>
                        )}
                        <button
                          onClick={() => onSelectRoute(route)}
                          className="mt-1 text-xs text-blue-600 underline font-semibold"
                        >
                          View Full Audit Evidence
                        </button>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Plant Gate Marker */}
                  <Marker
                    position={route.coordinates.plant}
                    icon={createCustomIcon('plant', pltAudit?.status || 'VERIFIED')}
                  >
                    <Popup>
                      <div className="p-2 space-y-1 text-xs text-gray-900">
                        <strong className="text-blue-700 font-bold">3. Processing Plant Gate</strong>
                        <div>Destination: Biomethanation & Recovery</div>
                        <div>Gate Audit Score: {pltAudit?.score || 95}/100</div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* Map Overlay Badge */}
          <div className="absolute top-4 right-4 z-[1000] bg-gray-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-gray-800 text-xs text-gray-300 space-y-1.5 shadow-xl">
            <div className="font-bold text-white text-xs">Chain-of-Custody Waypoints</div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>COL: Doorstep Collection Bay</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>TRF: Secondary Transfer Station</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span>PLT: Processing Plant Gate</span>
            </div>
            <div className="pt-1 text-[10px] text-red-400 font-semibold border-t border-gray-800">
              Red Pin = Audit Flagged (Contamination)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
