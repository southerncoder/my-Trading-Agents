// src/clients/SECClient.ts
import { BaseClient } from '../base/BaseClient';
import { 
  SECCompany, 
  SECFiling, 
  SECCompanyFacts, 
  SECMutualFund,
  RequestOptions,
  ApiResponse 
} from '../types';

export class SECClient extends BaseClient {
  constructor(userAgent?: string) {
    super('https://data.sec.gov', userAgent);
  }

  /**
   * Get all company tickers with their CIK mappings
   */
  async getCompanyTickers(options?: RequestOptions): Promise<{ [ticker: string]: SECCompany }> {
    return this.makeRequest<{ [ticker: string]: SECCompany }>({
      method: 'GET',
      url: '/api/xbrl/companyfacts.json',
    }, options);
  }

  /**
   * Get company information by ticker symbol
   */
  async getCompanyByTicker(ticker: string, options?: RequestOptions): Promise<SECCompany | null> {
    const companies = await this.getCompanyTickers(options);
    const company = Object.values(companies).find(
      c => c.ticker?.toLowerCase() === ticker.toLowerCase()
    );
    return company || null;
  }

  /**
   * Get company information by CIK
   */
  async getCompanyByCIK(cik: string, options?: RequestOptions): Promise<SECCompany | null> {
    const formattedCIK = this.validateCIK(cik);
    const companies = await this.getCompanyTickers(options);
    const company = Object.values(companies).find(
      c => c.cik_str === formattedCIK
    );
    return company || null;
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

    return filings;
  }

  /**
   * Get company facts (financial data) by CIK
   */
  async getCompanyFacts(cik: string, options?: RequestOptions): Promise<SECCompanyFacts> {
    const formattedCIK = this.validateCIK(cik);
    
    return this.makeRequest<SECCompanyFacts>({
      method: 'GET',
      url: `/api/xbrl/companyfacts/CIK${formattedCIK}.json`,
    }, options);
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
    
    return this.makeRequest({
      method: 'GET',
      url: `/api/xbrl/companyconcept/CIK${formattedCIK}/${taxonomy}/${concept}.json`,
    }, options);
  }

  /**
   * Search for mutual funds
   */
  async getMutualFunds(options?: RequestOptions): Promise<SECMutualFund[]> {
    const response = await this.makeRequest<{
      data: SECMutualFund[];
    }>({
      method: 'GET',
      url: '/api/xbrl/frames/us-gaap/Assets/USD/CY2023Q4I.json', // This is a placeholder - actual endpoint may differ
    }, options);

    return response.data || [];
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
    
    return this.makeRequest<string>({
      method: 'GET',
      url: `/Archives/edgar/data/${parseInt(formattedCIK)}/${formattedAccession}/${primaryDocument}`,
      responseType: 'text',
    }, options);
  }
}