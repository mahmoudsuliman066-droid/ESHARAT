import { Signal } from '../types';

export function DashboardStats({ history }: { history: Signal[] }) {
  const won = history.filter(s => s.status === 'WON').length;
  const lost = history.filter(s => s.status === 'LOST').length;
  const total = won + lost;
  
  const winRate = total > 0 ? (won / total) * 100 : 0;
  
  // Estimate R:R, just fixed at 1:2 based on our engine
  const profitFactor = total > 0 ? (won * 2) / (lost * 1 || 1) : 0;

  return (
    <div className="flex items-center gap-4 text-xs font-medium">
      <div className="flex flex-col items-start px-3 border-l border-slate-800">
        <span className="text-slate-500">نسبة النجاح</span>
        <span className="text-emerald-400 font-mono">{winRate.toFixed(1)}%</span>
      </div>
      <div className="flex flex-col items-start px-3 border-l border-slate-800">
        <span className="text-slate-500">معامل الربح</span>
        <span className="text-white font-mono">{profitFactor.toFixed(2)}</span>
      </div>
      <div className="flex flex-col items-start px-3">
         <span className="text-slate-500">إجمالي الصفقات</span>
         <span className="text-white font-mono">{total}</span>
      </div>
    </div>
  );
}
