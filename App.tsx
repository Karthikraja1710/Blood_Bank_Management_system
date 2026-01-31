
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  getBloodBotResponse, 
  searchBloodShortages,
  getHealthInsight
} from './services/gemini';
import { BloodType, BloodBank, ChatMessage, HealthInsight } from './types';

declare const google: any;

type Role = 'ADMIN' | 'DONOR' | 'PATIENT' | 'STAFF' | 'GUEST';

const BloodMap: React.FC<{ 
  results: BloodBank[], 
  userLocation: { lat: number, lng: number } | null,
  selectedBloodType: BloodType
}> = ({ results, userLocation, selectedBloodType }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;
    const initialPos: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [12.9716, 77.5946];
    mapInstance.current = L.map(mapContainerRef.current, {
      center: initialPos,
      zoom: 13,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(mapInstance.current);
    markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    if (userLocation) {
      const userPos: [number, number] = [userLocation.lat, userLocation.lng];
      const userIcon = L.divIcon({ className: 'custom-div-icon', html: '<div class="user-pulse"></div>', iconSize: [12, 12], iconAnchor: [6, 6] });
      L.marker(userPos, { icon: userIcon }).addTo(markersLayer.current).bindPopup('<b>Your Location</b>');
      bounds.push(userPos);
    }
    results.forEach(center => {
      const pos: [number, number] = [center.latitude, center.longitude];
      let statusColor = 'bg-rose-500';
      if (center.units_available > 10) statusColor = 'bg-emerald-500';
      else if (center.units_available > 0) statusColor = 'bg-amber-500';
      const bloodIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="relative flex items-center justify-center"><i class="fa-solid fa-droplet text-red-600 text-4xl drop-shadow-md"></i><div class="absolute -top-1 -right-1 w-3.5 h-3.5 ${statusColor} border-2 border-white rounded-full shadow-sm"></div></div>`,
        iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40]
      });
      const popupContent = `<div class="p-2 min-w-[200px]"><h3 class="font-bold text-slate-800 text-sm mb-1">${center.name}</h3><p class="text-slate-500 text-xs mb-2">${center.address}</p><div class="flex justify-between items-center pt-2 border-t border-slate-100"><div><span class="block text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Stock</span><span class="font-bold text-red-600 text-xs">${selectedBloodType}: ${center.units_available}</span></div><a href="${center.google_maps_url}" target="_blank" class="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Route</a></div></div>`;
      L.marker(pos, { icon: bloodIcon }).addTo(markersLayer.current).bindPopup(popupContent);
      bounds.push(pos);
    });
    if (bounds.length > 0) mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 15 });
  }, [results, userLocation, selectedBloodType]);

  return (
    <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2 text-slate-700"><i className="fa-solid fa-map-location-dot text-red-600"></i>Response Map</h3>
      </div>
      <div ref={mapContainerRef} className="w-full h-[300px] md:h-[400px] z-0" />
    </div>
  );
};

const HealthCenter: React.FC = () => {
  const [insight, setInsight] = useState<HealthInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const topics = [
    { id: 'post-donation', label: 'Post-Donation Care', icon: 'fa-heart-pulse', color: 'text-blue-500' },
    { id: 'iron-rich', label: 'Iron & Nutrition', icon: 'fa-apple-whole', color: 'text-green-500' },
    { id: 'anemia', label: 'Understanding Anemia', icon: 'fa-vial-virus', color: 'text-rose-500' },
    { id: 'compatibility', label: 'Blood Compatibility', icon: 'fa-handshake-angle', color: 'text-purple-500' }
  ];

  const fetchTopic = async (topic: string) => {
    setLoading(true);
    const data = await getHealthInsight(topic);
    setInsight(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-800">Health Intelligence</h2>
        <p className="text-slate-500">Expert-curated medical insights powered by LifeLink AI.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topics.map(t => (
          <button 
            key={t.id} 
            onClick={() => fetchTopic(t.label)}
            className="p-4 bg-white border rounded-2xl hover:shadow-md transition-all text-center group"
          >
            <i className={`fa-solid ${t.icon} ${t.color} text-2xl mb-2 group-hover:scale-110 transition-transform`}></i>
            <span className="block text-xs font-bold text-slate-600">{t.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
          <i className="fa-solid fa-dna animate-bounce text-red-500 text-3xl mb-4"></i>
          <p className="text-slate-500 font-medium italic">Analyzing medical data...</p>
        </div>
      )}

      {insight && !loading && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <span className="bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
               {insight.category}
             </span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-blue-500"></i>
            {insight.title}
          </h3>
          <p className="text-slate-600 leading-relaxed">{insight.content}</p>
          
          <div className="bg-slate-50 p-4 rounded-2xl">
            <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-green-600"></i> Key Health Tips
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insight.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <i className="fa-solid fa-check text-green-500 mt-1"></i>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-[10px] text-amber-700 font-bold uppercase mb-1">Medical Disclaimer</p>
            <p className="text-xs text-amber-800 italic">{insight.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const colors = {
    ADMIN: 'bg-purple-100 text-purple-600',
    DONOR: 'bg-green-100 text-green-600',
    PATIENT: 'bg-blue-100 text-blue-600',
    STAFF: 'bg-amber-100 text-amber-600',
    GUEST: 'bg-slate-100 text-slate-600'
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[role]}`}>{role}</span>;
};

interface InventoryManagerProps {
  onBack: () => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ onBack }) => {
  const [inventory, setInventory] = useState<Record<BloodType, number>>({
    'A+': 15, 'A-': 5, 'B+': 12, 'B-': 3,
    'O+': 25, 'O-': 8, 'AB+': 4, 'AB-': 1
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateUnits = (type: BloodType, delta: number) => {
    setInventory(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta)
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Inventory updated successfully across regional network.");
    }, 800);
  };

  const getStatusColor = (count: number) => {
    if (count > 10) return 'text-emerald-500';
    if (count > 5) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getProgressWidth = (count: number) => {
    return `${Math.min(100, (count / 30) * 100)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm">
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
        <div className="text-right">
           <h3 className="font-bold text-slate-800">Metropolitan Red Cross</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Facility ID: LRC-00912</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(inventory) as BloodType[]).map(type => (
          <div key={type} className="bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
               <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center font-black text-rose-600 text-sm">
                 {type}
               </div>
               <div className="flex flex-col items-end">
                 <span className={`text-2xl font-black ${getStatusColor(inventory[type])}`}>{inventory[type]}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Units</span>
               </div>
            </div>
            
            <div className="w-full bg-slate-100 h-1 rounded-full mb-6 relative">
               <div 
                 className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${inventory[type] > 10 ? 'bg-emerald-400' : inventory[type] > 5 ? 'bg-amber-400' : 'bg-rose-400'}`}
                 style={{ width: getProgressWidth(inventory[type]) }}
               ></div>
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={() => updateUnits(type, -1)}
                 className="flex-1 bg-slate-50 hover:bg-slate-100 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
               >
                 <i className="fa-solid fa-minus"></i>
               </button>
               <button 
                 onClick={() => updateUnits(type, 1)}
                 className="flex-1 bg-slate-50 hover:bg-slate-100 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors"
               >
                 <i className="fa-solid fa-plus"></i>
               </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
         <button 
           onClick={handleSave}
           disabled={isSaving}
           className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
         >
           {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
           Commit Changes
         </button>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ role: Role, onNavigate: (tab: any) => void, onInternalView: (view: string) => void }> = ({ role, onNavigate, onInternalView }) => {
  if (role === 'GUEST') return <div className="p-8 text-center text-slate-400">Please log in to access the management portal.</div>;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Workspace: {role} Portal</h2>
        <RoleBadge role={role} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('health')}
          className="bg-white p-6 rounded-3xl border shadow-sm border-blue-100 hover:ring-2 ring-blue-500 transition-all cursor-pointer bg-gradient-to-br from-white to-blue-50"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-500 flex items-center justify-center mb-4 text-xl">
             <i className="fa-solid fa-stethoscope"></i>
          </div>
          <h3 className="font-bold mb-2">Medical Assistance</h3>
          <p className="text-sm text-slate-500">Get AI guidance on health, recovery, and blood conditions.</p>
        </div>

        {(role === 'ADMIN') && (
          <>
            <div className="bg-white p-6 rounded-3xl border shadow-sm hover:ring-2 ring-purple-500 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center mb-4 text-xl">
                 <i className="fa-solid fa-user-plus"></i>
              </div>
              <h3 className="font-bold mb-2">Register Donor</h3>
              <p className="text-sm text-slate-500">Add new life-savers to the regional donor database.</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm hover:ring-2 ring-purple-500 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center mb-4 text-xl">
                 <i className="fa-solid fa-user-pen"></i>
              </div>
              <h3 className="font-bold mb-2">Update Donor Details</h3>
              <p className="text-sm text-slate-500">Modify health status or contact info for existing donors.</p>
            </div>
          </>
        )}

        {(role === 'PATIENT' || role === 'DONOR') && (
          <div className="bg-white p-6 rounded-3xl border shadow-sm hover:ring-2 ring-rose-500 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center mb-4 text-xl">
               <i className="fa-solid fa-file-medical"></i>
            </div>
            <h3 className="font-bold mb-2">Request Blood</h3>
            <p className="text-sm text-slate-500">File an emergency request for specific blood types.</p>
          </div>
        )}

        {(role === 'STAFF' || role === 'ADMIN') && (
          <>
            <div 
              onClick={() => onInternalView('inventory')}
              className="bg-white p-6 rounded-3xl border shadow-sm border-amber-100 hover:ring-2 ring-amber-500 transition-all cursor-pointer bg-gradient-to-br from-white to-amber-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center mb-4 text-xl">
                 <i className="fa-solid fa-warehouse"></i>
              </div>
              <h3 className="font-bold mb-2">Manage Inventory</h3>
              <p className="text-sm text-slate-500">Update unit counts for all blood types in your center.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [selectedBloodType, setSelectedBloodType] = useState<BloodType>('O+');
  const [sortBy, setSortBy] = useState<'distance' | 'eta'>('distance');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [results, setResults] = useState<BloodBank[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'health' | 'dashboard'>('search');
  const [activeRole, setActiveRole] = useState<Role>('GUEST');
  
  // New States for Dashboard Navigation
  const [dashboardView, setDashboardView] = useState<'main' | 'inventory'>('main');
  
  const [shortageAlert, setShortageAlert] = useState<{ text: string, sources: any[] } | null>(null);
  const [isCheckingShortages, setIsCheckingShortages] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Location access denied", err)
      );
    }
    setChatHistory([{
      role: 'model',
      text: 'Hello! I am LifeLink AI Medical Assistant. How can I help you today? (Note: I am an AI, always consult a doctor for medical advice.)',
      timestamp: new Date()
    }]);
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    setIsCheckingShortages(true);
    setShortageAlert(null);

    const MOCK_CENTERS: BloodBank[] = [
      { id: '1', name: 'Metropolitan Red Cross', address: '123 Healthcare Blvd', latitude: 12.975, longitude: 77.601, contact_number: '+1-555-0101', units_available: 12, inventory: { 'A+': 12, 'A-': 5, 'B+': 8, 'B-': 2, 'O+': 20, 'O-': 3, 'AB+': 4, 'AB-': 1 }, distance_km: 1.2, eta_minutes: 5, google_maps_url: 'https://maps.google.com' },
      { id: '2', name: 'St. Jude Hospital', address: '45 Medical Lane', latitude: 12.980, longitude: 77.610, contact_number: '+1-555-0102', units_available: 4, inventory: { 'A+': 4, 'A-': 0, 'B+': 12, 'B-': 1, 'O+': 15, 'O-': 6, 'AB+': 2, 'AB-': 0 }, distance_km: 2.8, eta_minutes: 12, google_maps_url: 'https://maps.google.com' }
    ];

    const region = "the local metropolitan area"; 
    searchBloodShortages(region).then(res => {
        setShortageAlert(res);
        setIsCheckingShortages(false);
    }).catch(err => {
        console.error("Shortage check failed", err);
        setIsCheckingShortages(false);
    });

    setTimeout(() => {
      const updatedResults = MOCK_CENTERS
        .map(c => ({ ...c, units_available: c.inventory[selectedBloodType] }))
        .sort((a, b) => sortBy === 'distance' ? a.distance_km - b.distance_km : a.eta_minutes - b.eta_minutes);
      setResults(updatedResults);
      setIsSearching(false);
    }, 1000);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    try {
      const response = await getBloodBotResponse(chatInput, []);
      setChatHistory(prev => [...prev, { role: 'model', text: response || 'Error reaching assistant.', timestamp: new Date() }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-red-600 text-white shadow-lg sticky top-0 z-50 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-droplet text-2xl animate-pulse"></i>
            <h1 className="text-xl font-bold">LifeLink AI</h1>
          </div>
          <nav className="hidden md:flex gap-6 font-medium items-center">
            <button onClick={() => { setActiveTab('search'); setDashboardView('main'); }} className={`transition-all ${activeTab === 'search' ? 'border-b-2 border-white pb-1' : 'opacity-80 hover:opacity-100'}`}>Search</button>
            <button onClick={() => { setActiveTab('health'); setDashboardView('main'); }} className={`transition-all ${activeTab === 'health' ? 'border-b-2 border-white pb-1' : 'opacity-80 hover:opacity-100'}`}>Health Insights</button>
            <button onClick={() => { setActiveTab('dashboard'); setDashboardView('main'); }} className={`transition-all ${activeTab === 'dashboard' ? 'border-b-2 border-white pb-1' : 'opacity-80 hover:opacity-100'}`}>Dashboard</button>
            <div className="flex items-center gap-2 bg-red-700/50 p-1.5 rounded-xl border border-red-500/30">
              <span className="text-[10px] uppercase font-bold pl-2">Access:</span>
              <select 
                value={activeRole} 
                onChange={(e) => { setActiveRole(e.target.value as Role); setDashboardView('main'); }}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="GUEST" className="text-slate-900">Guest</option>
                <option value="ADMIN" className="text-slate-900">Admin</option>
                <option value="STAFF" className="text-slate-900">Staff</option>
                <option value="DONOR" className="text-slate-900">Donor</option>
                <option value="PATIENT" className="text-slate-900">Patient</option>
              </select>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><i className="fa-solid fa-magnifying-glass text-red-600"></i>Emergency Search</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Blood Type Required</label>
                    <select value={selectedBloodType} onChange={(e) => setSelectedBloodType(e.target.value as BloodType)} className="w-full p-3 border rounded-xl bg-slate-50 mt-1 font-bold">
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Priority Strategy</label>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setSortBy('distance')} className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all ${sortBy === 'distance' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500'}`}>Shortest Path</button>
                      <button onClick={() => setSortBy('eta')} className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all ${sortBy === 'eta' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500'}`}>Fastest ETA</button>
                    </div>
                  </div>
                  <button onClick={handleSearch} disabled={isSearching} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 disabled:opacity-50 transition-all active:scale-95">
                    {isSearching ? <i className="fa-solid fa-spinner animate-spin"></i> : "Find LifeLink Centers"}
                  </button>
                </div>
              </div>
              <BloodMap results={results} userLocation={userLocation} selectedBloodType={selectedBloodType} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {(isCheckingShortages || shortageAlert) && (
                <div className={`p-6 rounded-3xl border-2 transition-all ${isCheckingShortages ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200 shadow-sm'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCheckingShortages ? 'bg-slate-200' : 'bg-amber-100'}`}>
                      {isCheckingShortages ? (
                        <i className="fa-solid fa-earth-americas animate-spin text-slate-500"></i>
                      ) : (
                        <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm">
                        {isCheckingShortages ? "Checking Regional Health Alerts..." : "Regional Health Alert"}
                      </h3>
                      {!isCheckingShortages && <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Live News Grounding</p>}
                    </div>
                  </div>
                  
                  {isCheckingShortages ? (
                    <div className="space-y-2">
                       <div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div>
                       <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-700 leading-relaxed italic">
                        "{shortageAlert?.text}"
                      </p>
                      
                      {shortageAlert?.sources && shortageAlert.sources.length > 0 && (
                        <div className="pt-3 border-t border-amber-200">
                          <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Verified Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {shortageAlert.sources.map((chunk: any, i: number) => {
                              const web = chunk.web;
                              if (!web) return null;
                              return (
                                <a 
                                  key={i} 
                                  href={web.uri} 
                                  target="_blank" 
                                  className="text-[10px] bg-white border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors flex items-center gap-1 font-medium"
                                >
                                  <i className="fa-solid fa-link text-[8px]"></i>
                                  {web.title || "Source"}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xl font-bold text-slate-800">Available Stock</h2>
                 {results.length > 0 && <span className="text-xs text-slate-500">{results.length} centers found near you</span>}
              </div>
              {results.length === 0 && !isSearching && (
                <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                   <i className="fa-solid fa-map-pin text-slate-300 text-4xl mb-4"></i>
                   <p className="text-slate-400 font-medium">Use search to find active blood centers.</p>
                </div>
              )}
              {results.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-red-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1"><i className="fa-solid fa-location-dot"></i> {c.address}</p>
                    </div>
                    <span className={`px-4 py-2 ${c.units_available > 5 ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'} rounded-2xl text-xs font-black`}>
                      {selectedBloodType}: {c.units_available} UNITS
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-y border-slate-50 py-4 mb-4">
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-bold tracking-widest">DISTANCE</p><p className="font-bold text-slate-700">{c.distance_km} km</p></div>
                    <div className="text-center border-x"><p className="text-[10px] text-slate-400 font-bold tracking-widest">TRAVEL TIME</p><p className="font-bold text-slate-700">{c.eta_minutes} min</p></div>
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-bold tracking-widest">CENTER SCORE</p><p className="font-bold text-amber-500">4.8 <i className="fa-solid fa-star text-[10px]"></i></p></div>
                  </div>
                  <div className="flex gap-3">
                    <a href={`tel:${c.contact_number}`} className="flex-1 bg-slate-50 border text-slate-700 py-3.5 rounded-2xl text-center font-bold hover:bg-slate-100 transition-all">Call Center</a>
                    <a href={c.google_maps_url} target="_blank" className="flex-1 bg-red-600 text-white py-3.5 rounded-2xl text-center font-bold hover:bg-red-700 shadow-md transition-all">Start Routing</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'health' && <HealthCenter />}

        {activeTab === 'dashboard' && (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            {dashboardView === 'main' ? (
              <Dashboard 
                role={activeRole} 
                onNavigate={setActiveTab} 
                onInternalView={setDashboardView} 
              />
            ) : (
              <InventoryManager onBack={() => setDashboardView('main')} />
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setChatOpen(!chatOpen)} 
          className="bg-red-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <i className={`fa-solid ${chatOpen ? 'fa-xmark' : 'fa-headset'} text-xl`}></i>
        </button>
        {chatOpen && (
          <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border flex flex-col h-[500px] overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-red-600 p-4 text-white font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-robot"></i>
                <span>Medical Assistant</span>
              </div>
              <span className="text-[10px] bg-red-700 px-2 py-0.5 rounded-full uppercase">AI Agent</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl text-sm max-w-[85%] shadow-sm ${
                    m.role === 'user' 
                    ? 'bg-red-600 text-white rounded-tr-none' 
                    : 'bg-white border text-slate-700 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                   <div className="bg-white border p-3 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
                     <i className="fa-solid fa-circle-notch animate-spin"></i> Thinking...
                   </div>
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-100/50 border-t border-slate-100">
               <p className="text-[9px] text-slate-400 italic text-center uppercase tracking-tight">AI can make mistakes. Always check with a doctor.</p>
            </div>
            <form onSubmit={handleChatSubmit} className="p-3 border-t bg-white flex gap-2">
              <input 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Ask about health, care, or donor info..." 
                className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 ring-red-500/20 focus:outline-none" 
              />
              <button className="bg-red-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-red-700 transition-colors">
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
