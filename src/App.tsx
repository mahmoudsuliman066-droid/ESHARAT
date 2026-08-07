import { useState, useEffect, useCallback } from 'react';
import { Pair, Timeframe, Signal } from './types';
import { useBinance } from './hooks/useBinance';
import { useSignalEngine } from './hooks/useSignalEngine';
import { ChartWidget } from './components/ChartWidget';
import { SignalCard } from './components/SignalCard';
import { DashboardStats } from './components/DashboardStats';
import { cn } from './utils/cn';

const PAIRS: Pair[] = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 
  'PAXGUSDT', 'LINKUSDT', 'ADAUSDT', 'AVAXUSDT', 
  'SUIUSDT', 'DOGEUSDT', 'XRPUSDT', 'IOTAUSDT'
];

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export default function App() {
  const [selectedPair, setSelectedPair] = useState<Pair>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  
  const { candles, currentPrice, isConnected } = useBinance(selectedPair, selectedTimeframe);
  const { generateSignal } = useSignalEngine();

  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  const [history, setHistory] = useState<Signal[]>([]);

  // Engine cycle: Check for new signals
  useEffect(() => {
    if (candles.length > 0 && currentPrice) {
      const lastCandle = candles[candles.length - 1];
      if (lastCandle && lastCandle.isClosed) {
         const newSignal = generateSignal(selectedPair, selectedTimeframe, candles, currentPrice);
         if (newSignal) {
           setActiveSignals(prev => {
             const exists = prev.find(s => s.pair === newSignal.pair && s.direction === newSignal.direction && s.timeframe === newSignal.timeframe);
             if (exists) return prev;
             return [newSignal, ...prev];
           });
         }
      }
    }
  }, [candles, currentPrice, selectedPair, selectedTimeframe, generateSignal]);

  // Tick listener: Manage signal lifecycle (TP/SL)
  useEffect(() => {
    if (!currentPrice) return;

    setActiveSignals(prev => {
      let changed = false;
      const next = prev.filter(signal => {
        if (signal.pair !== selectedPair) return true;
        
        if (signal.status === 'PENDING') {
          if (signal.direction === 'LONG' && currentPrice <= signal.entryPrice) {
             signal.status = 'ACTIVE';
             changed = true;
          } else if (signal.direction === 'SHORT' && currentPrice >= signal.entryPrice) {
             signal.status = 'ACTIVE';
             changed = true;
          }
        }

        if (signal.status === 'ACTIVE') {
          if (signal.direction === 'LONG') {
            if (currentPrice >= signal.takeProfit) {
               closeSignal(signal, 'WON', currentPrice);
               changed = true;
               return false;
            }
            if (currentPrice <= signal.stopLoss) {
               closeSignal(signal, 'LOST', currentPrice);
               changed = true;
               return false;
            }
          } else {
            if (currentPrice <= signal.takeProfit) {
               closeSignal(signal, 'WON', currentPrice);
               changed = true;
               return false;
            }
            if (currentPrice >= signal.stopLoss) {
               closeSignal(signal, 'LOST', currentPrice);
               changed = true;
               return false;
            }
          }
        }
        return true;
      });
      return changed ? next : prev;
    });
  }, [currentPrice, selectedPair]);

  const closeSignal = useCallback((signal: Signal, outcome: 'WON' | 'LOST', closePrice: number) => {
    const pnl = signal.direction === 'LONG' 
        ? ((closePrice - signal.entryPrice) / signal.entryPrice) * 100
        : ((signal.entryPrice - closePrice) / signal.entryPrice) * 100;
        
    const closedSignal: Signal = {
      ...signal,
      status: outcome,
      pnl
    };
    
    setHistory(prev => [closedSignal, ...prev].slice(0, 50));
  }, []);

  return (
    <div className="bg-slate-950 text-slate-200 h-screen w-full overflow-hidden flex flex-col font-cairo">
      <header className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs">IT</div>
            <h1 className="text-lg font-bold tracking-tight text-white">لوحة التداول المؤسسي</h1>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 rounded px-2 py-1 border border-slate-700">
            <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500")}></span>
            <span className={cn("text-xs font-mono", isConnected ? "text-emerald-400" : "text-rose-400")}>
              {isConnected ? 'متصل بـ Binance Futures Live' : 'انقطاع الاتصال'}
            </span>
          </div>
        </div>
        
        <DashboardStats history={history} />
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-60 border-l border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-500">قائمة المراقبة</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{PAIRS.length} أزواج</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
            {PAIRS.map(p => (
              <div 
                key={p} 
                onClick={() => setSelectedPair(p)}
                className={cn(
                  "flex items-center justify-between p-3 cursor-pointer transition-colors",
                  selectedPair === p 
                    ? "bg-blue-600/10 border-r-2 border-blue-500" 
                    : "hover:bg-slate-800/50 border-r-2 border-transparent"
                )}
              >
                <div className="flex flex-col">
                  <span className={cn("text-sm font-bold", selectedPair === p ? "text-white" : "text-slate-300")}>{p}</span>
                  <span className="text-[10px] text-slate-500">العقود الآجلة</span>
                </div>
                {selectedPair === p && currentPrice && (
                   <div className="text-left">
                     <div className="text-sm font-mono text-emerald-400 font-bold">{currentPrice.toFixed(4)}</div>
                   </div>
                )}
              </div>
            ))}
          </div>
        </aside>
        
        <section className="flex-1 flex flex-col min-w-0">
          <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/20 shrink-0">
            <div className="flex gap-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={cn(
                    "px-3 py-1 text-xs rounded transition-colors font-mono font-bold",
                    selectedTimeframe === tf 
                      ? "bg-blue-600 text-white" 
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-500">محرك SMC: <span className="text-emerald-400">مفعل</span></span>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-950 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 border border-slate-800 rounded-lg relative overflow-hidden bg-slate-900/40 shadow-inner">
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 pointer-events-none">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-700 text-xs backdrop-blur-sm">
                  <div className="text-slate-400">{selectedPair} · {selectedTimeframe} · SMC</div>
                  <div className="text-lg font-mono font-bold text-white">{currentPrice?.toFixed(4) || '---'}</div>
                </div>
              </div>
              <ChartWidget candles={candles} activeSignals={activeSignals.filter(s => s.pair === selectedPair)} />
            </div>
            
            <div className="h-48 border border-slate-800 rounded-lg bg-slate-900/50 flex flex-col overflow-hidden shadow-lg shrink-0">
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-300">سجل الصفقات (التاريخ)</span>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">آخر 50 صفقة</span>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
                 {history.length === 0 ? (
                   <div className="text-center p-4 text-slate-500 text-xs mt-8">لم يتم إغلاق أي صفقات بعد.</div>
                 ) : (
                   history.map(signal => <SignalCard key={signal.id} signal={signal} />)
                 )}
              </div>
            </div>
          </div>
        </section>
        
        <aside className="w-72 border-r border-slate-800 bg-slate-900/50 p-5 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-xs font-bold uppercase text-slate-500 mb-4 sticky top-0 bg-slate-900/50 py-1">الإشارات الحية والتنبيهات</h2>
            <div className="flex-1 flex flex-col gap-3">
               {activeSignals.length === 0 ? (
                 <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                   لا توجد إشارات نشطة حالياً. جاري تحليل السوق...
                 </div>
               ) : (
                 activeSignals.map(signal => <SignalCard key={signal.id} signal={signal} />)
               )}
            </div>
          </div>
        </aside>
      </main>
      
      <footer className="h-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-4 text-[9px] text-slate-500 shrink-0">
         <div className="flex gap-4">
           <span>تنبيه المخاطرة: التداول ينطوي على خسارة رأس المال</span>
         </div>
         <div>
           <span>إصدار النظام v2.4.0 (Institutional SMC Engine)</span>
         </div>
      </footer>
    </div>
  );
}
