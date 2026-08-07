import { useState, useEffect, useRef, useCallback } from 'react';
import { Pair, Timeframe, Candle } from '../types';

const REST_URL = 'https://fapi.binance.com/fapi/v1/klines';
const WS_URL = 'wss://fstream.binance.com/ws';

export function useBinance(pair: Pair, timeframe: Timeframe) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    let isMounted = true;

    // WebSocket logic with Auto-Reconnect
    const connectWs = () => {
      if (!isMounted) return;
      
      const streamName = `${pair.toLowerCase()}@kline_${timeframe}`;
      const ws = new WebSocket(`${WS_URL}/${streamName}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
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
              const updated = [...prev];
              updated[updated.length - 1] = newCandle;
              return updated;
            } else if (newCandle.time > lastCandle.time) {
              return [...prev.slice(1), newCandle];
            }
            return prev;
          });
        }
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        ws.close();
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // إعادة الاتصال تلقائياً بعد 3 ثوانٍ لو حصل أي انقطاع
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWs();
          }, 3000);
        }
      };
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [pair, timeframe, fetchKlines]);

  return { candles, currentPrice, isConnected };
}
