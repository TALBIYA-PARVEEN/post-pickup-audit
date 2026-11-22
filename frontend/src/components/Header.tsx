import React from 'react';
import { ShieldCheck, Truck, BarChart3, MapPin, Users, Sparkles } from 'lucide-react';

type TabId = 'audit' | 'dashboard' | 'map' | 'citizen' | 'demo';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isOnline: boolean;
}

const tabs = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'audit', label: 'New audit', icon: Truck },
  { id: 'map', label: 'Route map', icon: MapPin },
  { id: 'citizen', label: 'Public view', icon: Users },
  { id: 'demo', label: 'Demo guide', icon: Sparkles },
] as const;

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isOnline }) => (
  <header className="app-header">
    <div className="app-header__inner">
      <div className="app-header__top">
        <button type="button" className="brand-button" onClick={() => setActiveTab('dashboard')} aria-label="Go to overview">
          <span className="brand-mark"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
          <span>
            <span className="brand-title">CustodyWaste</span>
            <span className="brand-subtitle">Post-pickup audit workspace</span>
          </span>
        </button>
        <div className={`connection-status ${isOnline ? 'is-online' : 'is-offline'}`} role="status" aria-live="polite">
          <span className="connection-status__dot" aria-hidden="true" />
          <span>{isOnline ? 'Services connected' : 'Connection unavailable'}</span>
        </div>
      </div>
      <nav className="primary-nav" aria-label="Main navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className="nav-link"
              data-active={isActive}
              data-tab={tab.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  </header>
);
