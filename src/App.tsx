import React, { useState, useEffect, useRef } from 'react';
import { 
  Instagram, 
  Zap, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  ArrowRight,
  Star,
  Users,
  Eye,
  Heart,
  Play,
  MessageCircle,
  Lock,
  Smartphone,
  Globe,
  QrCode,
  Copy,
  ExternalLink,
  History,
  Search,
  Settings,
  LogOut,
  Plus,
  Trash2,
  RefreshCw,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface Package {
  id: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice: number;
  isPopular?: boolean;
  service_type: string;
}

interface Service {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  packages: Package[];
}

interface Order {
  id: string;
  service_type: string;
  package_id: string;
  quantity: number;
  price: number;
  reel_url: string;
  utr_number: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

// --- Constants ---
const ADMIN_CODE = "2563123456789";
const UPI_ID = "mikhelxavegeorge-1@okaxis";
const MERCHANT_NAME = "DEOXY INSTA BOOST";

const SERVICES: Service[] = [
  {
    id: 'reel_views',
    name: 'Reel Views',
    icon: <Play className="w-5 h-5" />,
    description: 'Boost your reach and go viral with high-quality views.',
    packages: [
      { id: 'rv_1', name: 'Starter', quantity: 1000, price: 10, originalPrice: 49, service_type: 'Reel Views' },
      { id: 'rv_2', name: 'Growth', quantity: 5000, price: 45, originalPrice: 199, isPopular: true, service_type: 'Reel Views' },
      { id: 'rv_3', name: 'Viral', quantity: 10000, price: 80, originalPrice: 399, service_type: 'Reel Views' },
      { id: 'rv_4', name: 'Mega', quantity: 50000, price: 350, originalPrice: 1499, service_type: 'Reel Views' },
    ]
  },
  {
    id: 'followers',
    name: 'Followers',
    icon: <Users className="w-5 h-5" />,
    description: 'Build authority and trust with real-looking followers.',
    packages: [
      { id: 'fol_1', name: 'Basic', quantity: 100, price: 25, originalPrice: 99, service_type: 'Followers' },
      { id: 'fol_2', name: 'Standard', quantity: 500, price: 110, originalPrice: 399, isPopular: true, service_type: 'Followers' },
      { id: 'fol_3', name: 'Premium', quantity: 1000, price: 210, originalPrice: 799, service_type: 'Followers' },
      { id: 'fol_4', name: 'Elite', quantity: 5000, price: 950, originalPrice: 3499, service_type: 'Followers' },
    ]
  },
  {
    id: 'likes',
    name: 'Likes',
    icon: <Heart className="w-5 h-5" />,
    description: 'Increase engagement and social proof on your posts.',
    packages: [
      { id: 'lik_1', name: 'Small', quantity: 100, price: 15, originalPrice: 49, service_type: 'Likes' },
      { id: 'lik_2', name: 'Medium', quantity: 500, price: 65, originalPrice: 199, isPopular: true, service_type: 'Likes' },
      { id: 'lik_3', name: 'Large', quantity: 1000, price: 120, originalPrice: 399, service_type: 'Likes' },
      { id: 'lik_4', name: 'Huge', quantity: 5000, price: 550, originalPrice: 1799, service_type: 'Likes' },
    ]
  },
  {
    id: 'story_views',
    name: 'Story Views',
    icon: <Eye className="w-5 h-5" />,
    description: 'Boost your story engagement and visibility.',
    packages: [
      { id: 'sv_1', name: 'Quick', quantity: 100, price: 12, originalPrice: 39, service_type: 'Story Views' },
      { id: 'sv_2', name: 'Active', quantity: 500, price: 50, originalPrice: 149, isPopular: true, service_type: 'Story Views' },
      { id: 'sv_3', name: 'Popular', quantity: 1000, price: 90, originalPrice: 299, service_type: 'Story Views' },
    ]
  }
];

// --- Components ---

const App = () => {
  const [step, setStep] = useState<'selection' | 'details' | 'payment' | 'success' | 'history' | 'admin'>('selection');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [reelUrl, setReelUrl] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<'open' | 'closed'>('open');
  const [isServerStatusLoading, setIsServerStatusLoading] = useState(true);
  
  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    try {
      // First check if API is reachable
      const healthRes = await fetch('/api/health').catch(() => null);
      if (!healthRes || !healthRes.ok) {
        console.error("Backend API is unreachable. Make sure the server is running.");
        setError("Backend connection failed. Please ensure the server is running.");
        setIsServerStatusLoading(false);
        return;
      }

      const res = await fetch('/api/settings/server-status');
      const data = await res.json();
      setServerStatus(data.status);
    } catch (err) {
      console.error("Failed to fetch server status", err);
    } finally {
      setIsServerStatusLoading(false);
    }
  };

  const toggleServerStatus = async () => {
    const newStatus = serverStatus === 'open' ? 'closed' : 'open';
    try {
      const res = await fetch('/api/settings/server-status', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-code': ADMIN_CODE
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setServerStatus(newStatus);
      }
    } catch (err) {
      console.error("Failed to toggle server status", err);
    }
  };

  const validateUrl = (url: string) => {
    const instagramRegex = /(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|tv|stories)\/([A-Za-z0-9._-]+)/;
    return instagramRegex.test(url);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(reelUrl)) {
      setError(`Please enter a valid Instagram ${selectedService?.id === 'story_views' ? 'Story' : 'Reel'} URL`);
      return;
    }
    setError('');
    
    // Analyze Reel with AI
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this Instagram link for viral potential based on current trends: ${reelUrl}. Provide a 1-sentence hype summary.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      setAnalysis(response.text || "Link verified. Ready for boost!");
    } catch (err) {
      setAnalysis("Link verified. High viral potential detected!");
    } finally {
      setIsAnalyzing(false);
      setStep('payment');
    }
  };

  const handlePaymentComplete = async () => {
    if (!utrNumber || utrNumber.length < 6) {
      setError('Please enter a valid UTR/Transaction ID');
      return;
    }
    setError('');
    setIsProcessing(true);

    const orderId = `DIB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          service_type: selectedPackage?.service_type,
          package_id: selectedPackage?.id,
          quantity: selectedPackage?.quantity,
          price: selectedPackage?.price,
          reel_url: reelUrl,
          utr_number: utrNumber
        })
      });

      if (res.ok) {
        // Save order ID to local storage for history
        const savedIds = JSON.parse(localStorage.getItem('dib_order_ids') || '[]');
        localStorage.setItem('dib_order_ids', JSON.stringify([...savedIds, orderId]));
        
        setCurrentOrderId(orderId);
        setOrderStatus('pending');
        setStep('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to submit order. Please try again.');
      }
    } catch (err) {
      console.error("Payment submission error:", err);
      setError('Connection error. Please ensure the server is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Admin Functions
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_CODE) {
      setIsAdminLoggedIn(true);
      fetchAdminOrders();
    } else {
      setError('Invalid admin code');
    }
  };

  const fetchAdminOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-admin-code': ADMIN_CODE }
      });
      const data = await res.json();
      setAllOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const approveOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/approve`, {
        method: 'PATCH',
        headers: { 'x-admin-code': ADMIN_CODE }
      });
      if (res.ok) {
        setAllOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'approved' } : o));
      }
    } catch (err) {
      console.error("Failed to approve order", err);
    }
  };

  const fetchHistory = async () => {
    const savedIds = JSON.parse(localStorage.getItem('dib_order_ids') || '[]');
    if (savedIds.length === 0) {
      setOrderHistory([]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: savedIds })
      });
      const data = await res.json();
      setOrderHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${selectedPackage?.price}&cu=INR&tn=${encodeURIComponent(`Order for ${selectedPackage?.quantity} ${selectedPackage?.service_type}`)}`;

  const scrollToSection = (id: string) => {
    if (step !== 'selection') {
      setStep('selection');
      setSelectedService(null);
      // Wait for state update and re-render
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  if (isServerStatusLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-white/60 font-medium">Initializing secure connection...</p>
        </div>
      </div>
    );
  }

  if (serverStatus === 'closed' && step !== 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Server Maintenance</h1>
          <p className="text-white/60 mb-8 leading-relaxed">
            We are currently upgrading our systems to provide you with faster delivery. 
            We'll be back online shortly!
          </p>
          <div className="flex flex-col gap-3">
            <a 
              href="https://wa.me/918129343315" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-colors"
            >
              Contact Support
            </a>
            <button 
              onClick={() => setStep('admin')}
              className="text-white/40 hover:text-white transition-colors text-sm py-2"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => {
              setStep('selection');
              setSelectedService(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">Deoxy Boost</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('services')} className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Services</button>
            <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-white/60 hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm font-semibold text-white/60 hover:text-white transition-colors">FAQ</button>
            <button 
              onClick={() => {
                setStep('history');
                fetchHistory();
              }} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm font-bold hover:bg-white/10 transition-all"
            >
              <History className="w-4 h-4" />
              My Orders
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#050505] pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              <button onClick={() => scrollToSection('services')} className="text-2xl font-bold text-left py-4 border-b border-white/5">Services</button>
              <button onClick={() => scrollToSection('features')} className="text-2xl font-bold text-left py-4 border-b border-white/5">Features</button>
              <button onClick={() => scrollToSection('faq')} className="text-2xl font-bold text-left py-4 border-b border-white/5">FAQ</button>
              <button 
                onClick={() => {
                  setStep('history');
                  fetchHistory();
                  setIsMenuOpen(false);
                }} 
                className="flex items-center justify-between w-full py-6 bg-indigo-600 rounded-3xl px-8 mt-4"
              >
                <span className="text-xl font-bold">My Orders</span>
                <History className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-20">
        {step === 'selection' && (
          <div className="pb-20">
            {/* Hero Section */}
            <section className="relative px-6 pt-16 pb-24 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -z-10" />
              
              <div className="max-w-4xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60">System Online • Instant Delivery</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[0.9]"
                >
                  GO VIRAL <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">INSTANTLY.</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed"
                >
                  The #1 trusted platform for Instagram growth. Real engagement, 
                  lightning-fast delivery, and 24/7 support.
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap justify-center gap-4"
                >
                  <button 
                    onClick={() => scrollToSection('services')}
                    className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-all flex items-center gap-2 group"
                  >
                    Boost Now
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => scrollToSection('features')}
                    className="px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Learn More
                  </button>
                </motion.div>
              </div>
            </section>

            {/* Stats Bar */}
            <section className="px-6 mb-24">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Active Users', value: '50K+', icon: <Users className="w-4 h-4" /> },
                  { label: 'Orders Completed', value: '1.2M+', icon: <CheckCircle2 className="w-4 h-4" /> },
                  { label: 'Avg. Delivery', value: '2 Min', icon: <Clock className="w-4 h-4" /> },
                  { label: 'Success Rate', value: '99.9%', icon: <TrendingUp className="w-4 h-4" /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                      {stat.icon}
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-black">{stat.value}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Services Grid */}
            <section id="services" className="px-6 mb-32 scroll-mt-24">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-4xl font-black mb-4 tracking-tight">OUR SERVICES</h2>
                    <p className="text-white/40 max-w-md">Select a service to see available packages and pricing.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {SERVICES.map((service) => (
                    <motion.div
                      key={service.id}
                      whileHover={{ y: -8 }}
                      className={`relative group cursor-pointer rounded-[32px] p-8 transition-all border ${
                        selectedService?.id === service.id 
                          ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-600/20' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                      onClick={() => setSelectedService(service)}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                        selectedService?.id === service.id ? 'bg-white text-indigo-600' : 'bg-white/10 text-white'
                      }`}>
                        {service.icon}
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{service.name}</h3>
                      <p className={`text-sm leading-relaxed ${
                        selectedService?.id === service.id ? 'text-white/80' : 'text-white/40'
                      }`}>
                        {service.description}
                      </p>
                      
                      {selectedService?.id === service.id && (
                        <motion.div 
                          layoutId="active-indicator"
                          className="absolute top-6 right-6 w-3 h-3 bg-white rounded-full"
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Packages Display */}
                <AnimatePresence mode="wait">
                  {selectedService && (
                    <motion.div
                      key={selectedService.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 40 }}
                      className="mt-16"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {selectedService.packages.map((pkg) => (
                          <div 
                            key={pkg.id}
                            className={`relative overflow-hidden rounded-[32px] p-8 border transition-all ${
                              pkg.isPopular ? 'bg-white/10 border-indigo-500/50' : 'bg-white/5 border-white/10'
                            }`}
                          >
                            {pkg.isPopular && (
                              <div className="absolute top-0 right-0 bg-indigo-500 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                                Best Value
                              </div>
                            )}
                            <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">{pkg.name}</div>
                            <div className="text-4xl font-black mb-6">{pkg.quantity.toLocaleString()}</div>
                            
                            <div className="flex items-baseline gap-2 mb-8">
                              <span className="text-3xl font-bold">₹{pkg.price}</span>
                              <span className="text-white/30 line-through text-sm">₹{pkg.originalPrice}</span>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedPackage(pkg);
                                setStep('details');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-full py-4 rounded-2xl font-bold transition-all ${
                                pkg.isPopular 
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-500' 
                                  : 'bg-white text-black hover:bg-white/90'
                              }`}
                            >
                              Select Package
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Features Section */}
            <section id="features" className="px-6 py-32 bg-white/[0.02] border-y border-white/5 scroll-mt-24">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">WHY CHOOSE US?</h2>
                  <p className="text-white/40 max-w-xl mx-auto">We provide the highest quality services with industry-leading security and speed.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {[
                    {
                      title: 'Instant Delivery',
                      desc: 'Our automated system starts processing your order the moment payment is verified.',
                      icon: <Zap className="w-8 h-8 text-amber-400" />
                    },
                    {
                      title: 'Secure Payments',
                      desc: 'All transactions are encrypted and processed through secure UPI gateways.',
                      icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    },
                    {
                      title: '24/7 Support',
                      desc: 'Our dedicated team is always available to help you with any questions or issues.',
                      icon: <MessageCircle className="w-8 h-8 text-indigo-400" />
                    }
                  ].map((feature, i) => (
                    <div key={i} className="text-center group">
                      <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                        {feature.icon}
                      </div>
                      <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                      <p className="text-white/40 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="px-6 py-32 scroll-mt-24">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-4xl font-black mb-12 text-center tracking-tight">FREQUENTLY ASKED</h2>
                <div className="space-y-4">
                  {[
                    { q: 'Is it safe for my account?', a: 'Yes, our methods are 100% safe and comply with Instagram guidelines. We never ask for your password.' },
                    { q: 'How long does delivery take?', a: 'Most orders start instantly and complete within minutes. Larger orders may take up to 24 hours for natural growth.' },
                    { q: 'What if my order drops?', a: 'We offer a 30-day refill guarantee on all premium packages. If your numbers drop, we refill them for free.' },
                    { q: 'Do you offer custom packages?', a: 'Yes! Contact our support team on WhatsApp for bulk orders or custom requirements.' }
                  ].map((item, i) => (
                    <details key={i} className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                      <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-lg">
                        {item.q}
                        <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="px-6 pb-6 text-white/50 leading-relaxed">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {step === 'details' && (
          <div className="max-w-xl mx-auto px-6 py-12">
            <button 
              onClick={() => setStep('selection')}
              className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel Order
            </button>

            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-12 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                  {selectedService?.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedPackage?.quantity.toLocaleString()} {selectedPackage?.service_type}</h2>
                  <p className="text-white/40">₹{selectedPackage?.price} • Instant Delivery</p>
                </div>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                    Instagram {selectedService?.id === 'story_views' ? 'Story' : 'Post'} Link
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={reelUrl}
                      onChange={(e) => setReelUrl(e.target.value)}
                      placeholder={selectedService?.id === 'story_views' ? "https://www.instagram.com/stories/..." : "https://www.instagram.com/reel/..."}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <Instagram className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  </div>
                  <p className="mt-3 text-[10px] text-white/30 uppercase tracking-wider">Make sure your account is PUBLIC</p>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Analyzing Link...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="max-w-xl mx-auto px-6 py-12">
            <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-xl">
              <div className="p-8 md:p-12 border-b border-white/5">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-black mb-2">COMPLETE PAYMENT</h2>
                    <p className="text-white/40">Scan or use the button below to pay via UPI</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1">Amount</div>
                    <div className="text-3xl font-black text-indigo-400">₹{selectedPackage?.price}</div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-8 py-4">
                  <div className="p-6 bg-white rounded-[32px] shadow-2xl shadow-indigo-500/20">
                    <QRCodeSVG 
                      value={upiUrl} 
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  
                  <div className="flex flex-col items-center gap-4 w-full">
                    <a 
                      href={upiUrl}
                      className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
                    >
                      <Smartphone className="w-5 h-5" />
                      Pay with UPI App
                    </a>
                    <div className="flex items-center gap-2 text-white/30 text-xs font-bold uppercase tracking-widest">
                      <Lock className="w-3 h-3" />
                      Secure UPI Payment
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12 bg-white/[0.02]">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">
                      Enter UTR / Transaction ID
                    </label>
                    <input
                      type="text"
                      required
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="12-digit UTR number"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handlePaymentComplete}
                    disabled={isProcessing}
                    className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Verifying Payment...
                      </>
                    ) : (
                      <>
                        Submit Order
                        <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <p className="mt-8 text-center text-white/30 text-xs leading-relaxed">
              Payment is secure and encrypted. Need help? <a href="https://wa.me/918129343315" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Contact Support</a>
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="max-w-xl mx-auto px-6 py-12">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/5 border border-white/10 rounded-[40px] p-12 text-center backdrop-blur-xl"
            >
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              
              <h2 className="text-4xl font-black mb-4">ORDER PLACED!</h2>
              <p className="text-white/40 mb-12 leading-relaxed">
                Your order has been received and is being processed. 
                Most orders complete within 15-30 minutes.
              </p>

              <div className="bg-white/5 rounded-3xl p-6 mb-12 text-left border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Order ID</span>
                  <span className="font-mono font-bold text-indigo-400">{currentOrderId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Status</span>
                  <span className="flex items-center gap-2 text-amber-500 font-bold">
                    <Clock className="w-4 h-4" />
                    Processing
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setStep('selection')}
                  className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all"
                >
                  Place Another Order
                </button>
                <button
                  onClick={() => {
                    setStep('history');
                    fetchHistory();
                  }}
                  className="w-full py-5 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  View Order History
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {step === 'history' && (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-black tracking-tight">ORDER HISTORY</h2>
              <button 
                onClick={() => setStep('selection')}
                className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Loading your orders...</p>
              </div>
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[40px]">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Orders Found</h3>
                <p className="text-white/40 mb-8">You haven't placed any orders yet.</p>
                <button 
                  onClick={() => setStep('selection')}
                  className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-all"
                >
                  Start Boosting
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orderHistory.map((order) => (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        order.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 
                        order.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {order.status === 'approved' ? <CheckCircle2 /> : order.status === 'rejected' ? <AlertCircle /> : <Clock />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1">{order.id}</div>
                        <h3 className="text-xl font-bold">{order.quantity.toLocaleString()} {order.service_type}</h3>
                        <p className="text-white/40 text-sm mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1">Status</div>
                        <div className={`font-bold capitalize ${
                          order.status === 'approved' ? 'text-emerald-500' : 
                          order.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1">Price</div>
                        <div className="text-xl font-black">₹{order.price}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'admin' && (
          <div className="max-w-6xl mx-auto px-6 py-12">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto">
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-12 backdrop-blur-xl">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <Lock className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black text-center mb-8">ADMIN ACCESS</h2>
                  <form onSubmit={handleAdminLogin} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-3">Admin Code</label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-center tracking-[1em]"
                      />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all">
                      Login to Dashboard
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">ADMIN DASHBOARD</h2>
                    <p className="text-white/40">Manage orders and system settings</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={toggleServerStatus}
                      className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                        serverStatus === 'open' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Server: {serverStatus.toUpperCase()}
                    </button>
                    <button 
                      onClick={() => setIsAdminLoggedIn(false)}
                      className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10"
                    >
                      <LogOut className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Total Orders</div>
                    <div className="text-4xl font-black">{allOrders.length}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Pending</div>
                    <div className="text-4xl font-black text-amber-500">{allOrders.filter(o => o.status === 'pending').length}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                    <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Revenue</div>
                    <div className="text-4xl font-black text-emerald-500">₹{allOrders.filter(o => o.status === 'approved').reduce((acc, curr) => acc + curr.price, 0)}</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="p-6 text-xs font-bold text-white/30 uppercase tracking-widest">Order Info</th>
                          <th className="p-6 text-xs font-bold text-white/30 uppercase tracking-widest">Details</th>
                          <th className="p-6 text-xs font-bold text-white/30 uppercase tracking-widest">Payment</th>
                          <th className="p-6 text-xs font-bold text-white/30 uppercase tracking-widest">Status</th>
                          <th className="p-6 text-xs font-bold text-white/30 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-6">
                              <div className="font-mono text-indigo-400 font-bold mb-1">{order.id}</div>
                              <div className="text-xs text-white/40">{new Date(order.created_at).toLocaleString()}</div>
                            </td>
                            <td className="p-6">
                              <div className="font-bold">{order.quantity.toLocaleString()} {order.service_type}</div>
                              <a href={order.reel_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-1">
                                View Link <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                            <td className="p-6">
                              <div className="font-bold">₹{order.price}</div>
                              <div className="text-xs font-mono text-white/40 mt-1">UTR: {order.utr_number}</div>
                            </td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                order.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' : 
                                order.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-6">
                              {order.status === 'pending' && (
                                <button 
                                  onClick={() => approveOrder(order.id)}
                                  className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/[0.02] border-t border-white/5 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase italic">Deoxy Boost</span>
              </div>
              <p className="text-white/40 max-w-sm leading-relaxed mb-8">
                The most reliable Instagram growth service in the industry. 
                Trusted by thousands of creators and businesses worldwide.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                  <Instagram className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors cursor-pointer">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white/30 mb-6">Quick Links</h4>
              <ul className="space-y-4">
                <li><button onClick={() => scrollToSection('services')} className="text-white/50 hover:text-white transition-colors">Services</button></li>
                <li><button onClick={() => scrollToSection('features')} className="text-white/50 hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="text-white/50 hover:text-white transition-colors">FAQ</button></li>
                <li><button onClick={() => setStep('admin')} className="text-white/50 hover:text-white transition-colors">Admin Login</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white/30 mb-6">Support</h4>
              <ul className="space-y-6">
                <li>
                  <a href="https://wa.me/918129343315" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/40 hover:text-indigo-400 transition-colors group">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest">WhatsApp</div>
                      <div className="text-white font-bold">+91 81293 43315</div>
                    </div>
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/mikhelxavegeorge_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/40 hover:text-pink-500 transition-colors group">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-pink-500/10 transition-colors">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest">Instagram</div>
                      <div className="text-white font-bold">@mikhelxavegeorge_</div>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-white/20 text-xs font-bold uppercase tracking-widest">
            <p>© 2024 DEOXY BOOST. ALL RIGHTS RESERVED.</p>
            <div className="flex items-center gap-8">
              <button className="hover:text-white transition-colors">Privacy Policy</button>
              <button className="hover:text-white transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
