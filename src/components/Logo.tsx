import React from 'react';
import { Shield, Car } from 'lucide-react';

export function Logo({ className = "h-12 w-auto", showText = true }: { className?: string, showText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Shield className="w-10 h-10 text-blue-600 fill-blue-50" />
        <Car className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-2xl font-black italic tracking-tighter text-slate-900 leading-none">
            AUTO<span className="text-blue-600">CHECK</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mt-1">
            Inspeção Veicular
          </span>
        </div>
      )}
    </div>
  );
}
