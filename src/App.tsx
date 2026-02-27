import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  Instagram, 
  Zap, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  QrCode, 
  ExternalLink,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Lock,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  CheckCircle,
  MessageCircle,
  Globe,
  Sparkles,
  BarChart3,
  ChevronDown
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Package {
  id: string;
  service_type: string;
  quantity: number;
  price: number;
  popular?: boolean;
  isNew?: boolean;
  features: string[];
}

interface Order {
  id: string;
  service_type: string;
  package_id: string;
  quantity: number;
  price: number;
  reel_url: string;
  utr_number: string;
  status: 'pending' | 'approved';
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isNew?: boolean;
}

const SERVICES: Service[] = [
  { id: 'views', name: 'Reel Views', icon: <TrendingUp className="w-5 h-5" />, description: 'Boost your view count instantly' },
  { id: 'likes', name: 'Reel Likes', icon: <CheckCircle2 className="w-5 h-5" />, description: 'Get more likes on your reels' },
  { id: 'reposts', name: 'Reel Reposts', icon: <RefreshCcw className="w-5 h-5" />, description: 'Increase your reel shares', isNew: true },
  { id: 'shares', name: 'Reel Shares', icon: <ArrowRight className="w-4 h-4" />, description: 'Spread your content further' },
  { id: 'story_views', name: 'Story Views', icon: <Instagram className="w-5 h-5" />, description: 'Boost your story engagement' },
];

const PACKAGES: Package[] = [
  // Views
  { id: 'views_test', service_type: 'views', quantity: 1000, price: 10, features: ['Test Package', 'High Quality Views', 'Fast Delivery'] },
  { id: 'views_basic', service_type: 'views', quantity: 100000, price: 99, features: ['High Quality Views', 'Fast Delivery', 'No Password Required'] },
  { id: 'views_pro', service_type: 'views', quantity: 500000, price: 199, popular: true, features: ['Premium Views', 'Instant Start', 'Refill Guarantee'] },
  { id: 'views_viral', service_type: 'views', quantity: 1000000, price: 349, features: ['Viral Potential', 'Gradual Delivery', 'Lifetime Warranty'] },
  // Likes
  { id: 'likes_1k', service_type: 'likes', quantity: 1000, price: 69, features: ['Real Likes', 'Fast Delivery', 'Safe & Secure'] },
  { id: 'likes_10k', service_type: 'likes', quantity: 10000, price: 199, popular: true, features: ['High Quality Likes', 'Instant Start', 'Refill Guarantee'] },
  { id: 'likes_100k', service_type: 'likes', quantity: 100000, price: 999, features: ['Massive Engagement', 'Gradual Delivery', 'Priority Support'] },
  // Reposts
  { id: 'reposts_1k', service_type: 'reposts', quantity: 1000, price: 249, isNew: true, features: ['Real Reposts', 'Fast Delivery', 'Safe & Secure'] },
  { id: 'reposts_10k', service_type: 'reposts', quantity: 10000, price: 799, isNew: true, features: ['Massive Reach', 'Instant Start', 'Refill Guarantee'] },
  // Shares
  { id: 'shares_10k', service_type: 'shares', quantity: 10000, price: 99, features: ['Real Shares', 'Fast Delivery', 'Safe & Secure'] },
  { id: 'shares_100k', service_type: 'shares', quantity: 100000, price: 399, features: ['Viral Potential', 'Instant Start', 'Refill Guarantee'] },
  // Story Views
  { id: 'story_1k', service_type: 'story_views', quantity: 1000, price: 149, features: ['Real Story Views', 'Fast Delivery', 'Safe & Secure'] },
  { id: 'story_10k', service_type: 'story_views', quantity: 10000, price: 399, features: ['High Engagement', 'Instant Start', 'Refill Guarantee'] },
];

const ADMIN_CODE = "2563123456789";

export default function App() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [reelUrl, setReelUrl] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [step, setStep] = useState<'selection' | 'details' | 'payment' | 'success' | 'admin' | 'history'>('selection');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'approved'>('pending');
  const [serverStatus, setServerStatus] = useState<'open' | 'closed'>('open');
  const [isServerStatusLoading, setIsServerStatusLoading] = useState(true);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminInputCode, setAdminInputCode] = useState('');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // AI Trends State
  const [trends, setTrends] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const fetchServerStatus = async () => {
    try {
      const healthRes = await fetch('/api/health').catch(() => null);
      if (!healthRes || !healthRes.ok) {
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

  const fetchUserHistory = async () => {
    const savedIds = JSON.parse(localStorage.getItem('dib_order_ids') || '[]');
    if (savedIds.length === 0) {
      setUserOrders([]);
      return;
    }

    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: savedIds })
      });
      const data = await res.json();
      setUserOrders(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();

    const fetchTrends = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "List 5 trending Instagram hashtags and 3 trending audio themes for today in India. Keep it very short, comma separated.",
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        if (response.text) {
          setTrends(response.text.split(',').map(t => t.trim()));
        }
      } catch (err) {
        setTrends(['#viral', '#trending', '#instagram', '#explore', '#reelsindia']);
      }
    };
    fetchTrends();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'success' && currentOrderId && orderStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${currentOrderId}`);
          const data = await res.json();
          if (data.status === 'approved') {
            setOrderStatus('approved');
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Status check failed", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [step, currentOrderId, orderStatus]);

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    setStep('details');
  };

  const validateUrl = (url: string) => {
    if (selectedService?.id === 'story_views') {
      const storyRegex = /(https?:\/\/)?(www\.)?instagram\.com\/stories\/([A-Za-z0-9._-]+)\/([0-9]+)/;
      return storyRegex.test(url);
    }
    const instagramRegex = /(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/;
    return instagramRegex.test(url);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(reelUrl)) {
      setError(`Please enter a valid Instagram ${selectedService?.id === 'story_views' ? 'Story' : 'Reel'} URL`);
      return;
    }
    setError('');
    
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
      setError('Connection error. Please ensure the server is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInputCode === ADMIN_CODE) {
      setIsAdminLoggedIn(true);
      fetchAdminOrders();
    } else {
      setError('Invalid Admin Code');
    }
  };

  const fetchAdminOrders = async () => {
    setIsAdminLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-admin-code': ADMIN_CODE }
      });
      const data = await res.json();
      setAdminOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const approveOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/approve`, {
        method: 'PATCH',
        headers: { 'x-admin-code': ADMIN_CODE }
      });
      if (res.ok) {
        fetchAdminOrders();
      }
    } catch (err) {
      console.error(err);
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

  if (isServerStatusLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (serverStatus === 'closed' && step !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-6 max-w-md">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <Clock className="w-12 h-12 text-indigo-500 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Server Closed</h1>
          <p className="text-xl text-white/60 leading-relaxed">
            Server will be opened from <span className="text-indigo-400 font-bold">4 PM to 12 AM IST</span>
          </p>
        </div>

        <button 
          onClick={() => {
            setStep('admin');
            setError('');
          }}
          className="fixed bottom-6 left-6 flex items-center gap-2 text-[10px] font-semibold text-white/20 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg bg-white/5"
        >
          <Lock className="w-3 h-3" /> Admin Panel
        </button>
      </div>
    );
  }

  const scrollToSection = (id: string) => {
    if (step !== 'selection') {
      setStep('selection');
      setSelectedService(null);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('selection')}>
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                DeoxyInstaBoost
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">How it works</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button>
            <button 
              onClick={() => {
                setStep('history');
                fetchUserHistory();
              }} 
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" /> My Orders
            </button>
            <a href="https://wa.me/918129343315" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> Support
            </a>
          </nav>
          <button onClick={() => scrollToSection('pricing')} className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all active:scale-95 select-none">
            Get Started
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
                  Go Viral with <span className="text-indigo-500">Premium</span> Services
                </h1>
                <p className="text-lg text-white/50">
                  Select a service to boost your Instagram presence instantly.
                </p>
                
                <div className="pt-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <Globe className="w-3 h-3 text-indigo-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Live Web Trends:</span>
                    <div className="flex gap-3 overflow-hidden">
                      <div className="flex gap-3 animate-marquee whitespace-nowrap">
                        {trends.map((trend, i) => (
                          <span key={i} className="text-[10px] text-white/60 font-medium">{trend}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="how-it-works" className="py-12 space-y-12">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">How It Works</h2>
                  <p className="text-white/40">Boost your profile in 3 simple steps</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { step: '01', title: 'Select Service', desc: 'Choose from Views, Likes, or Shares to find the perfect boost for your content.', icon: <LayoutDashboard className="w-6 h-6 text-indigo-500" /> },
                    { step: '02', title: 'Enter Details', desc: 'Provide your Reel or Story URL. Our AI will analyze it to ensure maximum viral impact.', icon: <Instagram className="w-6 h-6 text-purple-500" /> },
                    { step: '03', title: 'Secure Payment', desc: 'Pay securely via UPI or Crypto. Your order starts processing instantly after verification.', icon: <ShieldCheck className="w-6 h-6 text-emerald-500" /> }
                  ].map((item, i) => (
                    <div key={i} className="relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="absolute -top-4 -left-4 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-indigo-600/20">
                        {item.step}
                      </div>
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                        {item.icon}
                      </div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                      <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div id="pricing" className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold">Our Services</h2>
                  <p className="text-white/40">Premium quality engagement at unbeatable prices</p>
                </div>
                
                {!selectedService ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {SERVICES.map((service) => (
                    <motion.div
                      key={service.id}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedService(service)}
                      className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group"
                    >
                      {service.isNew && (
                        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-indigo-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          New
                        </div>
                      )}
                      <div className="space-y-4 text-center">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto group-hover:bg-indigo-500/20 transition-colors">
                          {service.icon}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold">{service.name}</h3>
                          <p className="text-[10px] text-white/40">{service.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedService(null)}
                      className="text-white/40 hover:text-white flex items-center gap-2 text-sm transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to Services
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      {selectedService.icon}
                      <span className="text-sm font-bold text-indigo-400">{selectedService.name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PACKAGES.filter(p => p.service_type === selectedService.id).map((pkg) => (
                      <motion.div
                        key={pkg.id}
                        whileHover={{ y: -8 }}
                        className={cn(
                          "relative p-8 rounded-3xl border transition-all duration-300 group cursor-pointer select-none",
                          pkg.popular 
                            ? "bg-white/5 border-indigo-500/50 shadow-2xl shadow-indigo-500/10" 
                            : "bg-white/[0.02] border-white/10 hover:border-white/20"
                        )}
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                            Most Popular
                          </div>
                        )}
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-white/60 font-medium uppercase tracking-widest text-xs">{selectedService.name} Package</h3>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold">{pkg.quantity.toLocaleString()}</span>
                              <span className="text-white/40 font-medium">{selectedService.name.split(' ')[1]}</span>
                            </div>
                          </div>
                          <div className="text-3xl font-bold">₹{pkg.price}</div>
                          <ul className="space-y-3">
                            {pkg.features.map((feature, i) => (
                              <li key={i} className="flex items-center gap-3 text-sm text-white/60">
                                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <button className={cn(
                            "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                            pkg.popular 
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white" 
                              : "bg-white/10 hover:bg-white/20 text-white"
                          )}>
                            Select Package <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/5">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Zap className="w-6 h-6 text-yellow-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Instant Delivery</h4>
                    <p className="text-sm text-white/40">Views start appearing within minutes of your order.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Safe & Secure</h4>
                    <p className="text-sm text-white/40">No password required. 100% safe for your account.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Clock className="w-6 h-6 text-indigo-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">24/7 Support</h4>
                    <p className="text-sm text-white/40">Our team is always here to help with your order.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto space-y-8"
            >
              <button 
                onClick={() => setStep('selection')}
                className="text-white/40 hover:text-white flex items-center gap-2 text-sm transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Packages
              </button>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Order Details</h2>
                <p className="text-white/50">Enter the link to your Instagram {selectedService?.name.includes('Story') ? 'Story' : 'Reel'}.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                      {selectedService?.icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{selectedPackage?.quantity.toLocaleString()} {selectedService?.name.split(' ')[1]}</div>
                      <div className="text-xs text-white/40">{selectedService?.name} Package</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold">₹{selectedPackage?.price}</div>
                </div>

                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60 ml-1">Instagram {selectedService?.name.includes('Story') ? 'Story' : 'Reel'} URL</label>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="url"
                        placeholder={selectedService?.name.includes('Story') ? "https://www.instagram.com/stories/..." : "https://www.instagram.com/reel/..."}
                        className={cn(
                          "w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                          error && "border-red-500/50 focus:ring-red-500/50"
                        )}
                        value={reelUrl}
                        onChange={(e) => setReelUrl(e.target.value)}
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-red-400 text-xs flex items-center gap-1 ml-1">
                        <AlertCircle className="w-3 h-3" /> {error}
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    disabled={isAnalyzing}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 select-none active:scale-[0.98]"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                        AI Analyzing Content...
                      </>
                    ) : (
                      <>Continue to Payment <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>

              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3"
                >
                  <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">AI Insights</div>
                    <p className="text-xs text-emerald-200/70 leading-relaxed italic">
                      "{analysis}"
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-200/70 leading-relaxed">
                  Make sure your account is <strong>Public</strong>. We cannot deliver views to private accounts. Delivery usually starts within 5-15 minutes.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Complete Payment</h2>
                <p className="text-white/50">Scan the QR code to pay via UPI</p>
              </div>

              <div className="bg-[#111] p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 flex flex-col items-center gap-8 border border-white/5">
                <div className="relative p-4 bg-white rounded-3xl border-4 border-indigo-500/20 overflow-hidden group">
                  <QRCodeSVG 
                    value={`upi://pay?pa=8129343315@fam&pn=DeoxyInstaBoost&am=${selectedPackage?.price}&cu=INR`}
                    size={240}
                    level="H"
                    includeMargin={false}
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between text-white">
                    <span className="text-sm font-medium opacity-60">Total Amount</span>
                    <span className="text-2xl font-bold text-indigo-400">₹{selectedPackage?.price}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60 ml-1">UTR / Transaction ID</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="text"
                        placeholder="Enter 12-digit UTR number"
                        className={cn(
                          "w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                          error && "border-red-500/50 focus:ring-red-500/50"
                        )}
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-red-400 text-xs flex items-center gap-1 ml-1">
                        <AlertCircle className="w-3 h-3" /> {error}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                      <QrCode className="w-5 h-5 text-indigo-400" />
                      <div className="text-sm font-medium text-white/80">Scan with any UPI App</div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePaymentComplete}
                  disabled={isProcessing}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                    isProcessing 
                      ? "bg-white/10 text-white/40 cursor-not-allowed" 
                      : "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Submitting Order...
                    </>
                  ) : (
                    <>I've Completed Payment <CheckCircle2 className="w-4 h-4" /></>
                  )}
                </button>
              </div>

              <p className="text-center text-sm text-white/40">
                Payment is secure and encrypted. Need help? <a href="https://wa.me/918129343315" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Contact Support</a>
              </p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto text-center space-y-8 py-12"
            >
              <div className="relative inline-block">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500",
                    orderStatus === 'approved' 
                      ? "bg-emerald-500 shadow-emerald-500/40" 
                      : "bg-indigo-500 shadow-indigo-500/40"
                  )}
                >
                  {orderStatus === 'approved' ? (
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  ) : (
                    <Clock className="w-12 h-12 text-white animate-pulse" />
                  )}
                </motion.div>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-bold">
                  {orderStatus === 'approved' ? "Payment Approved!" : "Order Received!"}
                </h2>
                <p className="text-lg text-white/50 max-w-sm mx-auto">
                  {orderStatus === 'approved' 
                    ? "Your views will be delivered in under 30 minutes. Thank you for choosing DeoxyInstaBoost!"
                    : "Your order is pending payment approval. Once verified, your views will be delivered instantly."}
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6 text-left">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Status</span>
                    <span className={cn(
                      "font-medium flex items-center gap-2",
                      orderStatus === 'approved' ? "text-emerald-400" : "text-indigo-400"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        orderStatus === 'approved' ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                      )} />
                      {orderStatus === 'approved' ? "Approved - Delivering" : "Pending Approval"}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: '15%' }}
                      animate={{ width: orderStatus === 'approved' ? '100%' : '15%' }}
                      className={cn(
                        "h-full transition-colors duration-1000",
                        orderStatus === 'approved' ? "bg-emerald-500" : "bg-indigo-500"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Order ID</span>
                    <span className="font-mono">{currentOrderId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">UTR Number</span>
                    <span className="font-mono text-indigo-400">{utrNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Target Reel</span>
                    <a href={reelUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 flex items-center gap-1 hover:underline">
                      View Reel <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setStep('selection');
                  setReelUrl('');
                  setUtrNumber('');
                  setSelectedPackage(null);
                  setCurrentOrderId(null);
                  setOrderStatus('pending');
                }}
                className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-all"
              >
                Place Another Order
              </button>
            </motion.div>
          )}

          {step === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setStep('selection')}
                  className="text-white/40 hover:text-white flex items-center gap-2 text-sm transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back to Home
                </button>
                <h2 className="text-2xl font-bold">My Order History</h2>
              </div>

              <div className="space-y-4">
                {isHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-white/40">Loading your orders...</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                      <Clock className="w-8 h-8 text-white/20" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold">No orders found</h3>
                      <p className="text-white/40">You haven't placed any orders from this browser yet.</p>
                    </div>
                    <button 
                      onClick={() => setStep('selection')}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
                    >
                      Start Boosting
                    </button>
                  </div>
                ) : (
                  userOrders.map((order) => (
                    <div key={order.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/60">{order.id}</span>
                            <span className={cn(
                              "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                              order.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                            )}>
                              {order.status}
                            </span>
                            <span className="text-xs text-white/20">{new Date(order.created_at).toLocaleString()}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Service</div>
                              <div className="text-sm font-bold text-indigo-400">{SERVICES.find(s => s.id === order.service_type)?.name || order.service_type}</div>
                            </div>
                             <div>
                              <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Package</div>
                              <div className="text-sm font-medium">{order.quantity.toLocaleString()} {SERVICES.find(s => s.id === order.service_type)?.name.split(' ')[1] || 'Units'} (₹{order.price})</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Target Link</div>
                              <a href={order.reel_url} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white flex items-center gap-1">
                                View Link <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {step === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {!isAdminLoggedIn ? (
                <div className="max-w-md mx-auto space-y-8 text-center">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20">
                    <Lock className="w-10 h-10 text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Admin Login</h2>
                    <p className="text-white/50">Enter your secure access code to continue.</p>
                  </div>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <input 
                      type="password"
                      placeholder="Enter Admin Code"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      value={adminInputCode}
                      onChange={(e) => setAdminInputCode(e.target.value)}
                      required
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all">
                      Access Dashboard
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                        <LayoutDashboard className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
                        <p className="text-white/40 text-sm">Manage orders and verify payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={fetchAdminOrders}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <RefreshCcw className={cn("w-5 h-5", isAdminLoading && "animate-spin")} />
                      </button>
                      <button 
                        onClick={() => setIsAdminLoggedIn(false)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border",
                        serverStatus === 'open' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                      )}>
                        <Globe className={cn("w-6 h-6", serverStatus === 'open' ? "text-emerald-500" : "text-red-500")} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Server Control</h3>
                        <p className="text-white/40 text-sm">Currently {serverStatus === 'open' ? 'Accepting Orders' : 'Closed to Public'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleServerStatus}
                      className={cn(
                        "px-8 py-3 rounded-2xl font-bold transition-all shadow-lg",
                        serverStatus === 'open' 
                          ? "bg-red-600 hover:bg-red-500 text-white shadow-red-600/20" 
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      )}
                    >
                      {serverStatus === 'open' ? "Close Server" : "Open Server"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {adminOrders.length === 0 ? (
                      <div className="p-20 text-center border border-dashed border-white/10 rounded-3xl">
                        <p className="text-white/20">No orders found yet.</p>
                      </div>
                    ) : (
                      adminOrders.map((order) => (
                        <div key={order.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/60">{order.id}</span>
                              <span className={cn(
                                "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full",
                                order.status === 'approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"
                              )}>
                                {order.status}
                              </span>
                              <span className="text-xs text-white/20">{new Date(order.created_at).toLocaleString()}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              <div>
                                <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Service</div>
                                <div className="text-sm font-bold text-indigo-400">{SERVICES.find(s => s.id === order.service_type)?.name || order.service_type}</div>
                              </div>
                               <div>
                                <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Package</div>
                                <div className="text-sm font-medium">{order.quantity.toLocaleString()} {SERVICES.find(s => s.id === order.service_type)?.name.split(' ')[1] || 'Units'} (₹{order.price})</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase font-bold text-white/20 mb-1">UTR Number</div>
                                <div className="text-sm font-mono text-indigo-400">{order.utr_number}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase font-bold text-white/20 mb-1">Target Link</div>
                                <a href={order.reel_url} target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 hover:text-white flex items-center gap-1">
                                  View Link <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {order.status === 'pending' ? (
                              <button 
                                onClick={() => approveOrder(order.id)}
                                className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                              >
                                <CheckCircle className="w-4 h-4" /> Approve Payment
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 text-emerald-400 font-medium px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <CheckCircle className="w-4 h-4" /> Approved
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-16 bg-black/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-500" />
                <span className="text-xl font-bold tracking-tight">DeoxyInstaBoost</span>
              </div>
              <p className="text-sm text-white/40 max-w-xs">
                The most reliable platform to boost your social presence instantly and securely.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/80">Support & Contact</h4>
              <div className="flex flex-col gap-3">
                <a href="https://wa.me/918129343315" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/40 hover:text-indigo-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm">+91 8129343315 (WhatsApp)</span>
                </a>
                <a href="https://instagram.com/mikhelxavegeorge_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/40 hover:text-pink-500 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-pink-500/10 transition-colors">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <span className="text-sm">@mikhelxavegeorge_</span>
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/80">Links</h4>
              <div className="flex flex-wrap gap-6 text-sm text-white/40">
                <button onClick={() => setStep('admin')} className="hover:text-white transition-colors">Admin Login</button>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/20">© 2024 DeoxyInstaBoost. All rights reserved.</p>
            <div className="flex items-center gap-2 text-[10px] text-white/10 uppercase tracking-widest">
              <span>Secure Payments</span>
              <div className="w-1 h-1 bg-white/10 rounded-full" />
              <span>Instant Delivery</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
