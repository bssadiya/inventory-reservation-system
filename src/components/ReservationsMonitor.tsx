import React, { useState, useEffect } from "react";
import { Reservation } from "../types";
import { Database, Clock, ShieldCheck, XCircle, RefreshCw, AlertCircle, Trash2 } from "lucide-react";

interface ReservationsMonitorProps {
  reservations: any[];
  onResetDatabase?: () => void;
  isActionLoading: boolean;
  hideResetButton?: boolean;
}

export default function ReservationsMonitor({ 
  reservations, 
  onResetDatabase,
  isActionLoading,
  hideResetButton = false
}: ReservationsMonitorProps) {
  const [ticks, setTicks] = useState<number>(0);

  useEffect(() => {
    // Tick every 1 second to update all active reservation count timers
    const interval = setInterval(() => {
      setTicks(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-bold font-mono uppercase tracking-wider animate-pulse">
            <Clock className="h-3 w-3 animate-spin duration-3000" />
            Pending
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold font-mono uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3" />
            Confirmed
          </span>
        );
      case "released":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-xs font-semibold font-mono uppercase tracking-wider">
            <XCircle className="h-3 w-3" />
            Released
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold font-mono uppercase tracking-wider">
            <XCircle className="h-3 w-3" />
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-150 border border-gray-250 text-gray-600 text-xs font-semibold uppercase font-mono tracking-wider">
            {status}
          </span>
        );
    }
  };

  const calculateTimeLeft = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = new Date().getTime();
    const secs = Math.max(0, Math.round((expiresAt - now) / 1000));
    
    if (secs <= 0) return "Expired / Idle";
    return `${Math.floor(secs / 60)}m ${secs % 60}s left`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gray-50 text-gray-600 rounded-xl">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reservations Database Monitor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Real-time database updates and active stock reservations</p>
          </div>
        </div>

        {/* Database Seed Reset */}
        {!hideResetButton && onResetDatabase && (
          <button
            onClick={onResetDatabase}
            disabled={isActionLoading}
            className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition flex items-center gap-2"
          >
            {isActionLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Reset &amp; Seed Database
          </button>
        )}
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-100 rounded-2xl">
          <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-800">No Active Reservations</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Create a reservation or run the concurrent tester to populate entries.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <table className="w-full text-left text-sm text-gray-500 whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Warehouse Location</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Time Remaining</th>
                <th className="px-6 py-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {reservations.map((r) => {
                const isPending = r.status.toLowerCase() === "pending";
                const isTimerExpired = new Date(r.expiresAt).getTime() < new Date().getTime();
                const actualStatus = isPending && isTimerExpired ? "expired" : r.status.toLowerCase();

                return (
                  <tr 
                    key={r.id} 
                    className={`transition-all ${
                      isPending && !isTimerExpired 
                        ? "bg-amber-50/10 hover:bg-amber-50/20" 
                        : "hover:bg-gray-50/30"
                    }`}
                  >
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">
                      {r.id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800 block">{r.productName}</span>
                      <span className="text-[10px] text-gray-400">ID: {r.productId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-700 block">{r.warehouseName}</span>
                      <span className="text-[10px] text-gray-400">ID: {r.warehouseId}</span>
                    </td>
                    <td className="px-6 py-4 text-center sm:text-left">
                      <span className="font-mono font-bold text-gray-800">{r.quantity}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold">
                      {actualStatus === "pending" ? (
                        <span className="text-amber-600 font-bold">
                          {calculateTimeLeft(r.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Ended</span>
                      )}
                    </td>
                    <td className="px-6 py-4 pr-6">
                      {getStatusBadge(actualStatus)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
