import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { Candle, Signal } from '../types';
import { findFVGs, findOrderBlocks } from '../utils/smc';

interface ChartWidgetProps {
  candles: Candle[];
  activeSignals: Signal[];
}

export function ChartWidget({ candles, activeSignals }: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({
        width: chartContainerRef.current?.clientWidth,
        height: chartContainerRef.current?.clientHeight,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(30, 41, 59, 0.5)',
      },
      timeScale: {
        borderColor: 'rgba(30, 41, 59, 0.5)',
        timeVisible: true,
      },
    });
    
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    
    seriesRef.current = candlestickSeries;
    markersRef.current = createSeriesMarkers(candlestickSeries);

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  const linesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
    
    // Sort and ensure unique times
    const uniqueCandles = candles.filter((c, i, a) => a.findIndex(t => t.time === c.time) === i).sort((a,b) => a.time - b.time);
    
    // lightweight-charts expects data exactly in format { time, open, high, low, close }
    seriesRef.current.setData(uniqueCandles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    })));

    // Clear old lines
    linesRef.current.forEach(line => {
       if (seriesRef.current) seriesRef.current.removePriceLine(line);
    });
    linesRef.current = [];
    
    const markers: any[] = [];
    
    activeSignals.forEach(signal => {
        markers.push({
            time: Math.floor(signal.timestamp / 1000) as any,
            position: signal.direction === 'LONG' ? 'belowBar' : 'aboveBar',
            color: signal.direction === 'LONG' ? '#10b981' : '#ef4444',
            shape: signal.direction === 'LONG' ? 'arrowUp' : 'arrowDown',
            text: `${signal.direction} @ ${signal.entryPrice}`
        });

        const tpLine = seriesRef.current?.createPriceLine({
            price: signal.takeProfit,
            color: '#10b981',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'TP',
        });
        const slLine = seriesRef.current?.createPriceLine({
            price: signal.stopLoss,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'SL',
        });
        
        const entryLine = seriesRef.current?.createPriceLine({
            price: signal.entryPrice,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'ENTRY',
        });

        if (tpLine) linesRef.current.push(tpLine);
        if (slLine) linesRef.current.push(slLine);
        if (entryLine) linesRef.current.push(entryLine);
    });

    // Ensure markers fall exactly on existing candles to avoid lightweight-charts errors
    const validTimes = new Set(uniqueCandles.map(c => c.time));
    const validMarkers = markers.filter(m => validTimes.has(m.time));
    
    if (validMarkers.length > 0) {
        markersRef.current?.setMarkers(validMarkers.sort((a,b) => a.time - b.time));
    } else {
        markersRef.current?.setMarkers([]);
    }

  }, [candles, activeSignals]);

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
      <div ref={chartContainerRef} className="absolute inset-0" />
    </div>
  );
}
