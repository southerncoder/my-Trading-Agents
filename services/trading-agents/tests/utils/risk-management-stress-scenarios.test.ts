/**
 * Risk Management Stress Scenarios Unit Tests
 * 
 * Comprehensive test suite for extreme market conditions and stress scenarios:
 * - Market crash scenarios (2008, 2020, Black Monday)
 * - Volatility spikes and flash crashes
 * - Sector-specific crises (tech bubble, energy crisis)
 * - Currency and interest rate shocks
 * - Liquidity crises and market freezes
 * - Correlation breakdown scenarios
 * - Tail risk and black swan events
 * - Recovery time analysis
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
    assessMarketRisk,
    assessSentimentRisk,
    assessNewsRisk,
    assessFundamentalRisk,
    performComprehensiveRiskAssessment
} from '../../src/utils/risk-management-utils.js';
import { RiskManagementEngine } from '../../src/utils/risk-management-engine-simple.js';

// Mock fetch for news API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Risk Management Stress Scenarios', () => {
    let engine: RiskManagementEngine;

    beforeEach(() => {
        jest.clearAllMocks();

        const mockConfig = {
            llm: { provider: 'openai', model: 'gpt-4' },
            dataProviders: {},
            agents: {}
        };

        engine = new RiskManagementEngine(mockConfig);

        // Default mock for successful API calls
        (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                status: 'success',
                results: {
                    'google-news': {
                        articles: [
                            {
                                title: 'Market Update',
                                description: 'Current market analysis',
                                publishedAt: new Date().toISOString(),
                                source: { name: 'Reuters' }
                            }
                        ]
                    }
                }
            })
        } as Response);
    });

    describe('Historical Market Crash Scenarios', () => {
        test('should handle 2008 Financial Crisis scenario', async () => {
            const crashScenario = {
                marketReport: 'Severe financial crisis with banking sector collapse, credit freeze, massive deleveraging, and unprecedented market volatility. Lehman Brothers bankruptcy triggers systemic risk.',
                sentimentReport: 'Extreme fear and panic selling across all markets. Investor confidence completely shattered with widespread pessimism and flight to safety.',
                newsReport: 'Breaking: Major investment banks failing, government bailouts announced, credit markets frozen, unemployment spiking, recession deepening.',
                fundamentalsReport: 'Corporate earnings collapsing, massive debt defaults, credit downgrades across sectors, liquidity crisis, negative cash flows widespread.',
                traderPlan: 'Emergency risk reduction, liquidating positions, avoiding leverage, implementing maximum stop losses, preserving capital at all costs.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                crashScenario.marketReport,
                crashScenario.sentimentReport,
                crashScenario.newsReport,
                crashScenario.fundamentalsReport,
                crashScenario.traderPlan,
                crashScenario.symbol
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.7);
            expect(result.confidence).toBeGreaterThan(0.5);

            // Should identify multiple risk factors
            const allFactors = Object.values(result.components)
                .filter((component: any) => component.status === 'fulfilled')
                .flatMap((component: any) => component.value?.factors || []);

            expect(allFactors.length).toBeGreaterThan(5);
            expect(allFactors.some(factor =>
                factor.toLowerCase().includes('crisis') ||
                factor.toLowerCase().includes('panic') ||
                factor.toLowerCase().includes('volatility')
            )).toBe(true);
        });

        test('should handle 2020 COVID-19 Market Crash scenario', async () => {
            const covidScenario = {
                marketReport: 'Global pandemic triggers unprecedented market crash with circuit breakers activated, oil prices collapse, travel and hospitality sectors devastated.',
                sentimentReport: 'Extreme uncertainty and fear as global lockdowns announced. Panic selling in travel, energy, and retail sectors with flight to technology stocks.',
                newsReport: 'WHO declares pandemic, countries implement lockdowns, supply chains disrupted, central banks announce emergency measures, unemployment claims surge.',
                fundamentalsReport: 'Revenue collapse in affected sectors, massive government stimulus announced, corporate debt concerns rising, earnings guidance withdrawn.',
                traderPlan: 'Sector rotation strategy, avoiding travel and energy, increasing technology and healthcare exposure, maintaining defensive positions.',
                symbol: 'QQQ'
            };

            const result = await performComprehensiveRiskAssessment(
                covidScenario.marketReport,
                covidScenario.sentimentReport,
                covidScenario.newsReport,
                covidScenario.fundamentalsReport,
                covidScenario.traderPlan,
                covidScenario.symbol
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.6);

            // Should recommend defensive strategies
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('defensive') ||
                rec.toLowerCase().includes('reduce') ||
                rec.toLowerCase().includes('conservative')
            )).toBe(true);
        });

        test('should handle Black Monday 1987 scenario', async () => {
            const blackMondayScenario = {
                marketReport: 'Catastrophic single-day market crash with Dow Jones falling over 20%, program trading amplifying losses, market makers overwhelmed.',
                sentimentReport: 'Absolute panic and terror in markets, no buyers found, indiscriminate selling across all sectors, investor confidence destroyed.',
                newsReport: 'Historic market crash exceeds Great Depression levels, trading halted multiple times, international markets following suit.',
                fundamentalsReport: 'Market valuations disconnected from fundamentals, excessive leverage exposed, margin calls forcing liquidations.',
                traderPlan: 'Complete market exit, cash preservation, avoiding any new positions, waiting for market stabilization.',
                symbol: 'DJI'
            };

            const result = await performComprehensiveRiskAssessment(
                blackMondayScenario.marketReport,
                blackMondayScenario.sentimentReport,
                blackMondayScenario.newsReport,
                blackMondayScenario.fundamentalsReport,
                blackMondayScenario.traderPlan,
                blackMondayScenario.symbol
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.8);

            // Should strongly recommend avoiding trades
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('avoid') ||
                rec.toLowerCase().includes('wait') ||
                rec.toLowerCase().includes('cash')
            )).toBe(true);
        });
    });

    describe('Volatility Spike Scenarios', () => {
        test('should handle VIX spike scenario', async () => {
            const vixSpikeScenario = {
                marketReport: 'VIX volatility index spikes above 80, indicating extreme fear and uncertainty. Options markets in chaos with massive bid-ask spreads.',
                sentimentReport: 'Terror grips markets as volatility reaches crisis levels. Institutional investors fleeing to cash and bonds.',
                newsReport: 'Volatility explosion rocks markets, derivatives trading suspended, hedge funds reporting massive losses.',
                fundamentalsReport: 'Earnings visibility completely lost due to extreme uncertainty, guidance withdrawn across industries.',
                traderPlan: 'Volatility trading strategies, selling options premium, reducing position sizes, implementing strict risk controls.',
                symbol: 'VIX'
            };

            const volatilityResult = await engine.analyzeVolatility('VIX_SPIKE_TEST');
            const marketResult = await assessMarketRisk(vixSpikeScenario.marketReport, 'VIX');

            expect(volatilityResult.volatilityRegime).toBe('high');
            expect(marketResult.score).toBeGreaterThan(0.7);
            expect(marketResult.factors.some(factor =>
                factor.toLowerCase().includes('volatility') ||
                factor.toLowerCase().includes('uncertainty')
            )).toBe(true);
        });

        test('should handle flash crash scenario', async () => {
            const flashCrashScenario = {
                marketReport: 'Sudden algorithmic trading malfunction causes 10% market drop in minutes, liquidity evaporates, circuit breakers triggered.',
                sentimentReport: 'Confusion and panic as markets crash without fundamental reason. High-frequency trading blamed for amplifying losses.',
                newsReport: 'Flash crash investigation launched, algorithmic trading under scrutiny, market makers withdraw liquidity.',
                fundamentalsReport: 'No fundamental reason for crash, purely technical market failure exposing structural weaknesses.',
                traderPlan: 'Avoiding algorithmic strategies, manual trading only, waiting for market structure stabilization.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                flashCrashScenario.marketReport,
                flashCrashScenario.sentimentReport,
                flashCrashScenario.newsReport,
                flashCrashScenario.fundamentalsReport,
                flashCrashScenario.traderPlan,
                'FLASH_CRASH_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.6);
        });
    });

    describe('Sector-Specific Crisis Scenarios', () => {
        test('should handle tech bubble burst scenario', async () => {
            const techBubbleScenario = {
                marketReport: 'Technology sector bubble bursting with NASDAQ falling 50%, dot-com companies collapsing, venture funding drying up.',
                sentimentReport: 'Extreme pessimism toward technology stocks, growth investing out of favor, value investing resurgence.',
                newsReport: 'Major tech companies reporting massive losses, IPO market frozen, internet companies burning cash.',
                fundamentalsReport: 'Tech companies with no profits or revenue, unsustainable business models exposed, massive overvaluations correcting.',
                traderPlan: 'Exiting all technology positions, rotating to value stocks, avoiding growth and momentum strategies.',
                symbol: 'QQQ'
            };

            // Mock tech-negative news
            (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    status: 'success',
                    results: {
                        'google-news': {
                            articles: [
                                {
                                    title: 'Tech Bubble Bursts',
                                    description: 'Technology stocks crash as bubble finally bursts with massive losses',
                                    publishedAt: new Date().toISOString(),
                                    source: { name: 'Wall Street Journal' }
                                }
                            ]
                        }
                    }
                })
            } as Response);

            const sectorSentiment = await engine.getSectorSentiment('AAPL');
            const result = await performComprehensiveRiskAssessment(
                techBubbleScenario.marketReport,
                techBubbleScenario.sentimentReport,
                techBubbleScenario.newsReport,
                techBubbleScenario.fundamentalsReport,
                techBubbleScenario.traderPlan,
                'TECH_BUBBLE_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(sectorSentiment.sentiment).toBeDefined();
        });

        test('should handle energy crisis scenario', async () => {
            const energyCrisisScenario = {
                marketReport: 'Oil prices spike to $150/barrel due to geopolitical crisis, energy stocks volatile, inflation concerns mounting.',
                sentimentReport: 'Mixed sentiment with energy bulls celebrating while other sectors fear inflation impact and economic slowdown.',
                newsReport: 'Geopolitical tensions disrupt oil supply, strategic reserves being released, recession fears grow due to energy costs.',
                fundamentalsReport: 'Energy companies reporting record profits while other sectors face margin compression from higher costs.',
                traderPlan: 'Energy sector overweight, inflation hedges, reducing consumer discretionary exposure.',
                symbol: 'XLE'
            };

            const result = await performComprehensiveRiskAssessment(
                energyCrisisScenario.marketReport,
                energyCrisisScenario.sentimentReport,
                energyCrisisScenario.newsReport,
                energyCrisisScenario.fundamentalsReport,
                energyCrisisScenario.traderPlan,
                'ENERGY_CRISIS_TEST'
            );

            expect(result.overallRisk).toMatch(/MEDIUM|HIGH/);
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('energy') ||
                rec.toLowerCase().includes('inflation')
            )).toBe(true);
        });

        test('should handle financial sector crisis scenario', async () => {
            const financialCrisisScenario = {
                marketReport: 'Banking sector under severe stress with credit losses mounting, interest rate risk exposure, deposit flight concerns.',
                sentimentReport: 'Extreme bearish sentiment toward financial sector, credit concerns spreading, systemic risk fears.',
                newsReport: 'Regional banks failing, credit tightening accelerating, regulatory intervention expected.',
                fundamentalsReport: 'Bank loan losses spiking, net interest margins compressed, credit provisions increasing dramatically.',
                traderPlan: 'Avoiding all financial sector exposure, defensive positioning, monitoring for contagion effects.',
                symbol: 'XLF'
            };

            const result = await performComprehensiveRiskAssessment(
                financialCrisisScenario.marketReport,
                financialCrisisScenario.sentimentReport,
                financialCrisisScenario.newsReport,
                financialCrisisScenario.fundamentalsReport,
                financialCrisisScenario.traderPlan,
                'FINANCIAL_CRISIS_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.7);
        });
    });

    describe('Currency and Interest Rate Shock Scenarios', () => {
        test('should handle currency crisis scenario', async () => {
            const currencyCrisisScenario = {
                marketReport: 'Major currency devaluation triggers emerging market crisis, dollar strength causing global deleveraging.',
                sentimentReport: 'Flight to safety into US dollar and treasuries, emerging market assets being dumped.',
                newsReport: 'Central bank intervention fails to stabilize currency, IMF assistance requested, capital controls implemented.',
                fundamentalsReport: 'Foreign debt burdens increasing due to currency weakness, import costs spiking, inflation accelerating.',
                traderPlan: 'Dollar strength plays, avoiding emerging markets, treasury bonds for safety.',
                symbol: 'DXY'
            };

            const result = await performComprehensiveRiskAssessment(
                currencyCrisisScenario.marketReport,
                currencyCrisisScenario.sentimentReport,
                currencyCrisisScenario.newsReport,
                currencyCrisisScenario.fundamentalsReport,
                currencyCrisisScenario.traderPlan,
                'CURRENCY_CRISIS_TEST'
            );

            expect(result.overallRisk).toMatch(/MEDIUM|HIGH/);
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('dollar') ||
                rec.toLowerCase().includes('currency') ||
                rec.toLowerCase().includes('safety')
            )).toBe(true);
        });

        test('should handle interest rate shock scenario', async () => {
            const rateShockScenario = {
                marketReport: 'Federal Reserve emergency rate hike of 200 basis points shocks markets, yield curve inverts dramatically.',
                sentimentReport: 'Panic over aggressive monetary tightening, recession fears spike, growth stocks under severe pressure.',
                newsReport: 'Fed chair announces inflation emergency measures, bond markets in turmoil, mortgage rates spike.',
                fundamentalsReport: 'Corporate borrowing costs spiking, refinancing risks emerging, interest-sensitive sectors collapsing.',
                traderPlan: 'Short duration bonds, avoiding growth stocks, focusing on value and dividend stocks.',
                symbol: 'TLT'
            };

            const result = await performComprehensiveRiskAssessment(
                rateShockScenario.marketReport,
                rateShockScenario.sentimentReport,
                rateShockScenario.newsReport,
                rateShockScenario.fundamentalsReport,
                rateShockScenario.traderPlan,
                'RATE_SHOCK_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('rate') ||
                rec.toLowerCase().includes('bond') ||
                rec.toLowerCase().includes('value')
            )).toBe(true);
        });
    });

    describe('Liquidity Crisis Scenarios', () => {
        test('should handle market liquidity freeze scenario', async () => {
            const liquidityFreezeScenario = {
                marketReport: 'Market makers withdraw from markets, bid-ask spreads widen dramatically, trading volumes collapse.',
                sentimentReport: 'Panic as investors unable to exit positions, liquidity premium demanded for all assets.',
                newsReport: 'Trading suspended in multiple markets, clearinghouses raise margin requirements, settlement delays reported.',
                fundamentalsReport: 'Asset valuations meaningless without functioning markets, forced selling at any price.',
                traderPlan: 'Holding only most liquid assets, avoiding illiquid investments, maintaining large cash reserves.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                liquidityFreezeScenario.marketReport,
                liquidityFreezeScenario.sentimentReport,
                liquidityFreezeScenario.newsReport,
                liquidityFreezeScenario.fundamentalsReport,
                liquidityFreezeScenario.traderPlan,
                'LIQUIDITY_FREEZE_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('liquid') ||
                rec.toLowerCase().includes('cash') ||
                rec.toLowerCase().includes('avoid')
            )).toBe(true);
        });

        test('should handle margin call cascade scenario', async () => {
            const marginCallScenario = {
                marketReport: 'Massive margin calls trigger forced selling cascade, leveraged funds liquidating positions, volatility spiking.',
                sentimentReport: 'Fear of contagion as leveraged positions unwind, deleveraging accelerating across all asset classes.',
                newsReport: 'Hedge funds reporting massive losses, prime brokers tightening credit, margin requirements increased.',
                fundamentalsReport: 'Forced selling disconnecting prices from fundamentals, indiscriminate liquidations across sectors.',
                traderPlan: 'Zero leverage policy, avoiding margin trading, opportunistic buying of oversold quality assets.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                marginCallScenario.marketReport,
                marginCallScenario.sentimentReport,
                marginCallScenario.newsReport,
                marginCallScenario.fundamentalsReport,
                marginCallScenario.traderPlan,
                'MARGIN_CALL_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('leverage') ||
                rec.toLowerCase().includes('margin') ||
                rec.toLowerCase().includes('cash')
            )).toBe(true);
        });
    });

    describe('Correlation Breakdown Scenarios', () => {
        test('should handle correlation spike scenario', async () => {
            const correlationSpikeScenario = {
                marketReport: 'Asset correlations spike to 1.0 as diversification fails, all risk assets moving together in crisis.',
                sentimentReport: 'Panic selling affects all assets equally, no safe havens except cash and treasuries.',
                newsReport: 'Diversification strategies failing as correlations reach extreme levels, portfolio protection ineffective.',
                fundamentalsReport: 'Systematic risk overwhelming idiosyncratic factors, sector analysis becoming irrelevant.',
                traderPlan: 'Abandoning diversification strategies, focusing on absolute return strategies, increasing cash allocation.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                correlationSpikeScenario.marketReport,
                correlationSpikeScenario.sentimentReport,
                correlationSpikeScenario.newsReport,
                correlationSpikeScenario.fundamentalsReport,
                correlationSpikeScenario.traderPlan,
                'CORRELATION_SPIKE_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('diversif') ||
                rec.toLowerCase().includes('cash') ||
                rec.toLowerCase().includes('treasury')
            )).toBe(true);
        });

        test('should handle safe haven failure scenario', async () => {
            const safeHavenFailureScenario = {
                marketReport: 'Traditional safe havens failing as bonds and gold also decline, nowhere to hide in markets.',
                sentimentReport: 'Desperation as even defensive assets provide no protection, complete loss of confidence.',
                newsReport: 'Bond markets under pressure, gold selling off, central bank credibility questioned.',
                fundamentalsReport: 'Inflation eroding bond values, gold losing safe haven status, currency debasement fears.',
                traderPlan: 'Seeking alternative stores of value, considering real assets, maintaining maximum flexibility.',
                symbol: 'GLD'
            };

            const result = await performComprehensiveRiskAssessment(
                safeHavenFailureScenario.marketReport,
                safeHavenFailureScenario.sentimentReport,
                safeHavenFailureScenario.newsReport,
                safeHavenFailureScenario.fundamentalsReport,
                safeHavenFailureScenario.traderPlan,
                'SAFE_HAVEN_FAILURE_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.8);
        });
    });

    describe('Black Swan and Tail Risk Events', () => {
        test('should handle unprecedented market event', async () => {
            const blackSwanScenario = {
                marketReport: 'Unprecedented market event with no historical precedent, all models failing, extreme tail risk realized.',
                sentimentReport: 'Complete bewilderment and panic as event exceeds all worst-case scenarios, models useless.',
                newsReport: 'Experts admit complete surprise at event, risk models failed to predict, new paradigm emerging.',
                fundamentalsReport: 'Traditional analysis irrelevant, fundamental assumptions proven wrong, new reality emerging.',
                traderPlan: 'Complete strategy overhaul required, abandoning all models, pure survival mode.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                blackSwanScenario.marketReport,
                blackSwanScenario.sentimentReport,
                blackSwanScenario.newsReport,
                blackSwanScenario.fundamentalsReport,
                blackSwanScenario.traderPlan,
                'BLACK_SWAN_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.85);
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('survival') ||
                rec.toLowerCase().includes('extreme') ||
                rec.toLowerCase().includes('unprecedented')
            )).toBe(true);
        });

        test('should handle multiple simultaneous crises', async () => {
            const multiCrisisScenario = {
                marketReport: 'Perfect storm of simultaneous crises: market crash, currency collapse, banking failure, and geopolitical conflict.',
                sentimentReport: 'Absolute despair as multiple crises compound, no escape from systematic breakdown.',
                newsReport: 'Multiple crises converging simultaneously, authorities overwhelmed, emergency measures insufficient.',
                fundamentalsReport: 'Complete breakdown of financial system, multiple sectors failing simultaneously.',
                traderPlan: 'Emergency preservation mode, physical assets only, avoiding all financial instruments.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                multiCrisisScenario.marketReport,
                multiCrisisScenario.sentimentReport,
                multiCrisisScenario.newsReport,
                multiCrisisScenario.fundamentalsReport,
                multiCrisisScenario.traderPlan,
                'MULTI_CRISIS_TEST'
            );

            expect(result.overallRisk).toBe('HIGH');
            expect(result.overallScore).toBeGreaterThan(0.9);
            expect(result.confidence).toBeGreaterThan(0.7); // Should be confident about high risk
        });
    });

    describe('Recovery and Resilience Testing', () => {
        test('should assess recovery potential after crisis', async () => {
            const recoveryScenario = {
                marketReport: 'Markets beginning to stabilize after severe crisis, volatility declining, some buying interest returning.',
                sentimentReport: 'Cautious optimism emerging, but investors remain skeptical, waiting for confirmation of recovery.',
                newsReport: 'Central bank interventions showing effect, government stimulus announced, early signs of stabilization.',
                fundamentalsReport: 'Valuations attractive after crash, quality companies surviving, balance sheets being repaired.',
                traderPlan: 'Gradual re-entry strategy, focusing on quality names, maintaining defensive positioning.',
                symbol: 'SPY'
            };

            const result = await performComprehensiveRiskAssessment(
                recoveryScenario.marketReport,
                recoveryScenario.sentimentReport,
                recoveryScenario.newsReport,
                recoveryScenario.fundamentalsReport,
                recoveryScenario.traderPlan,
                'RECOVERY_TEST'
            );

            expect(result.overallRisk).toMatch(/MEDIUM|LOW/);
            expect(result.recommendations.some(rec =>
                rec.toLowerCase().includes('gradual') ||
                rec.toLowerCase().includes('quality') ||
                rec.toLowerCase().includes('cautious')
            )).toBe(true);
        });

        test('should validate risk assessment consistency across scenarios', async () => {
            const scenarios = [
                { name: 'MILD_CORRECTION', severity: 'low' },
                { name: 'MODERATE_DECLINE', severity: 'medium' },
                { name: 'SEVERE_CRASH', severity: 'high' }
            ];

            const results: Array<{ name: string; severity: string; riskScore: number }> = [];

            for (const scenario of scenarios) {
                const marketReport = scenario.severity === 'high'
                    ? 'Severe market crash with extreme volatility and panic selling'
                    : scenario.severity === 'medium'
                        ? 'Moderate market decline with increased uncertainty'
                        : 'Minor market correction with normal volatility';

                const result = await assessMarketRisk(marketReport, scenario.name);
                results.push({ ...scenario, riskScore: result.score });
            }

            // Risk scores should generally increase with severity
            expect(results[2].riskScore).toBeGreaterThan(results[0].riskScore);

            // All should be valid
            results.forEach(result => {
                expect(result.riskScore).toBeGreaterThanOrEqual(0);
                expect(result.riskScore).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Performance Under Stress', () => {
        test('should maintain performance during extreme scenarios', async () => {
            const extremeScenarios = Array.from({ length: 10 }, (_, i) => ({
                marketReport: `Extreme market stress scenario ${i} with unprecedented volatility and systematic breakdown`,
                sentimentReport: `Panic and fear dominate scenario ${i} with complete loss of confidence`,
                newsReport: `Breaking crisis news for scenario ${i} with multiple simultaneous failures`,
                fundamentalsReport: `Fundamental breakdown in scenario ${i} with widespread defaults`,
                traderPlan: `Emergency response plan ${i} with maximum risk reduction`,
                symbol: `STRESS_TEST_${i}`
            }));

            const startTime = performance.now();

            const results = await Promise.all(
                extremeScenarios.map(scenario =>
                    performComprehensiveRiskAssessment(
                        scenario.marketReport,
                        scenario.sentimentReport,
                        scenario.newsReport,
                        scenario.fundamentalsReport,
                        scenario.traderPlan,
                        scenario.symbol
                    )
                )
            );

            const duration = performance.now() - startTime;

            // Should complete within reasonable time even under stress
            expect(duration).toBeLessThan(30000); // 30 seconds for 10 scenarios

            // All results should be valid
            results.forEach(result => {
                expect(result.overallRisk).toBeDefined();
                expect(result.overallScore).toBeGreaterThanOrEqual(0);
                expect(result.overallScore).toBeLessThanOrEqual(1);
                expect(result.confidence).toBeGreaterThanOrEqual(0);
            });

            // Most should be high risk given extreme scenarios
            const highRiskCount = results.filter(r => r.overallRisk === 'HIGH').length;
            expect(highRiskCount).toBeGreaterThan(results.length * 0.7); // At least 70% should be high risk
        });
    });
});