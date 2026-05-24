import React, { useState } from "react";
import { Product, Warehouse } from "@/src/types";
import { MapPin, Box, ShieldCheck, Clock, Settings, Heart } from "lucide-react";

interface ProductCardProps {
  key?: string | number;
  product: any; // Product with embedded inventory report
  onReserve: (productId: string, warehouseId: string, quantity: number, ttlSeconds: number) => void | Promise<void>;
  isActionLoading: boolean;
}

export default function ProductCard({ product, onReserve, isActionLoading }: ProductCardProps) {
  const [reserveQuantity, setReserveQuantity] = useState<number>(1);
  const [selectedTtl, setSelectedTtl] = useState<number>(60); // Default 60 seconds
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Category styling helper
  const getCategoryStyles = (cat?: string) => {
    const defaultStyles = "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (!cat) return defaultStyles;
    
    switch (cat) {
      case "Sleep Wellness":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "Smart Wearables":
        return "bg-cyan-50 text-cyan-700 border-cyan-100";
      case "Diagnostic Devices":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Personal Care":
        return "bg-pink-50 text-pink-700 border-pink-100";
      case "Supplements":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Fitness & Wellness":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default:
        return defaultStyles;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      {/* Product Image */}
      <div className="relative h-48 w-full bg-slate-50 overflow-hidden flex items-center justify-center">
        {/* Soft skeleton-like loading state */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
            <Heart className="h-6 w-6 text-slate-300 animate-pulse" />
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <Heart className="h-8 w-8 text-slate-300 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{product.category || "Wellness Product"}</span>
          </div>
        ) : (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-300 ${imageLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
        
        {/* Price tag */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-semibold text-gray-800 shadow-xs border border-gray-100/50">
          ${product.price}
        </div>

        {/* Category tag */}
        <div className={`absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${getCategoryStyles(product.category)}`}>
          {product.category || "Wellness"}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-base text-gray-900 tracking-tight leading-tight min-h-[40px] flex items-center">{product.name}</h3>
          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider font-mono">{product.category || "WELLNESS RESOURCE"}</p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed h-12 overflow-hidden line-clamp-3 text-ellipsis">{product.description}</p>
        </div>

        {/* Warehouse Stocks */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium tracking-wide uppercase mb-3">
            <span>Warehouse</span>
            <span>Stock Status</span>
          </div>

          <div className="space-y-3">
            {product.inventory.map((inv: any) => {
              const isOutOfStock = inv.available <= 0;
              return (
                <div 
                  key={inv.warehouseId} 
                  className={`p-3 rounded-xl border transition-all ${
                    isOutOfStock 
                      ? "bg-gray-50/50 border-gray-100" 
                      : inv.available <= 2 
                        ? "bg-amber-50/30 border-amber-100/70"
                        : "bg-gray-50/30 border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">{inv.warehouseName}</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-5">{inv.warehouseLocation}</span>
                    </div>

                    <div className="text-right">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-medium">
                          Out of stock
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500 font-medium">
                            Available: <span className="text-sm font-bold text-gray-950 font-mono">{inv.available}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            Total: {inv.total} (Reserved: {inv.reserved})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions inside the Warehouse item */}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    {/* TTL Configuration Selector */}
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-white border border-gray-100 rounded-md px-1.5 py-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span>Duration:</span>
                      <select 
                        value={selectedTtl} 
                        onChange={(e) => setSelectedTtl(Number(e.target.value))}
                        disabled={isActionLoading || isOutOfStock}
                        className="bg-transparent font-medium border-none p-0 outline-none cursor-pointer focus:ring-0 text-gray-700"
                      >
                        <option value={15}>15s (Fast)</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                        <option value={120}>2m</option>
                        <option value={600}>10m</option>
                      </select>
                    </div>

                    {/* Reserve Button */}
                    <button
                      onClick={() => onReserve(product.id, inv.warehouseId, reserveQuantity, selectedTtl)}
                      disabled={isActionLoading || isOutOfStock}
                      style={{ height: "32px" }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        isOutOfStock
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs hover:shadow-sm"
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Reserve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
