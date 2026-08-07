import React from 'react';
import { Signal } from '../types';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

export const SignalCard: React.FC<{ signal: Signal }> = ({ signal }) => {
  const isLong = signal.direction === 'LONG';
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-3 hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center font-bold text-[10px]",
            isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          )}>
            {isLong ? 'L' : 'S'}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-slate-200">{signal.pair}</span>
              <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">{signal.timeframe}</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {signal.orderType === 'MARKET' ? 'أمر سوق' : 'أمر معلق'}
            </span>
          </div>
        </div>
        
        <div className={cn(
          "px-2 py-0.5 text-[10px] font-bold rounded",
          signal.status === 'ACTIVE' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
          signal.status === 'PENDING' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
          signal.status === 'WON' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
          "bg-slate-800 text-slate-400 border border-slate-700"
        )}>
          {signal.status === 'ACTIVE' ? 'نشطة' : 
           signal.status === 'PENDING' ? 'معلقة' : 
           signal.status === 'WON' ? 'ربح' : 'خسارة'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <div className="bg-slate-950 rounded p-1.5 flex flex-col items-center justify-center border border-slate-800/50">
          <span className="text-[9px] text-slate-500 mb-0.5">الدخول</span>
          <span className="font-mono text-xs font-semibold text-slate-300">{signal.entryPrice.toFixed(2)}</span>
        </div>
        <div className="bg-slate-950 rounded p-1.5 flex flex-col items-center justify-center border border-slate-800/50">
          <span className="text-[9px] text-emerald-500/80 mb-0.5">الهدف</span>
          <span className="font-mono text-xs font-semibold text-emerald-400">{signal.takeProfit.toFixed(2)}</span>
        </div>
        <div className="bg-slate-950 rounded p-1.5 flex flex-col items-center justify-center border border-slate-800/50">
          <span className="text-[9px] text-rose-500/80 mb-0.5">الوقف</span>
          <span className="font-mono text-xs font-semibold text-rose-400">{signal.stopLoss.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
        <span>{format(signal.timestamp, 'HH:mm - MM/dd')}</span>
        {signal.pnl !== undefined && (
           <div className={cn(
             "font-bold font-mono",
             signal.pnl > 0 ? "text-emerald-500" : "text-rose-500"
           )}>
             {signal.pnl > 0 ? '+' : ''}{signal.pnl.toFixed(2)}%
           </div>
        )}
      </div>
    </div>
  );
}
