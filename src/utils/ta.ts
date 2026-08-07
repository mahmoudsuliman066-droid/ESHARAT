import { Candle } from '../types';

export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  
  const k = 2 / (period + 1);
  const ema = [data.slice(0, period).reduce((a, b) => a + b) / period]; // Initial SMA
  
  for (let i = period; i < data.length; i++) {
    ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
  }
  
  // Pad the beginning with nulls or just return the array matched to the end.
  // We'll return an array of the same length, padded with nulls (NaN) for simplicity.
  const result = Array(period - 1).fill(NaN).concat(ema);
  return result;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  if (data.length <= period) return [];
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  const rsi = Array(period).fill(NaN);
  rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  
  return rsi;
}

export function calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);
  
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEma[i] - slowEma[i]);
    }
  }
  
  // Calculate signal line which is EMA of MACD line
  const validMacd = macdLine.filter(val => !isNaN(val));
  const signal = calculateEMA(validMacd, signalPeriod);
  const signalLine = Array(data.length - validMacd.length).fill(NaN).concat(signal);
  
  const histogram = macdLine.map((val, i) => isNaN(val) || isNaN(signalLine[i]) ? NaN : val - signalLine[i]);
  
  return { macdLine, signalLine, histogram };
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length <= period) return [];
  
  const tr = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }
  
  const atr = Array(period - 1).fill(NaN);
  let sum = tr.slice(0, period).reduce((a, b) => a + b);
  atr.push(sum / period);
  
  for (let i = period; i < tr.length; i++) {
    atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
  }
  
  return atr;
}

export function calculateADX(candles: Candle[], period: number = 14): number[] {
    if (candles.length <= period) return [];

    let trs = [], plusDMs = [], minusDMs = [];
    for (let i = 1; i < candles.length; i++) {
        const tr = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i-1].close),
            Math.abs(candles[i].low - candles[i-1].close)
        );
        trs.push(tr);

        const upMove = candles[i].high - candles[i-1].high;
        const downMove = candles[i-1].low - candles[i].low;

        let plusDM = 0, minusDM = 0;
        if (upMove > downMove && upMove > 0) plusDM = upMove;
        if (downMove > upMove && downMove > 0) minusDM = downMove;
        
        plusDMs.push(plusDM);
        minusDMs.push(minusDM);
    }

    const smooth = (data: number[], p: number) => {
        let smoothed = [data.slice(0, p).reduce((a, b) => a + b)];
        for (let i = p; i < data.length; i++) {
            smoothed.push(smoothed[smoothed.length - 1] - (smoothed[smoothed.length - 1] / p) + data[i]);
        }
        return smoothed;
    };

    const smoothedTR = smooth(trs, period);
    const smoothedPlusDM = smooth(plusDMs, period);
    const smoothedMinusDM = smooth(minusDMs, period);

    let dxs = [];
    for(let i=0; i<smoothedTR.length; i++) {
        const plusDI = 100 * (smoothedPlusDM[i] / smoothedTR[i]);
        const minusDI = 100 * (smoothedMinusDM[i] / smoothedTR[i]);
        const dx = 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI || 1);
        dxs.push(dx);
    }
    
    // ADX is EMA of DX
    if(dxs.length < period) return Array(candles.length).fill(NaN);
    
    let adxVals = [dxs.slice(0, period).reduce((a, b) => a + b) / period];
    for (let i = period; i < dxs.length; i++) {
        adxVals.push((adxVals[adxVals.length - 1] * (period - 1) + dxs[i]) / period);
    }

    const padding = candles.length - adxVals.length;
    return Array(padding).fill(NaN).concat(adxVals);
}
