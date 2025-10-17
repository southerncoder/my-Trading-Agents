import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export const ThemeDemo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-bold mb-4 text-primary">Theme Demo Components</h2>
        
        {/* Buttons */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">Buttons</h3>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="btn-danger">Danger Button</button>
          </div>
        </div>

        {/* Text Colors */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">Text Colors</h3>
          <div className="space-y-2">
            <p className="text-primary">Primary text color</p>
            <p className="text-secondary">Secondary text color</p>
            <p className="text-muted">Muted text color</p>
            <p className="bull-text">Bullish/Positive text</p>
            <p className="bear-text">Bearish/Negative text</p>
            <p className="neutral-text">Neutral text</p>
          </div>
        </div>

        {/* Form Elements */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">Form Elements</h3>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Enter stock symbol..." 
              className="input-field"
            />
            <select className="input-field">
              <option>Select an option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </div>

        {/* Trading Cards */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">Trading Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">AAPL</span>
                <TrendingUp className="w-5 h-5 bull-text" />
              </div>
              <div className="text-2xl font-bold bull-text">$150.25</div>
              <div className="text-sm bull-text">+2.45 (+1.66%)</div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">TSLA</span>
                <TrendingDown className="w-5 h-5 bear-text" />
              </div>
              <div className="text-2xl font-bold bear-text">$245.80</div>
              <div className="text-sm bear-text">-5.20 (-2.07%)</div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">MSFT</span>
                <Activity className="w-5 h-5 neutral-text" />
              </div>
              <div className="text-2xl font-bold neutral-text">$380.15</div>
              <div className="text-sm neutral-text">-0.05 (-0.01%)</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">Progress Bar</h3>
          <div className="progress-bar h-4">
            <div className="progress-fill" style={{ width: '65%' }}></div>
          </div>
          <p className="text-sm text-muted mt-2">Analysis Progress: 65%</p>
        </div>

        {/* Status Indicators */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-secondary">Status Indicators</h3>
          <div className="flex flex-wrap gap-3">
            <div className="status-online px-3 py-2 rounded-lg text-sm font-medium">
              System Online
            </div>
            <div className="status-offline px-3 py-2 rounded-lg text-sm font-medium">
              System Offline
            </div>
            <div className="status-loading px-3 py-2 rounded-lg text-sm font-medium">
              Loading...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};