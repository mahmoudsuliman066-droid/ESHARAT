import { Candle, FVG, OrderBlock } from '../types';

export function findFVGs(candles: Candle[], lookback: number = 20): FVG[] {
  const fvgs: FVG[] = [];
  const startIdx = Math.max(2, candles.length - lookback);
  
  for (let i = startIdx; i < candles.length - 1; i++) { // don't use the currently forming candle for fvg
    const c1 = candles[i - 2];
    // const c2 = candles[i - 1];
    const c3 = candles[i];

    // Bullish FVG: low of c3 is higher than high of c1
    if (c3.low > c1.high) {
      fvgs.push({
        type: 'BULLISH',
        top: c3.low,
        bottom: c1.high,
        time: c3.time
      });
    }

    // Bearish FVG: high of c3 is lower than low of c1
    if (c3.high < c1.low) {
      fvgs.push({
        type: 'BEARISH',
        top: c1.low,
        bottom: c3.high,
        time: c3.time
      });
    }
  }
  return fvgs;
}

export function findOrderBlocks(candles: Candle[], lookback: number = 50): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const startIdx = Math.max(1, candles.length - lookback);

  for (let i = startIdx; i < candles.length - 2; i++) {
    const c = candles[i];
    
    // Simple heuristic for OB: 
    // Bullish OB: A down candle followed by a strong up move (break of structure simplifed to strong momentum)
    if (c.close < c.open) {
      const next1 = candles[i+1];
      const next2 = candles[i+2];
      
      const moveUp = next2.close - c.close;
      const averageBody = (Math.abs(c.close - c.open) + Math.abs(next1.close - next1.open)) / 2;
      
      if (moveUp > averageBody * 2 && next2.close > next1.high) {
        obs.push({
          type: 'BULLISH',
          top: c.open,
          bottom: c.low,
          time: c.time
        });
      }
    }

    // Bearish OB: An up candle followed by a strong down move
    if (c.close > c.open) {
      const next1 = candles[i+1];
      const next2 = candles[i+2];
      
      const moveDown = c.close - next2.close;
      const averageBody = (Math.abs(c.close - c.open) + Math.abs(next1.close - next1.open)) / 2;
      
      if (moveDown > averageBody * 2 && next2.close < next1.low) {
        obs.push({
          type: 'BEARISH',
          top: c.high,
          bottom: c.open,
          time: c.time
        });
      }
    }
  }

  return obs;
}
