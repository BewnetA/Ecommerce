import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Compass,
} from 'lucide-react';
import type { LocationSnippet } from '../../types';

interface LocationManagerProps {
  initialAddress?: string;
  initialCity?: string;
  initialSubcity?: string;
  initialNotes?: string;
  initialCoordinates?: { latitude: number; longitude: number };
  onSaveLocation: (loc: LocationSnippet) => void;
  showShareButton?: boolean;
  onShareWithSeller?: (loc: LocationSnippet) => void;
}

export const LocationManager: React.FC<LocationManagerProps> = ({
  initialAddress = '',
  initialCity = 'Addis Ababa',
  initialSubcity = '',
  initialNotes = '',
  initialCoordinates,
  onSaveLocation,
  showShareButton = false,
  onShareWithSeller,
}) => {
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [subcity, setSubcity] = useState(initialSubcity);
  const [notes, setNotes] = useState(initialNotes);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>(
    initialCoordinates
  );

  const [geoState, setGeoState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [geoError, setGeoError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Critical requirement: User-initiated request only (never on load)
  const handleRequestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('denied');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoState('requesting');
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCoordinates(coords);
        setGeoState('granted');

        // Simulated intelligent reverse geocode for demo context
        if (!address) {
          setAddress(`Near Lat ${coords.latitude.toFixed(4)}, Long ${coords.longitude.toFixed(4)}`);
        }
        if (!subcity) {
          setSubcity('Bole Sub-City, Woreda 03');
        }
      },
      (err) => {
        setGeoState('denied');
        setGeoError(
          err.code === 1
            ? 'Location permission denied by user. You can enter your delivery address manually below.'
            : 'Unable to retrieve location. Please type your delivery address.'
        );
      },
      { timeout: 10000 }
    );
  };

  const handleConfirmLocation = () => {
    if (!address.trim()) {
      alert('Please provide a delivery street address or landmark.');
      return;
    }

    const snippet: LocationSnippet = {
      address: address.trim(),
      city: city.trim(),
      subcity: subcity.trim(),
      notes: notes.trim(),
      coordinates,
    };

    onSaveLocation(snippet);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  };

  const handleShareClick = () => {
    if (!address.trim()) {
      alert('Please confirm your delivery address before sharing.');
      return;
    }

    const snippet: LocationSnippet = {
      address: address.trim(),
      city: city.trim(),
      subcity: subcity.trim(),
      notes: notes.trim(),
      coordinates,
    };

    if (onShareWithSeller) {
      onShareWithSeller(snippet);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Delivery Location & Geolocation
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Set your delivery destination so merchants can assess delivery viability and fees
          </p>
        </div>

        {confirmed && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Geolocation Trigger (Explicit User Action) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600" />
              Use Current Device Location
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Requests browser GPS permission only when clicked. Never accessed automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestBrowserLocation}
            disabled={geoState === 'requesting'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 ${geoState === 'requesting' ? 'animate-spin' : ''}`} />
            <span>{geoState === 'requesting' ? 'Detecting...' : 'Detect My Location'}</span>
          </button>
        </div>

        {geoState === 'granted' && coordinates && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Device GPS coordinates acquired: {coordinates.latitude.toFixed(4)},{' '}
              {coordinates.longitude.toFixed(4)}
            </span>
          </div>
        )}

        {geoState === 'denied' && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{geoError || 'Location unavailable. You can enter address manually.'}</span>
          </div>
        )}
      </div>

      {/* Manual Location Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              City *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Addis Ababa"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Sub-City / District / Woreda
            </label>
            <input
              type="text"
              value={subcity}
              onChange={(e) => setSubcity(e.target.value)}
              placeholder="e.g. Bole Sub-City, Woreda 03"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Street Address & Landmarks *
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Cameroon Street, Next to Edna Mall, House #402"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Delivery Notes for Courier / Seller (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Call upon arrival; building has front security guard..."
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Confirmation & Sharing Actions */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleConfirmLocation}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
        >
          Save & Confirm Delivery Address
        </button>

        {showShareButton && (
          <button
            type="button"
            onClick={handleShareClick}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Explicitly Share Location with Seller</span>
          </button>
        )}
      </div>
    </div>
  );
};
