
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Clock } from 'lucide-react';

interface NameOnboardingProps {
  onComplete: (country: string, timezone: string) => void;
}

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Japan', 'South Korea', 'Brazil', 'India', 'Nigeria', 'Philippines',
  'Indonesia', 'Mexico', 'Argentina', 'Other'
];

const COUNTRY_TIMEZONES: Record<string, string> = {
  'United States':  '',
  'United Kingdom': 'Europe/London',
  'Canada':         'America/Toronto',
  'Australia':      'Australia/Sydney',
  'Germany':        'Europe/Berlin',
  'France':         'Europe/Paris',
  'Japan':          'Asia/Tokyo',
  'South Korea':    'Asia/Seoul',
  'Brazil':         'America/Sao_Paulo',
  'India':          'Asia/Kolkata',
  'Nigeria':        'Africa/Lagos',
  'Philippines':    'Asia/Manila',
  'Indonesia':      'Asia/Jakarta',
  'Mexico':         'America/Mexico_City',
  'Argentina':      'America/Argentina/Buenos_Aires',
  'Other':          '',
};

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getTimezoneForCountry(country: string): string {
  const mapped = COUNTRY_TIMEZONES[country];
  if (mapped) return mapped;
  return getBrowserTimezone();
}

const NameOnboarding: React.FC<NameOnboardingProps> = ({ onComplete }) => {
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    setTimezone(getTimezoneForCountry('United States'));
  }, []);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setTimezone(getTimezoneForCountry(newCountry));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 font-mono overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 relative z-10"
      >
        <div className="space-y-6">
          <div>
            <div className="text-[10px] text-system-neon font-black tracking-[0.3em] uppercase mb-2">LOCATION DATA</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Set Your Region</h2>
            <p className="text-xs text-gray-500 mt-1">Used to calibrate daily quest timing.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                <Globe size={10} /> Country / Region
              </label>
              <select
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm font-bold rounded-xl py-3 px-4 outline-none focus:border-system-neon transition-colors"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                <Clock size={10} /> Timezone
              </label>
              <div className="w-full bg-gray-900/60 border border-gray-700/50 text-gray-300 text-sm font-mono rounded-xl py-3 px-4 flex items-center gap-2 select-none">
                <span className="text-system-neon/60 text-[10px]">◈</span>
                <span>{timezone}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">REGION</span>
              <span className="text-white">{country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">TIMEZONE</span>
              <span className="text-white text-[10px]">{timezone}</span>
            </div>
          </div>

          <button
            onClick={() => onComplete(country, timezone)}
            className="w-full py-4 bg-system-neon text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-[1.02] shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all"
          >
            LOCK IN REGION
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NameOnboarding;
