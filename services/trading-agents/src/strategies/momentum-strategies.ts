/**
 * Momentum Trading Strategies
 *
 * This module implements various momentum-based trading strategies that capitalize on
 * the tendency of assets to continue moving in their current direction.
 *
 * TODO: Add adaptive momentum strategies that adjust to market volatility
 * TODO: Implement multi-timeframe momentum analysis
 * TODO: Add momentum ranking and portfolio rotation strategies
 */

// Import extracted strategy classes
export { MovingAverageCrossoverStrategy } from './moving-average-crossover-strategy';
export { MACDStrategy } from './macd-strategy';
export { RSIMomentumStrategy } from './rsi-momentum-strategy';

// TODO: Add more momentum strategies:
// - Stochastic Oscillator Strategy
// - Williams %R Strategy
// - Rate of Change (ROC) Strategy
// - Commodity Channel Index (CCI) Strategy
// - Average Directional Index (ADX) Strategy
// - Parabolic SAR Strategy