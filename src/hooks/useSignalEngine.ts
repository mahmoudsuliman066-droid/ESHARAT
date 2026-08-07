import { useRef, useCallback } from 'react';
import { Candle, Signal, Pair, Timeframe, FVG, OrderBlock, TradeDirection, OrderType } from '../types';
import { calculateEMA, calculateRSI, calculateMACD, calculateADX, calculateATR } from '../utils/ta';
import { findFVGs, findOrderBlocks } from '../utils/smc';

// Wait, I didn't install uuid. I will use a simple random string generator instead.
const generateId = () => Math.random().toString(36).substr(2, 9);

export function useSignalEngine() {
  
  const generateSignal = useCallback((pair: Pair, timeframe: Timeframe, candles: Candle[], currentPrice: number): Signal | null => {
    if (candles.length < 200) return null;

    const closes = candles.map(c => c.close);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const rsi = calculateRSI(closes, 14);
    const { macdLine, signalLine } = calculateMACD(closes);
    const adx = calculateADX(candles, 14);
    const atr = calculateATR(candles, 14);

    const lastIdx = candles.length - 1;
    
    // Check if latest indicators are valid
    if (isNaN(ema50[lastIdx]) || isNaN(ema200[lastIdx]) || isNaN(adx[lastIdx])) return null;

    const currentEma50 = ema50[lastIdx];
    const currentEma200 = ema200[lastIdx];
    const currentRsi = rsi[lastIdx];
    const currentAdx = adx[lastIdx];
    const currentAtr = atr[lastIdx];
    const currentMacd = macdLine[lastIdx];
    const currentMacdSignal = signalLine[lastIdx];

    // Confluence check
    const isTrending = currentAdx > 20;
    if (!isTrending) return null; // No signal in ranging market

    const isUptrend = currentEma50 > currentEma200;
    const isDowntrend = currentEma50 < currentEma200;

    const fvgs = findFVGs(candles, 30);
    const obs = findOrderBlocks(candles, 50);

    // We only want the most recent relevant FVG or OB
    const recentBullishFVG = fvgs.reverse().find(f => f.type === 'BULLISH');
    const recentBearishFVG = fvgs.reverse().find(f => f.type === 'BEARISH');
    const recentBullishOB = obs.reverse().find(o => o.type === 'BULLISH');
    const recentBearishOB = obs.reverse().find(o => o.type === 'BEARISH');

    let direction: TradeDirection | null = null;
    let orderType: OrderType = 'MARKET';
    let entryPrice = currentPrice;
    let sl = 0;
    let tp = 0;

    // Check Long Conditions
    if (isUptrend && currentMacd > currentMacdSignal) {
      if (currentRsi > 40 && currentRsi < 70) {
        
        // Is price near Bullish FVG or OB?
        const nearFvg = recentBullishFVG && currentPrice >= recentBullishFVG.top && currentPrice <= recentBullishFVG.top * 1.015;
        const nearOb = recentBullishOB && currentPrice >= recentBullishOB.top && currentPrice <= recentBullishOB.top * 1.015;

        if (nearFvg || nearOb) {
          direction = 'LONG';
          orderType = 'LIMIT';
          entryPrice = nearFvg ? recentBullishFVG!.top : recentBullishOB!.top;
          
          // Must not be more than 1.5% away
          if (Math.abs(currentPrice - entryPrice) / currentPrice > 0.015) {
             direction = null;
          }
        } else if (currentRsi > 55) { // Breakout momentum
          direction = 'LONG';
          orderType = 'MARKET';
          entryPrice = currentPrice;
        }
      }
    }

    // Check Short Conditions
    if (isDowntrend && currentMacd < currentMacdSignal && !direction) {
       if (currentRsi < 60 && currentRsi > 30) {
           
           const nearFvg = recentBearishFVG && currentPrice <= recentBearishFVG.bottom && currentPrice >= recentBearishFVG.bottom * 0.985;
           const nearOb = recentBearishOB && currentPrice <= recentBearishOB.bottom && currentPrice >= recentBearishOB.bottom * 0.985;

           if (nearFvg || nearOb) {
             direction = 'SHORT';
             orderType = 'LIMIT';
             entryPrice = nearFvg ? recentBearishFVG!.bottom : recentBearishOB!.bottom;
             
             if (Math.abs(currentPrice - entryPrice) / currentPrice > 0.015) {
                 direction = null;
             }
           } else if (currentRsi < 45) { // Breakdown momentum
             direction = 'SHORT';
             orderType = 'MARKET';
             entryPrice = currentPrice;
           }
       }
    }

    if (!direction) return null;

    if (direction === 'LONG') {
        sl = entryPrice - (currentAtr * 1.5);
        tp = entryPrice + (currentAtr * 3); // 1:2 RR
    } else {
        sl = entryPrice + (currentAtr * 1.5);
        tp = entryPrice - (currentAtr * 3); // 1:2 RR
    }

    return {
        id: generateId(),
        pair,
        timeframe,
        direction,
        orderType,
        entryPrice,
        stopLoss: sl,
        takeProfit: tp,
        timestamp: Date.now(),
        status: orderType === 'LIMIT' ? 'PENDING' : 'ACTIVE'
    };
  }, []);

  return { generateSignal };
}
