import React, { useState, useEffect } from "react";
import { Product, Warehouse, Reservation } from "./types";
import ProductCard from "./components/ProductCard";
import CheckoutView from "./components/CheckoutView";
import ConcurrencySimulator from "./components/ConcurrencySimulator";
import ReservationsMonitor from "./components/ReservationsMonitor";
import LoginView from "./components/LoginView";
import { 
  ShieldCheck, 
  Layers, 
  Activity, 
  HelpCircle, 
  Shuffle, 
  Sparkles, 
  AlertCircle,
  X,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShoppingBag,
  Database,
  Terminal,
  Cpu,
  BookOpen,
  MapPin,
  LogOut,
  Globe
} from "lucide-react";

export default function App() {
  // Session Access States powered by LocalStorage
  const [currentRole, setCurrentRole] = useState<'customer' | 'admin' | 'dev' | null>(() => {
    return (localStorage.getItem("aura_med_role") as any) || null;
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("aura_med_email") || null;
  });
  
  // Simulated relative paths
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const role = localStorage.getItem("aura_med_role");
    if (role === 'admin') return "/dashboard/admin";
    if (role === 'dev') return "/dashboard/dev";
    return "/dashboard/customer";
  });

  const [products, setProducts] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [activeReservation, setActiveReservation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'checkout'>('list');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(8);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Custom Alert / Toast systems
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: "" });

  const handleLogin = (role: 'customer' | 'admin' | 'dev', email: string) => {
    localStorage.setItem("aura_med_role", role);
    localStorage.setItem("aura_med_email", email);
    setCurrentRole(role);
    setUserEmail(email);
    if (role === 'admin') {
      setCurrentPath("/dashboard/admin");
    } else if (role === 'dev') {
      setCurrentPath("/dashboard/dev");
    } else {
      setCurrentPath("/dashboard/customer");
    }
    triggerAlert('success', `Welcome back, ${email}. Redirected to authorization workspace.`);
  };

  const handleLogout = () => {
    localStorage.removeItem("aura_med_role");
    localStorage.removeItem("aura_med_email");
    setCurrentRole(null);
    setUserEmail(null);
    setActiveReservation(null);
    setViewMode('list');
    triggerAlert('success', "Session safely logged out.");
  };

  const fetchState = async () => {
    try {
      const pRes = await fetch("/api/products");
      const pData = await pRes.json();
      if (Array.isArray(pData)) {
        setProducts(pData);
      } else {
        setProducts([]);
        console.warn("Backend products fetch did not return an array:", pData);
      }

      const rRes = await fetch("/api/reservations");
      const rData = await rRes.json();
      if (Array.isArray(rData)) {
        setReservations(rData);
      } else {
        setReservations([]);
        console.warn("Backend reservations fetch did not return an array:", rData);
      }
    } catch (error) {
      console.error("Error loading application state:", error);
      setProducts([]);
      setReservations([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchState();
      setIsLoading(false);
    };
    init();

    // Set up rapid polling interval (every 2 seconds) to sync real-time stock balances 
    // and show updated timer states in products/reservation monitors!
    const poll = setInterval(fetchState, 2000);
    return () => clearInterval(poll);
  }, []);

  const triggerAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    // Keep warning visible longer, dismiss others
    if (type !== 'error') {
      setTimeout(() => {
        setAlert(prev => prev.message === message ? { type: null, message: "" } : prev);
      }, 5000);
    }
  };

  const handleReserve = async (productId: string, warehouseId: string, quantity: number, ttlSeconds: number) => {
    setIsActionLoading(true);
    setAlert({ type: null, message: "" });
    
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity,
          ttlSeconds
        })
      });

      const data = await response.json();
      
      if (response.status === 201) {
        // Enriched reservation with model info
        const enrichedRes = {
          ...data.reservation,
          productName: products.find(p => p.id === productId)?.name,
          warehouseName: products.find(p => p.id === productId)?.inventory.find((i: any) => i.warehouseId === warehouseId)?.warehouseName
        };

        setActiveReservation(enrichedRes);
        setViewMode('checkout');
        triggerAlert('success', `Stock reserved successfully for ${ttlSeconds} seconds. Complete your checkout below.`);
      } else if (response.status === 409) {
        triggerAlert('error', data.error || "Not enough stock available");
      } else {
        triggerAlert('error', `Reservation failed: ${data.error || "Unknown error"}`);
      }

      await fetchState();
    } catch (err: any) {
      triggerAlert('error', `Communication error: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmReservation = async (reservationId: string, useIdempotency: boolean, key?: string) => {
    setIsActionLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (useIdempotency && key) {
        headers["Idempotency-Key"] = key;
      }

      const response = await fetch(`/api/reservations/${reservationId}/confirm`, {
        method: "POST",
        headers
      });

      const body = await response.json();
      
      // Keep state in checkout view so it renders logs, but trigger visual alert
      if (response.status >= 200 && response.status < 300) {
        triggerAlert('success', body.message || "Order confirmed! Stock successfully allocated.");
      } else if (response.status === 410) {
        triggerAlert('error', "Reservation expired");
      } else {
        triggerAlert('error', body.error || "Could not confirm reservation");
      }

      await fetchState();
      return { status: response.status, body };
    } catch (err: any) {
      triggerAlert('error', `Network error confirming order: ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReleaseReservation = async (reservationId: string) => {
    setIsActionLoading(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const body = await response.json();

      if (response.ok) {
        triggerAlert('success', body.message || "Reservation manually released. Stock replenished.");
      } else {
        triggerAlert('error', `Failed to release: ${body.error || "Unknown server error"}`);
      }

      await fetchState();
      return { status: response.status, body };
    } catch (err: any) {
      triggerAlert('error', `Network error canceling reservation: ${err.message}`);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsActionLoading(true);
    setAlert({ type: null, message: "" });
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        triggerAlert('success', "Inventory and reservations reset to initial state.");
        setActiveReservation(null);
        setViewMode('list');
        await fetchState();
      } else {
        triggerAlert('error', "Failed resetting database: " + data.message);
      }
    } catch (err: any) {
      triggerAlert('error', "Reset database error: " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-16 flex flex-col justify-between">
        {/* Minimal elegant branding header */}
        <header className="bg-white border-b border-gray-150 h-14 flex items-center shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs tracking-wider shadow-sm">
                IR
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-gray-900 block leading-none">AuraMed Hub</span>
                <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block mt-0.5">Inventory Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Locks Engaged
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 my-6 flex items-center justify-center">
          <LoginView onLogin={handleLogin} />
        </main>

        <footer className="text-center py-6 border-t border-gray-150/60 bg-white">
          <p className="text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">
            AuraMed Hub &bull; Sandbox Transaction Isolator &bull; v1.0.4-live
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-gray-150 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs tracking-wider shadow-sm">
              IR
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-gray-900 block leading-none">AuraMed Hub</span>
              <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block mt-0.5">Inventory Portal</span>
            </div>
          </div>

          {/* Role-Specific Navigation Links */}
          <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200/60 shadow-inner shrink-0">
            {currentRole === 'customer' && (
              <>
                <button
                  onClick={() => {
                    setViewMode('list');
                    setCurrentPath("/dashboard/customer");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode !== 'checkout'
                      ? "bg-white text-indigo-700 shadow-2xs border border-gray-150/50"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Browse Products</span>
                  <span className="md:hidden">Shop</span>
                </button>
                {activeReservation && (
                  <button
                    onClick={() => {
                      setViewMode('checkout');
                      setCurrentPath("/dashboard/customer/checkout");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'checkout'
                        ? "bg-white text-indigo-700 shadow-2xs border border-gray-150/50"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                    <span className="hidden md:inline">My Holds</span>
                    <span className="md:hidden">Holds</span>
                  </button>
                )}
              </>
            )}

            {currentRole === 'admin' && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-cyan-700 bg-white shadow-2xs border border-gray-200/10 rounded-lg">
                <Database className="h-3.5 w-3.5 text-cyan-600" />
                <span>Operational Control Panel</span>
              </div>
            )}

            {currentRole === 'dev' && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-pink-700 bg-white shadow-2xs border border-gray-200/10 rounded-lg">
                <Terminal className="h-3.5 w-3.5 text-pink-600" />
                <span>Developer Sandbox Console</span>
              </div>
            )}
          </div>

          {/* System status node */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] text-gray-900 font-extrabold font-mono tracking-tight leading-none uppercase">
                {currentRole === 'customer' ? 'Customer user' : currentRole === 'admin' ? 'Administrator' : 'Platform Eng'}
              </span>
              <span className="text-[9px] text-gray-450 font-mono mt-0.5 max-w-[120px] truncate">
                {userEmail}
              </span>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/60 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Locks Active
            </span>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-xl text-gray-400 hover:text-red-650 hover:bg-rose-50 border border-transparent hover:border-rose-100/30 transition cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Simulated Browser URL Bar */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-3 text-xs text-gray-400 font-mono font-bold shadow-2xs">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200/50 px-3 py-1 rounded-xl w-full max-w-4xl mx-auto shadow-inner text-[11px]">
          <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="text-emerald-700 font-extrabold uppercase text-[9px] tracking-wider shrink-0 bg-emerald-50 border border-emerald-150/15 px-1.5 py-0.5 rounded-md">secure</span>
          <span className="text-gray-400 font-medium">https://</span>
          <span className="text-slate-800 font-bold">auramed.hub.com</span>
          <span className="text-indigo-600 font-black">{currentPath}</span>
        </div>
      </div>

      {/* Main Core View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Dynamic Warning Alert Overlay / Notification Toast */}
        {alert.type && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 shadow-2xs relative justify-between max-w-4xl mx-auto animate-fade-in ${
            alert.type === 'success' 
              ? "bg-emerald-50 border-emerald-100 text-emerald-850" 
              : alert.type === 'error'
                ? "bg-rose-50 border-rose-100 text-rose-900"
                : "bg-amber-50 border-amber-100 text-amber-850"
          }`}>
            <div className="flex gap-3">
              <span className="mt-0.5">
                {alert.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : alert.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
              </span>
              <div>
                <p className="text-xs font-semibold leading-relaxed font-mono">
                  {alert.message}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setAlert({ type: null, message: "" })} 
              className="text-gray-400 hover:text-gray-600 transition p-0.5 rounded-full shrink-0"
              style={{ width: "24px", height: "24px" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-400 mt-2 font-medium">Loading stock repository...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* View Mode Router Context Selection */}
            {currentRole === 'customer' ? (
              viewMode === 'checkout' && activeReservation ? (
                <CheckoutView 
                  reservation={activeReservation}
                  onConfirm={handleConfirmReservation}
                  onRelease={handleReleaseReservation}
                  onBack={() => {
                    setViewMode('list');
                    setActiveReservation(null);
                  }}
                  isActionLoading={isActionLoading}
                />
              ) : (
                // Main Inventory Catalog Overview Panel
                <div className="space-y-8 animate-fade-in">
                  {/* Visual Section Intro heading */}
                  <div className="max-w-4xl mx-auto text-center py-4">
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full border border-indigo-100/50">
                      Product Catalog
                    </span>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-3">
                      Premium Healthcare &amp; Wellness Essentials
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto leading-relaxed">
                      Browse stock levels dynamically reserved at our local distribution centers. Secure vital medical items in your cart to guarantee stock holds during transaction review.
                    </p>
                  </div>

                  {/* Category Filtering Strip */}
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto mb-4">
                    {["All", "Sleep Wellness", "Smart Wearables", "Diagnostic Devices", "Personal Care", "Supplements", "Fitness & Wellness"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                            : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Grid listing */}
                  {(() => {
                    const filteredProducts = products.filter(p => selectedCategory === "All" || p.category === selectedCategory);
                    const totalFiltered = filteredProducts.length;
                    const slicedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                    return (
                      <>
                        {totalFiltered === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 max-w-lg mx-auto">
                            <p className="text-gray-400 text-sm font-medium">No products in this category currently.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {slicedProducts.map(p => (
                              <ProductCard 
                                key={p.id}
                                product={p}
                                onReserve={handleReserve}
                                isActionLoading={isActionLoading}
                              />
                            ))}
                          </div>
                        )}

                        {/* Highly-Polished Pagination Console */}
                        {totalFiltered > 0 && (
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-xs">
                            <div className="text-xs text-gray-500 font-medium font-mono">
                              Showing{" "}
                              <span className="font-semibold text-gray-800">
                                {Math.min((currentPage - 1) * itemsPerPage + 1, totalFiltered)}
                              </span>{" "}
                              to{" "}
                              <span className="font-semibold text-gray-800">
                                {Math.min(currentPage * itemsPerPage, totalFiltered)}
                              </span>{" "}
                              of{" "}
                              <span className="font-semibold text-gray-800">{totalFiltered}</span>{" "}
                              matching wellness items
                            </div>

                            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                              {/* Page Size Configurator */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Per Page:</span>
                                <div className="flex bg-gray-150 rounded-lg p-0.5 border border-gray-200/50">
                                  {[4, 8, 12].map((size) => (
                                    <button
                                      key={size}
                                      onClick={() => {
                                        setItemsPerPage(size);
                                        setCurrentPage(1);
                                      }}
                                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                        itemsPerPage === size
                                          ? "bg-white text-indigo-600 shadow-xs"
                                          : "text-gray-500 hover:text-gray-800"
                                      }`}
                                    >
                                      {size}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Pagination Navigation */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                  disabled={currentPage === 1}
                                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
                                >
                                  Prev
                                </button>

                                {Array.from({ length: Math.ceil(totalFiltered / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                      currentPage === page
                                        ? "bg-indigo-600 text-white shadow-xs"
                                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                ))}

                                <button
                                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalFiltered / itemsPerPage)))}
                                  disabled={currentPage === Math.ceil(totalFiltered / itemsPerPage) || Math.ceil(totalFiltered / itemsPerPage) === 0}
                                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                }
                </div>
              )
            ) : currentRole === 'admin' ? (
              /* Administrative Fulfillment Dashboard */
              (() => {
                let totalSkus = products.length;
                let totalAvailableStock = 0;
                let totalHeldReservations = reservations.filter(r => {
                  const isPending = r.status?.toLowerCase() === 'pending';
                  const isTimerExpired = new Date(r.expiresAt).getTime() < new Date().getTime();
                  return isPending && !isTimerExpired;
                }).reduce((sum, r) => sum + r.quantity, 0);
                
                let totalFulfilledOrders = reservations.filter(r => r.status?.toLowerCase() === 'confirmed').length;

                products.forEach(p => {
                  p.inventory.forEach((inv: any) => {
                    totalAvailableStock += inv.available;
                  });
                });

                return (
                  <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
                    {/* Admin Hero */}
                    <div className="text-center py-4">
                      <span className="bg-cyan-50 text-cyan-700 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full border border-cyan-100">
                        Fulfillment Dashboard
                      </span>
                      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-3">
                        Regional Stock &amp; Order Operations
                      </h1>
                      <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto leading-relaxed">
                        Track live clinical warehouse locks, monitor active reservations, and view distribution metrics across regional fulfillment networks.
                      </p>
                    </div>

                    {/* Operational KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-2xs">
                        <span className="text-[10px] text-gray-450 font-bold uppercase tracking-wider block">Tracked Catalog SKUs</span>
                        <span className="text-2xl font-extrabold text-gray-900 mt-1 block">{totalSkus} items</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block mt-1">&bull; Synced with lock service</span>
                      </div>
                      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-2xs">
                        <span className="text-[10px] text-gray-450 font-bold uppercase tracking-wider block">Reservable Stock Units</span>
                        <span className="text-2xl font-extrabold text-gray-900 mt-1 block">{totalAvailableStock} counts</span>
                        <span className="text-[10px] text-indigo-600 font-semibold block mt-1">&bull; Across all local hubs</span>
                      </div>
                      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-2xs bg-amber-50/10">
                        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Pushed Holding Locks</span>
                        <span className="text-2xl font-extrabold text-amber-700 mt-1 block font-mono">{totalHeldReservations} items</span>
                        <span className="text-[10px] text-amber-550 font-semibold block mt-1">&bull; Auto-purging in active carts</span>
                      </div>
                      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-2xs bg-emerald-50/10">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Fulfilled Deliveries</span>
                        <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{totalFulfilledOrders} orders</span>
                        <span className="text-[10px] text-emerald-600 font-semibold block mt-1">&bull; Double-selling safety active</span>
                      </div>
                    </div>

                    {/* Warehouse Distribution Allocation Status */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-gray-900">Regional Distribution Stock Ledger</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Real-time transactional stock values across Seattle (w1), Boston (w2), and Chicago (w3) warehouses</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 text-gray-450 font-bold uppercase text-[9px] tracking-wider border-b border-gray-100">
                            <tr>
                              <th className="px-5 py-3.5">Product Name</th>
                              <th className="px-5 py-3.5">Category</th>
                              <th className="px-5 py-3.5 text-center">Seattle Hub (w1)</th>
                              <th className="px-5 py-3.5 text-center">Boston Hub (w2)</th>
                              <th className="px-5 py-3.5 text-center">Chicago Hub (w3)</th>
                              <th className="px-5 py-3.5 text-right font-bold">Allocation Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                            {products.map(p => {
                              const w1 = p.inventory.find((i: any) => i.warehouseId === 'w1');
                              const w2 = p.inventory.find((i: any) => i.warehouseId === 'w2');
                              const w3 = p.inventory.find((i: any) => i.warehouseId === 'w3');
                              const totalLeft = p.inventory.reduce((sum: number, i: any) => sum + i.available, 0);

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition duration-150">
                                  <td className="px-5 py-4">
                                    <span className="font-bold text-gray-900 block">{p.name}</span>
                                    <span className="text-[9px] text-gray-400 block font-mono">SKU: {p.id} &bull; ${p.price}</span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200/50">{p.category}</span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    {w1 ? (
                                      <div className="flex flex-col items-center">
                                        <span className={`font-bold font-mono text-sm ${w1.available === 0 ? 'text-red-500 font-extrabold' : w1.available <= 2 ? 'text-amber-600 font-black' : 'text-slate-800'}`}>{w1.available}</span>
                                        <span className="text-[9px] text-gray-400">held: {w1.reserved}</span>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    {w2 ? (
                                      <div className="flex flex-col items-center">
                                        <span className={`font-bold font-mono text-sm ${w2.available === 0 ? 'text-red-500 font-extrabold' : w2.available <= 2 ? 'text-amber-600 font-black' : 'text-slate-800'}`}>{w2.available}</span>
                                        <span className="text-[9px] text-gray-400">held: {w2.reserved}</span>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    {w3 ? (
                                      <div className="flex flex-col items-center">
                                        <span className={`font-bold font-mono text-sm ${w3.available === 0 ? 'text-red-500 font-extrabold' : w3.available <= 2 ? 'text-amber-600 font-black' : 'text-slate-800'}`}>{w3.available}</span>
                                        <span className="text-[9px] text-gray-400">held: {w3.reserved}</span>
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    {totalLeft === 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-50 text-red-655 uppercase tracking-wider border border-red-100/50">Depleted</span>
                                    ) : totalLeft <= 5 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 uppercase tracking-wider border border-amber-100/50 animate-pulse">Low Supply</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-100/50">In Stock</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Operational Order Holds list without dev-only restore controls */}
                    <div className="bg-white rounded-2xl border border-gray-200">
                      <ReservationsMonitor 
                        reservations={reservations}
                        isActionLoading={isActionLoading}
                        hideResetButton={true}
                      />
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Developer Sandbox & Concurrency Lab Environment */
              <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
                <div className="text-center py-4">
                  <span className="bg-pink-50 text-pink-700 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full border border-pink-100">
                    Engine Testing Console
                  </span>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
                    Developer Concurrency Lab &amp; Diagnostics
                  </h1>
                  <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto leading-relaxed">
                    Evaluate transactional safety limits under deep parallel contentions. Clear database lock caches and verify strict overbooking prevention metrics.
                  </p>
                </div>

                {/* Database commands and isolation proofs section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Direct Action Buttons Card */}
                  <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md uppercase tracking-wide mb-3 border border-pink-100">
                        Admin Trigger
                      </span>
                      <h3 className="text-base font-bold text-gray-900">Database Cold Reset</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Immediately purges all live pending active reservations, restores original warehouse values, and resets state clocks. Seattle is seeded with exactly 1 unit left to make contentions easy to lock.
                      </p>
                    </div>

                    <button
                      onClick={handleResetDatabase}
                      disabled={isActionLoading}
                      className="mt-6 w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-2 shadow-2xs hover:shadow cursor-pointer"
                    >
                      {isActionLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Reset &amp; Seed Database
                    </button>
                  </div>

                  {/* Right Column: Locking Isolation Blueprints Proof Sheet */}
                  <div className="lg:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-y-2 translate-x-2">
                      <Cpu className="h-56 w-56 text-white" />
                    </div>
                    
                    <div className="relative z-10">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
                        <Cpu className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                        Memory Isolation Architecture
                      </span>
                      <h3 className="text-base font-bold text-white">How Overbooking is Solved</h3>
                      <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                        To guarantee safe concurrent locks without double-selling, AuraMed Hub employs an fully atomic **Product-specific Local Mutex Lock** queue.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                          <span className="font-mono text-indigo-300 font-bold block text-[10px] uppercase">1. Thread Block</span>
                          <p className="text-[10px] text-gray-300 mt-1 leading-normal">Concurrent checkout tries wait sequentially so stock is checked accurately in Isolation.</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                          <span className="font-mono text-indigo-300 font-bold block text-[10px] uppercase">2. TTL Sweep</span>
                          <p className="text-[10px] text-gray-300 mt-1 leading-normal">Uncompleted pending holds are auto-returned in background tick sweeper threads.</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
                          <span className="font-mono text-indigo-300 font-bold block text-[10px] uppercase">3. Idempotent key</span>
                          <p className="text-[10px] text-gray-300 mt-1 leading-normal">Clients duplicate clicks are recognized instantly via hash headers to ignore repeats.</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 mt-5 flex items-center gap-2 text-[9px] text-indigo-300 font-bold uppercase tracking-wider font-mono">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Full Academic Concurrency Compliant</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Thread Client Sender Console */}
                <div className="bg-white rounded-2xl border border-gray-200">
                  <ConcurrencySimulator 
                    products={products}
                    onSimulationComplete={fetchState}
                  />
                </div>

                {/* Complete Reservations Monitor showing diagnostic controls */}
                <div className="bg-white rounded-2xl border border-gray-200">
                  <ReservationsMonitor 
                    reservations={reservations}
                    onResetDatabase={handleResetDatabase}
                    isActionLoading={isActionLoading}
                    hideResetButton={false}
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
