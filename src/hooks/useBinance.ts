import { useState, useEffect, useRef, useCallback } from 'react';
import { Pair, Timeframe, Candle } from '../types';

const REST_URL = 'https://fapi.binance.com/fapi/v1/klines';
const WS_URL = 'wss://fstream.binance.com/ws';

export function useBinance(pair: Pair, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial klines
  const fetchKlines = useCallback(async () => {
    try {
      const response = await fetch(`${REST_URL}?symbol=${pair}&interval=${timeframe}&limit=300`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const formattedCandles: Candle[] = data.map((d: any) => ({
          time: Math.floor(d[0] / 1000), // to seconds
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
          isClosed: true
        }));
        setCandles(formattedCandles);
        setCurrentPrice(formattedCandles[formattedCandles.length - 1].close);
      }
    } catch (error) {
      console.error('Failed to fetch initial klines', error);
    }
  }, [pair, timeframe]);

  useEffect(() => {
    fetchKlines();

    // WebSocket logic
    const streamName = `${pair.toLowerCase()}@kline_${timeframe}`;
    const ws = new WebSocket(`${WS_URL}/${streamName}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === 'kline') {
        const k = data.k;
        const newCandle: Candle = {
          time: Math.floor(k.t / 1000),
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isClosed: k.x
        };

        setCurrentPrice(newCandle.close);

        setCandles(prev => {
          if (prev.length === 0) return [newCandle];
          const lastCandle = prev[prev.length - 1];
          
          if (newCandle.time === lastCandle.time) {
            // Update current forming candle
            const updated = [...prev];
            updated[updated.length - 1] = newCandle;
            return updated;
          } else if (newCandle.time > lastCandle.time) {
            // New candle started
            return [...prev.slice(1), newCandle]; // keep array size manageable
          }
          return prev;
        });
      }
    };

    ws.onerror = () => setIsConnected(false);
    ws.onclose = () => setIsConnected(false);

    return () => {
      ws.close();
    };
  }, [pair, timeframe, fetchKlines]);

  return { candles, currentPrice, isConnected };
}
