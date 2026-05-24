import React, { useState, useEffect } from "react";
import { Reservation } from "@/src/types";
import { Clock, ShieldAlert, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Send, Check } from "lucide-react";

interface CheckoutViewProps {
  reservation: any; // Reservation with additional productName and warehouseName
  onConfirm: (reservationId: string, useIdempotency: boolean, customIdempotencyKey?: string) => Promise<any>;
  onRelease: (reservationId: string) => Promise<any>;
  onBack: () => void;
  isActionLoading: boolean;
}

export default function CheckoutView({ 
  reservation, 
  onConfirm, 
  onRelease, 
  onBack,
  isActionLoading 
}: CheckoutViewProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(60);
  const [useIdempotency, setUseIdempotency] = useState<boolean>(true);
  const [customKey, setCustomKey] = useState<string>("");
  const [confirmHistory, setConfirmHistory] = useState<Array<{ time: string; status: number; message: string; idempotencyKey?: string }>>([]);
  const [apiResult, setApiResult] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isReleased, setIsReleased] = useState<boolean>(false);

  useEffect(() => {
    // Generate a stable idempotency key for this reservation session
    setCustomKey(`idemp-key-${reservation.id}-${Math.floor(Math.random() * 900) + 100}`);
    
    // Check initial parent state in case it is already done
    if (reservation.status?.toLowerCase() === 'confirmed') {
      setIsConfirmed(true);
    } else if (reservation.status?.toLowerCase() === 'released' || reservation.status?.toLowerCase() === 'expired') {
      setIsReleased(true);
    }
    
    // Calculate total duration
    const createdAt = new Date(reservation.createdAt).getTime();
    const expiresAt = new Date(reservation.expiresAt).getTime();
    const totalSecs = Math.max(1, Math.round((expiresAt - createdAt) / 1000));
    setTotalDuration(totalSecs);

    const updateTimer = () => {
      const now = new Date().getTime();
      const left = Math.max(0, Math.round((expiresAt - now) / 1000));
      setSecondsLeft(left);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 500);

    return () => clearInterval(timer);
  }, [reservation]);

  const percentage = Math.min(100, Math.max(0, (secondsLeft / totalDuration) * 100));

  const handleConfirmClick = async () => {
    setApiResult({ status: null, message: "" });
    const keyToSend = useIdempotency ? customKey : undefined;
    
    try {
      const res = await onConfirm(reservation.id, useIdempotency, keyToSend);
      const isOk = res.status >= 200 && res.status < 300;
      
      setApiResult({
        status: isOk ? 'success' : 'error',
        message: res.body.success 
          ? res.body.message || "Payment completed successfully!" 
          : res.body.error || "Failed/expired reservation check"
      });

      if (isOk) {
        setIsConfirmed(true);
      }

      // Record logs
      setConfirmHistory(prev => [
        {
          time: new Date().toLocaleTimeString(),
          status: res.status,
          message: res.body.success 
            ? res.body.message || "Reservation confirmed and checkout completed." 
            : res.body.error || "Reservation failed or expired hold.",
          idempotencyKey: keyToSend
        },
        ...prev
      ]);
    } catch (err: any) {
      setApiResult({
        status: 'error',
        message: err.message || "Network exception encountered"
      });
    }
  };

  const handleReleaseClick = async () => {
    setApiResult({ status: null, message: "" });
    try {
      const res = await onRelease(reservation.id);
      const isOk = res.status >= 200 && res.status < 300;
      setApiResult({
        status: isOk ? 'success' : 'error',
        message: isOk 
          ? (res.body.message || "Reservation cancelled and hold released.") 
          : (res.body.error || "Failed to release the reservation hold.")
      });

      if (isOk) {
        setIsReleased(true);
        // Automatically go back after a brief delay so they can read the successful flow states
        setTimeout(() => {
          onBack();
        }, 1500);
      }
    } catch (err: any) {
      setApiResult({
        status: 'error',
        message: err.message || "Network error releasing hold"
      });
    }
  };

  const isExpired = secondsLeft <= 0;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 md:p-8">
      {/* Header back link */}
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </button>

      {/* Main Reservation Card */}
      <div className="border border-indigo-100/60 bg-indigo-50/10 rounded-2xl p-5 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Stock Reserved
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight mt-2">
              Complete Checkout
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">Reservation ID: {reservation.id}</p>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-2xs self-start md:self-auto">
            <Clock className={`h-5 w-5 ${isExpired ? "text-red-500 animate-pulse" : secondsLeft < 15 ? "text-amber-500 animate-pulse" : "text-emerald-500"}`} />
            <div className="flex flex-col font-mono text-right">
              <span className={`text-lg font-bold ${isExpired ? "text-red-600" : secondsLeft < 15 ? "text-amber-600" : "text-gray-950"}`}>
                {isExpired ? "EXPIRED" : `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`}
              </span>
              <span className="text-[10px] text-gray-400 font-sans">checkout hold</span>
            </div>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="mt-5">
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              style={{ width: `${percentage}%` }}
              className={`h-full transition-all duration-500 ${
                isExpired 
                  ? "bg-red-500" 
                  : secondsLeft < 15 
                    ? "bg-amber-500" 
                    : "bg-indigo-600"
              }`}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5 uppercase font-medium tracking-wider font-sans">
            <span>Reservation Placed</span>
            <span>{isExpired ? "Expired" : `${secondsLeft}s left`}</span>
          </div>
        </div>

        {/* Product Details rows */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-5 border-t border-gray-100/80">
          <div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Product</span>
            <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{reservation.productName}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Warehouse</span>
            <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{reservation.warehouseName}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Quantity</span>
            <p className="text-sm font-bold text-indigo-700 font-mono mt-0.5">{reservation.quantity}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Duration</span>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{totalDuration}s</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Status</span>
            <p className="text-sm font-bold mt-0.5">
              {isConfirmed ? (
                <span className="text-emerald-600">Confirmed</span>
              ) : isReleased ? (
                <span className="text-gray-500">Released</span>
              ) : isExpired ? (
                <span className="text-red-500 font-semibold">Expired</span>
              ) : (
                <span className="text-amber-550 animate-pulse font-semibold">Pending</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic API Response State */}
      {apiResult.status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 mb-6 transition-all animate-fade-in ${
          apiResult.status === 'success' 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
            : "bg-amber-50 border-amber-100 text-amber-900"
        }`}>
          {apiResult.status === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-semibold text-sm">
              {apiResult.status === 'success' ? "Operation Succeeded" : "Action Failed"}
            </h4>
            <p className="text-xs mt-1 font-mono break-all font-medium">{apiResult.message}</p>
          </div>
        </div>
      )}

      {/* Secondary Controls - Idempotency Retry Tester */}
      <div className="bg-gray-50 border border-gray-200/65 rounded-2xl p-4 md:p-5 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 font-sans">
              <span>API Idempotency Controls</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Simulate high-concurrency robust checkouts. Providing a request key lets the server avoid processing duplicate orders if double-clicked.
            </p>
          </div>
          <div className="flex items-center h-5 ml-4">
            <input
              id="idempotency"
              name="idempotency"
              type="checkbox"
              checked={useIdempotency}
              onChange={(e) => setUseIdempotency(e.target.checked)}
              disabled={isExpired}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-sm cursor-pointer"
            />
          </div>
        </div>

        {useIdempotency && (
          <div className="mt-3.5 pt-3.5 border-t border-gray-200/50 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">Dynamic key payload header</label>
              <input
                type="text"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                disabled={isExpired}
                className="w-full mt-1 px-3 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg text-gray-600 outline-hidden focus:ring-1 focus:ring-indigo-300"
              />
            </div>
            
            <button
              onClick={() => setCustomKey(`idemp-key-${reservation.id}-${Math.floor(Math.random() * 900) + 100}`)}
              disabled={isExpired}
              className="px-3 py-1.5 self-end mt-4 text-[11px] font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg bg-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              New Key
            </button>
          </div>
        )}
      </div>

      {/* Expiry Warning Message */}
      {isExpired && !isConfirmed && !isReleased && (
        <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-red-900 flex items-start gap-3 mb-6 transition-all animate-fade-in">
          <Clock className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="font-semibold text-sm">Reservation Expired</h4>
            <p className="text-xs mt-1 font-medium">This reservation holding slot has expired. The stock has been returned to the available pool. Please return to the product catalog to start a new checkout.</p>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={handleConfirmClick}
          disabled={isActionLoading || isReleased || isConfirmed || isExpired}
          className={`flex-1 py-3 px-4 font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-xs hover:shadow-xs border ${
            isReleased || isExpired
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : isConfirmed
                ? "bg-emerald-600 text-white border-transparent cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent cursor-pointer"
          }`}
        >
          {isActionLoading && !isExpired ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {isReleased 
            ? "Reservation Cancelled" 
            : isConfirmed 
              ? "Reservation Confirmed" 
              : isExpired 
                ? "Reservation Expired" 
                : "Confirm & Pay"}
        </button>

        <button
          onClick={handleReleaseClick}
          disabled={isActionLoading || isConfirmed || isReleased || isExpired}
          className={`px-5 py-3 border rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isConfirmed || isReleased || isExpired
              ? "bg-gray-50 border-gray-150 text-gray-400 cursor-not-allowed"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <XCircle className="h-4 w-4 text-gray-400" />
          {isReleased ? "Cancelled" : "Cancel Reservation"}
        </button>
      </div>

      {/* Transaction Logs (History of button clicks) */}
      {confirmHistory.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">API Request Execution History</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {confirmHistory.map((h, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 flex items-start justify-between text-xs font-mono">
                <div className="flex-1 min-w-0 pr-3">
                  <span className="text-[10px] text-gray-400 block">{h.time}</span>
                  <p className="text-[11px] text-gray-800 truncate font-semibold mt-0.5">{h.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[10px] ${
                    h.status >= 200 && h.status < 300 
                      ? "bg-emerald-100 text-emerald-800" 
                      : h.status === 410 
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                  }`}>
                    HTTP {h.status}
                  </span>
                  {h.idempotencyKey && (
                    <span className="block text-[8px] text-purple-600 mt-1 truncate max-w-[120px]" title={h.idempotencyKey}>
                      🔑 {h.idempotencyKey}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
