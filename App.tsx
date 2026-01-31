
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  getBloodBotResponse, 
  searchBloodShortages 
} from './services/gemini';
import { BloodType, BloodBank, ChatMessage } from './types';

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
      <div ref={mapContainerRef} className="w-full h-[400px] md:h-[500px] z-0" />
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

const Dashboard: React.FC<{ role: Role }> = ({ role }) => {
  if (role === 'GUEST') return <div className="p-8 text-center text-slate-400">Please log in to access the management portal.</div>;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Workspace: {role} Portal</h2>
        <RoleBadge role={role} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Admin Section */}
        {(role === 'ADMIN') && (
          <>
            <div className="bg-white p-6 rounded-2xl border shadow-sm hover:ring-2 ring-purple-500 transition-all cursor-pointer">
              <i className="fa-solid fa-user-plus text-purple-500 text-2xl mb-4"></i>
              <h3 className="font-bold mb-2">Register Donor</h3>
              <p className="text-sm text-slate-500">Add new life-savers to the regional donor database.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm hover:ring-2 ring-purple-500 transition-all cursor-pointer">
              <i className="fa-solid fa-user-pen text-purple-500 text-2xl mb-4"></i>
              <h3 className="font-bold mb-2">Update Donor Details</h3>
              <p className="text-sm text-slate-500">Modify health status or contact info for existing donors.</p>
            </div>
          </>
        )}

        {/* Patient / Donor Section */}
        {(role === 'PATIENT' || role === 'DONOR') && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm hover:ring-2 ring-blue-500 transition-all cursor-pointer">
            <i className="fa-solid fa-file-medical text-blue-500 text-2xl mb-4"></i>
            <h3 className="font-bold mb-2">Request Blood</h3>
            <p className="text-sm text-slate-500">File an emergency request for specific blood types.</p>
          </div>
        )}

        {/* Staff Section */}
        {(role === 'STAFF' || role === 'ADMIN') && (
          <>
            <div className="bg-white p-6 rounded-2xl border shadow-sm hover:ring-2 ring-amber-500 transition-all cursor-pointer">
              <i className="fa-solid fa-warehouse text-amber-500 text-2xl mb-4"></i>
              <h3 className="font-bold mb-2">Manage Inventory</h3>
              <p className="text-sm text-slate-500">Update unit counts for all blood types in your center.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm hover:ring-2 ring-amber-500 transition-all cursor-pointer">
              <i className="fa-solid fa-user-nurse text-amber-500 text-2xl mb-4"></i>
              <h3 className="font-bold mb-2">Update Donor Logs</h3>
              <p className="text-sm text-slate-500">Record recent donations and verify donor health.</p>
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
  const [activeTab, setActiveTab] = useState<'search' | 'info' | 'dashboard'>('search');
  const [activeRole, setActiveRole] = useState<Role>('GUEST');
  const [regionalInfo, setRegionalInfo] = useState<{text: string, sources: any[]}>({ text: '', sources: [] });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Location access denied", err)
      );
    }
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    // In a real app, this would be a fetch to /api/search-blood with sortBy
    const MOCK_CENTERS: BloodBank[] = [
      { id: '1', name: 'Metropolitan Red Cross', address: '123 Healthcare Blvd', latitude: 12.975, longitude: 77.601, contact_number: '+1-555-0101', units_available: 12, inventory: { 'A+': 12, 'A-': 5, 'B+': 8, 'B-': 2, 'O+': 20, 'O-': 3, 'AB+': 4, 'AB-': 1 }, distance_km: 1.2, eta_minutes: 5, google_maps_url: '#' },
      { id: '2', name: 'St. Jude Hospital', address: '45 Medical Lane', latitude: 12.980, longitude: 77.610, contact_number: '+1-555-0102', units_available: 4, inventory: { 'A+': 4, 'A-': 0, 'B+': 12, 'B-': 1, 'O+': 15, 'O-': 6, 'AB+': 2, 'AB-': 0 }, distance_km: 2.8, eta_minutes: 12, google_maps_url: '#' }
    ];

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
      setChatHistory(prev => [...prev, { role: 'model', text: response || 'Error', timestamp: new Date() }]);
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
            <button onClick={() => setActiveTab('search')} className={activeTab === 'search' ? 'border-b-2' : ''}>Search</button>
            <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'border-b-2' : ''}>Dashboard</button>
            <div className="flex items-center gap-2 bg-red-700/50 p-1 rounded-lg">
              <span className="text-[10px] uppercase font-bold pl-2">Role:</span>
              <select 
                value={activeRole} 
                onChange={(e) => setActiveRole(e.target.value as Role)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
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

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 space-y-8">
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><i className="fa-solid fa-magnifying-glass text-red-600"></i>Emergency Search</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Blood Type</label>
                    <select value={selectedBloodType} onChange={(e) => setSelectedBloodType(e.target.value as BloodType)} className="w-full p-3 border rounded-xl bg-slate-50 mt-1">
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Sort By</label>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setSortBy('distance')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${sortBy === 'distance' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500'}`}>Distance</button>
                      <button onClick={() => setSortBy('eta')} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${sortBy === 'eta' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500'}`}>Travel Time</button>
                    </div>
                  </div>
                  <button onClick={handleSearch} disabled={isSearching} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">
                    {isSearching ? <i className="fa-solid fa-spinner animate-spin"></i> : "Locate Centers"}
                  </button>
                </div>
              </div>
              <BloodMap results={results} userLocation={userLocation} selectedBloodType={selectedBloodType} />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold">Recommended Centers</h2>
              {results.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div><h3 className="font-bold text-slate-800">{c.name}</h3><p className="text-sm text-slate-500">{c.address}</p></div>
                    <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">{selectedBloodType}: {c.units_available}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-y py-4 mb-4">
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-bold">DISTANCE</p><p className="font-bold">{c.distance_km} km</p></div>
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-bold">TRAVEL TIME</p><p className="font-bold">{c.eta_minutes} min</p></div>
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-bold">RATING</p><p className="font-bold text-amber-500">4.8 <i className="fa-solid fa-star text-[10px]"></i></p></div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${c.contact_number}`} className="flex-1 bg-slate-50 border text-slate-700 py-3 rounded-xl text-center font-bold">Call</a>
                    <a href="#" className="flex-1 bg-red-600 text-white py-3 rounded-xl text-center font-bold">Route</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <Dashboard role={activeRole} />
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setChatOpen(!chatOpen)} className="bg-red-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center">
          <i className={`fa-solid ${chatOpen ? 'fa-xmark' : 'fa-headset'} text-xl`}></i>
        </button>
        {chatOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border flex flex-col h-96">
            <div className="bg-red-600 p-3 text-white rounded-t-2xl font-bold">AI Assistant</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              {chatHistory.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2 rounded-lg text-xs max-w-[80%] ${m.role === 'user' ? 'bg-red-600 text-white' : 'bg-white border'}`}>{m.text}</div>
                </div>
              ))}
              {isTyping && <div className="text-[10px] text-slate-400">Assistant is thinking...</div>}
            </div>
            <form onSubmit={handleChatSubmit} className="p-2 border-t flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type..." className="flex-1 text-xs border rounded-lg px-2 py-1" />
              <button className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs">Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
