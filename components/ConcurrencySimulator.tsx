import React, { useState } from "react";
import { Product } from "@/src/types";
import { Play, Activity, CheckCircle, AlertTriangle, HelpCircle, RefreshCw } from "lucide-react";

interface ConcurrencySimulatorProps {
  products: any[];
  onSimulationComplete: () => void;
}

export default function ConcurrencySimulator({ products, onSimulationComplete }: ConcurrencySimulatorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("p1");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("w1");
  const [numClients, setNumClients] = useState<number>(5);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<Array<{ id: number; timestamp: string; title: string; status?: number; result?: string; isError?: boolean }>>([]);
  const [stats, setStats] = useState<{ total: number; success: number; conflict: number; others: number } | null>(null);

  // Find warehouses for selected product
  const currentProduct = products.find(p => p.id === selectedProductId);
  const availableWarehouses = currentProduct ? currentProduct.inventory : [];

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setLogs([]);
    setStats(null);

    const nowStr = () => new Date().toLocaleTimeString();
    
    // Add initial log
    setLogs(prev => [...prev, {
      id: 1,
      timestamp: nowStr(),
      title: `Simulating ${numClients} concurrent checkout requests...`
    }]);

    // Construct parallel requests on client-side to hit the API concurrently.
    const checkoutPromises = Array.from({ length: numClients }).map(async (_, index) => {
      const clientId = index + 1;
      
      // Delay slightly to ensure true network jitter
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8));

      const startTime = Date.now();
      try {
        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productId: selectedProductId,
            warehouseId: selectedWarehouseId,
            quantity: 1,
            ttlSeconds: 30 // Shorter TTL so simulation doesn't lock up stock forever
          })
        });

        const elapsed = Date.now() - startTime;
        const data = await response.json();

        return {
          clientId,
          status: response.status,
          success: response.status === 201,
          elapsed,
          data
        };
      } catch (error: any) {
        return {
          clientId,
          status: 0,
          success: false,
          elapsed: Date.now() - startTime,
          error: error.message
        };
      }
    });

    setLogs(prev => [...prev, {
      id: 2,
      timestamp: nowStr(),
      title: `Sending ${numClients} concurrent reservation requests to /api/reservations...`
    }]);

    // Dispatch all requests simultaneously!
    const results = await Promise.all(checkoutPromises);

    // Formulate result logs
    const newLogs: typeof logs = [];
    let successCount = 0;
    let conflictCount = 0;
    let otherCount = 0;

    results.forEach((res, i) => {
      let stateMsg = "";
      let isErr = false;

      if (res.status === 201) {
        successCount++;
        stateMsg = `SUCCESS (Hold Acquired: ${res.data?.reservation?.id})`;
      } else if (res.status === 409) {
        conflictCount++;
        stateMsg = `BLOCKED 409 (Race condition prevented overbook: ${res.data?.error})`;
        isErr = true;
      } else {
        otherCount++;
        stateMsg = `FAILED status ${res.status} (${res.data?.error || "Network Failure"})`;
        isErr = true;
      }

      newLogs.push({
        id: 10 + i,
        timestamp: nowStr(),
        title: `Thread #${res.clientId} (${res.elapsed}ms)`,
        status: res.status,
        result: stateMsg,
        isError: isErr
      });
    });

    setLogs(prev => [...prev, ...newLogs]);

    setStats({
      total: numClients,
      success: successCount,
      conflict: conflictCount,
      others: otherCount
    });

    setIsRunning(false);
    onSimulationComplete(); // Reload products in main UI
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Concurrent Reservation Tester</h2>
          <p className="text-xs text-gray-400 mt-0.5">Test concurrent reservation requests under load</p>
        </div>
      </div>

      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-850 leading-relaxed">
          <p className="font-semibold text-amber-900">How Concurrency Testing Works:</p>
          <ol className="list-decimal list-inside space-y-1 mt-1 font-medium">
            <li>Select a product and warehouse with low available stock (e.g. Seattle Central Hub with 1 unit left).</li>
            <li>Choose a number of parallel clients to initiate checkout simultaneously.</li>
            <li>Click "Run Concurrency Test".</li>
            <li>Observe that <strong className="text-emerald-700 font-bold">exactly one</strong> request succeeds (HTTP 201), while others are <strong className="text-rose-700 font-bold">safely blocked (HTTP 409)</strong> with zero overbooking.</li>
          </ol>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Product</label>
          <select 
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              // Reset warehouse selection to first available
              const p = products.find(x => x.id === e.target.value);
              if (p && p.inventory.length > 0) {
                setSelectedWarehouseId(p.inventory[0].warehouseId);
              }
            }}
            disabled={isRunning}
            className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 outline-none focus:ring-1 focus:ring-indigo-300 transition"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Warehouse</label>
          <select 
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            disabled={isRunning}
            className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 outline-none focus:ring-1 focus:ring-indigo-300 transition"
          >
            {availableWarehouses.map((inv: any) => (
              <option key={inv.warehouseId} value={inv.warehouseId}>
                {inv.warehouseName} ({inv.available} left)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Concurrency Clients</label>
          <select 
            value={numClients}
            onChange={(e) => setNumClients(Number(e.target.value))}
            disabled={isRunning}
            className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 outline-none focus:ring-1 focus:ring-indigo-300 transition"
          >
            <option value={2}>2 Parallel Requests</option>
            <option value={3}>3 Parallel Requests</option>
            <option value={5}>5 Parallel Requests</option>
            <option value={10}>10 Parallel Requests</option>
            <option value={15}>15 Parallel Requests</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleRunSimulation}
            disabled={isRunning || !selectedWarehouseId}
            className={`w-full py-2 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-transparent shadow-xs transition-all ${
              isRunning
                ? "bg-indigo-100 text-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xs cursor-pointer"
            }`}
            style={{ height: "35px" }}
          >
            {isRunning ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Run Concurrency Test
          </button>
        </div>
      </div>

      {/* Summary Statistics Reports */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 border border-gray-100 rounded-2xl p-4 mb-6">
          <div className="text-center p-2">
            <span className="text-[10px] text-gray-400 font-semibold uppercase block">Dispatched</span>
            <span className="text-xl font-bold text-gray-900 font-mono mt-0.5 block">{stats.total}</span>
          </div>
          <div className="text-center p-2 bg-emerald-50/40 rounded-xl border border-emerald-100/50">
            <span className="text-[10px] text-emerald-600 font-semibold uppercase block">Reservations Created</span>
            <span className="text-xl font-bold text-emerald-700 font-mono mt-0.5 block">{stats.success}</span>
          </div>
          <div className="text-center p-2 bg-orange-50/40 rounded-xl border border-orange-100/50">
            <span className="text-[10px] text-orange-600 font-semibold uppercase block">Blocked (409)</span>
            <span className="text-xl font-bold text-orange-700 font-mono mt-0.5 block">{stats.conflict}</span>
          </div>
          <div className="text-center p-2">
            <span className="text-[10px] text-gray-505 font-semibold uppercase block">Concurrency Status</span>
            <span className={`text-xs font-bold mt-1.5 px-2 py-0.5 rounded-md inline-block uppercase ${
              stats.success === 1 
                ? "bg-emerald-100 text-emerald-800" 
                : stats.success === 0 
                  ? "bg-amber-100 text-amber-800" 
                  : "bg-rose-100 text-rose-800"
            }`}>
              {stats.success === 1 ? "100% Safe" : stats.success === 0 ? "Depleted" : "Unsafe (Oversold!)"}
            </span>
          </div>
        </div>
      )}

      {/* Terminal logs panel */}
      {logs.length > 0 && (
        <div className="bg-gray-950 text-gray-100 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto shadow-inner border border-gray-900 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            <span>Server terminal trace logs</span>
            <span className="animate-pulse flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
              Active capture
            </span>
          </div>

          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-gray-600 shrink-0 select-none">[{log.timestamp}]</span>
                <div className="flex-1">
                  <span className="text-indigo-400">{log.title}</span>
                  {log.result && (
                    <span className={`block pl-4 mt-0.5 font-bold ${
                      log.status === 201 
                        ? "text-emerald-400" 
                        : log.status === 409 
                          ? "text-orange-400" 
                          : "text-rose-400"
                    }`}>
                      &rarr; status {log.status}: {log.result}
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
