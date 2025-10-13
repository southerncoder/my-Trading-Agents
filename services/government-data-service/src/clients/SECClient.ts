import { BaseClient } from '../base/BaseClient.js';
import {
    SECCompany,
    SECFiling,
    SECCompanyFacts,
    SECMutualFund,
    RequestOptions,
    ApiResponse
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class SECClient extends BaseClient {
    constructor(userAgent?: string) {
        // SEC rate limit: 10 requests per second
        super(
            'https://data.sec.gov',
            userAgent || 'TradingAgents/1.0.0 (trading-agents@example.com)',
            30000, // 30 second timeout
            3, // max retries
            1000, // 1 second retry delay
            { tokensPerInterval: 10, interval: 'second' } // 10 requests per second
        );
    }

    /**
     * Get all company tickers with their CIK mappings
     */
    async getCompanyTickers(options?: RequestOptions): Promise<{ [ticker: string]: SECCompany }> {
        logger.info('Fetching company tickers from SEC');

        try {
            const response = await this.makeRequest<{ [ticker: string]: SECCompany }>({
                method: 'GET',
                url: '/files/company_tickers.json',
            }, options);

            logger.info(`Retrieved ${Object.keys(response).length} company tickers`);
            return response;
        } catch (error) {
            logger.error('Failed to fetch company tickers', { error });
            throw error;
        }
    }

    /**
     * Get company information by ticker symbol
     */
    async getCompanyByTicker(ticker: string, options?: RequestOptions): Promise<SECCompany | null> {
        logger.info(`Looking up company by ticker: ${ticker}`);

        try {
            const companies = await this.getCompanyTickers(options);
            const company = Object.values(companies).find(
                c => c.ticker?.toLowerCase() === ticker.toLowerCase()
            );

            if (company) {
                logger.info(`Found company: ${company.title} (CIK: ${company.cik_str})`);
            } else {
                logger.warn(`Company not found for ticker: ${ticker}`);
            }

            return company || null;
        } catch (error) {
            logger.error(`Failed to lookup company by ticker: ${ticker}`, { error });
            throw error;
        }
    }

    /**
     * Get company information by CIK
     */
    async getCompanyByCIK(cik: string, options?: RequestOptions): Promise<SECCompany | null> {
        const formattedCIK = this.validateCIK(cik);
        logger.info(`Looking up company by CIK: ${formattedCIK}`);

        try {
            const companies = await this.getCompanyTickers(options);
            const company = Object.values(companies).find(
                c => c.cik_str === formattedCIK
            );

            if (company) {
                logger.info(`Found company: ${company.title} (${company.ticker})`);
            } else {
                logger.warn(`Company not found for CIK: ${formattedCIK}`);
            }

            return company || null;
        } catch (error) {
            logger.error(`Failed to lookup company by CIK: ${formattedCIK}`, { error });
            throw error;
        }
    }

    /**
     * Get recent filings for a company by CIK
     */
    async getCompanyFilings(
        cik: string,
        options?: RequestOptions & {
            count?: number;
            type?: string; // e.g., '10-K', '10-Q', '8-K'
        }
    ): Promise<SECFiling[]> {
        const formattedCIK = this.validateCIK(cik);
        logger.info(`Fetching filings for CIK: ${formattedCIK}`, {
            count: options?.count,
            type: options?.type
        });

        try {
            const response = await this.makeRequest<{
                filings: {
                    recent: {
                        accessionNumber: string[];
                        filingDate: string[];
                        reportDate: string[];
                        acceptanceDateTime: string[];
                        act: string[];
                        form: string[];
                        fileNumber: string[];
                        filmNumber: string[];
                        items: string[];
                        size: number[];
                        isXBRL: number[];
                        isInlineXBRL: number[];
                        primaryDocument: string[];
                        primaryDocDescription: string[];
                    };
                };
            }>({
                method: 'GET',
                url: `/api/xbrl/submissions/CIK${formattedCIK}.json`,
            }, options);

            const recent = response.filings.recent;
            const filings: SECFiling[] = [];

            const maxCount = options?.count || recent.accessionNumber.length;
            const actualCount = Math.min(maxCount, recent.accessionNumber.length);

            for (let i = 0; i < actualCount; i++) {
                if (options?.type && recent.form[i] !== options.type) {
                    continue;
                }

                filings.push({
                    accessionNumber: recent.accessionNumber[i],
                    filingDate: recent.filingDate[i],
                    reportDate: recent.reportDate[i],
                    acceptanceDateTime: recent.acceptanceDateTime[i],
                    act: recent.act[i],
                    form: recent.form[i],
                    fileNumber: recent.fileNumber[i],
                    filmNumber: recent.filmNumber[i],
                    items: recent.items[i],
                    size: recent.size[i],
                    isXBRL: recent.isXBRL[i],
                    isInlineXBRL: recent.isInlineXBRL[i],
                    primaryDocument: recent.primaryDocument[i],
                    primaryDocDescription: recent.primaryDocDescription[i],
                });
            }

            logger.info(`Retrieved ${filings.length} filings for CIK: ${formattedCIK}`);
            return filings;
        } catch (error) {
            logger.error(`Failed to fetch filings for CIK: ${formattedCIK}`, { error });
            throw error;
        }
    }

    /**
     * Get company facts (financial data) by CIK
     */
    async getCompanyFacts(cik: string, options?: RequestOptions): Promise<SECCompanyFacts> {
        const formattedCIK = this.validateCIK(cik);
        logger.info(`Fetching company facts for CIK: ${formattedCIK}`);

        try {
            const response = await this.makeRequest<SECCompanyFacts>({
                method: 'GET',
                url: `/api/xbrl/companyfacts/CIK${formattedCIK}.json`,
            }, options);

            logger.info(`Retrieved company facts for: ${response.entityName}`);
            return response;
        } catch (error) {
            logger.error(`Failed to fetch company facts for CIK: ${formattedCIK}`, { error });
            throw error;
        }
    }

    /**
     * Get specific concept data for a company
     */
    async getCompanyConcept(
        cik: string,
        taxonomy: string,
        concept: string,
        options?: RequestOptions
    ): Promise<{
        cik: string;
        taxonomy: string;
        tag: string;
        label: string;
        description: string;
        entityName: string;
        units: any;
    }> {
        const formattedCIK = this.validateCIK(cik);
        logger.info(`Fetching company concept for CIK: ${formattedCIK}`, {
            taxonomy,
            concept
        });

        try {
            const response = await this.makeRequest({
                method: 'GET',
                url: `/api/xbrl/companyconcept/CIK${formattedCIK}/${taxonomy}/${concept}.json`,
            }, options);

            logger.info(`Retrieved concept data: ${concept} for ${response.entityName}`);
            return response;
        } catch (error) {
            logger.error(`Failed to fetch company concept for CIK: ${formattedCIK}`, {
                error,
                taxonomy,
                concept
            });
            throw error;
        }
    }

    /**
     * Search for mutual funds
     */
    async getMutualFunds(options?: RequestOptions): Promise<SECMutualFund[]> {
        logger.info('Fetching mutual funds data');

        try {
            // Note: This endpoint may need adjustment based on actual SEC API
            const response = await this.makeRequest<{
                data: SECMutualFund[];
            }>({
                method: 'GET',
                url: '/api/xbrl/frames/us-gaap/Assets/USD/CY2023Q4I.json',
            }, options);

            const funds = response.data || [];
            logger.info(`Retrieved ${funds.length} mutual funds`);
            return funds;
        } catch (error) {
            logger.error('Failed to fetch mutual funds', { error });
            // Return empty array instead of throwing for mutual funds
            return [];
        }
    }

    /**
     * Get filing document content
     */
    async getFilingDocument(
        cik: string,
        accessionNumber: string,
        primaryDocument: string,
        options?: RequestOptions
    ): Promise<string> {
        const formattedCIK = this.validateCIK(cik);
        const formattedAccession = accessionNumber.replace(/-/g, '');

        logger.info(`Fetching filing document`, {
            cik: formattedCIK,
            accessionNumber: formattedAccession,
            primaryDocument
        });

        try {
            const response = await this.makeRequest<string>({
                method: 'GET',
                url: `/Archives/edgar/data/${parseInt(formattedCIK)}/${formattedAccession}/${primaryDocument}`,
                responseType: 'text',
            }, options);

            logger.info(`Retrieved filing document (${response.length} characters)`);
            return response;
        } catch (error) {
            logger.error('Failed to fetch filing document', {
                error,
                cik: formattedCIK,
                accessionNumber: formattedAccession,
                primaryDocument
            });
            throw error;
        }
    }

    /**
     * Get company submissions summary
     */
    async getCompanySubmissions(cik: string, options?: RequestOptions): Promise<any> {
        const formattedCIK = this.validateCIK(cik);
        logger.info(`Fetching company submissions for CIK: ${formattedCIK}`);

        try {
            const response = await this.makeRequest({
                method: 'GET',
                url: `/api/xbrl/submissions/CIK${formattedCIK}.json`,
            }, options);

            logger.info(`Retrieved submissions data for CIK: ${formattedCIK}`);
            return response;
        } catch (error) {
            logger.error(`Failed to fetch company submissions for CIK: ${formattedCIK}`, { error });
            throw error;
        }
    }
}