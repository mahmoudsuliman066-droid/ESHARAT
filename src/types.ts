export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type Pair = 
  | 'BTCUSDT' | 'ETHUSDT' | 'BNBUSDT' | 'SOLUSDT' 
  | 'PAXGUSDT' | 'LINKUSDT' | 'ADAUSDT' | 'AVAXUSDT' 
  | 'SUIUSDT' | 'DOGEUSDT' | 'XRPUSDT' | 'IOTAUSDT';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
}

export type OrderType = 'MARKET' | 'LIMIT';
export type TradeDirection = 'LONG' | 'SHORT';
export type SignalStatus = 'ACTIVE' | 'WON' | 'LOST' | 'CANCELLED' | 'PENDING';

export interface Signal {
  id: string;
  pair: Pair;
  timeframe: Timeframe;
  direction: TradeDirection;
  orderType: OrderType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  status: SignalStatus;
  pnl?: number; // Profit and Loss percentage
}

export interface FVG {
  top: number;
  bottom: number;
  time: number;
  type: 'BULLISH' | 'BEARISH';
}

export interface OrderBlock {
  top: number;
  bottom: number;
  time: number;
  type: 'BULLISH' | 'BEARISH';
}
