import { jest } from '@jest/globals';
// Jest setup file
// This file runs before each test file

// Helper to create a typed async mock that resolves to a value
const mockResolved = <T>(value: T) => {
  const fn = jest.fn(() => Promise.resolve(value)) as unknown as (() => Promise<T>);
  return fn;
};

// Mock console methods for cleaner test output
globalThis.console = {
  ...console,
  // Keep log and warn for debugging
  log: (jest.fn() as any),
  warn: (jest.fn() as any),
  error: (jest.fn() as any),
  debug: (jest.fn() as any),
  info: (jest.fn() as any)
};

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: 'error'
};

// Global test timeout
jest.setTimeout(30000);

// Mock ESM-only dependencies that Jest struggles to parse under ts-jest
jest.mock('p-retry', () => ({
  __esModule: true,
  default: (fn: any) => fn(),
  AbortError: class AbortError extends Error {}
}));

jest.mock('opossum', () => ({
  __esModule: true,
  default: class CircuitBreaker {
    public fallback: any;
    constructor(public action: any) {}
    async fire(...args: any[]) { return this.action(...args); }
    on() { /* noop */ }
  }
}));

// Mock external dependencies that require API keys
jest.mock('@langchain/openai', () => {
  const ChatOpenAI = (jest.fn() as any).mockImplementation(() => ({
    invoke: mockResolved({ content: 'mocked response' })
  }));
  class OpenAIEmbeddings {
    public options: any;
    constructor(opts: any) {
      this.options = opts;
    }
    async embedQuery(text: string): Promise<number[]> {
      return [0.1, 0.2, 0.3];
    }
    async embedDocuments(texts: string[]): Promise<number[][]> {
      return texts.map(() => [0.1, 0.2, 0.3]);
    }
  }
  return { ChatOpenAI, OpenAIEmbeddings };
});

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: (jest.fn() as any).mockImplementation(() => ({
    invoke: mockResolved({ content: 'mocked response' })
  }))
}));

jest.mock('@langchain/google-genai', () => {
  const ChatGoogleGenerativeAI = (jest.fn() as any).mockImplementation(() => ({
    invoke: mockResolved({ content: 'mocked response' })
  }));
  class GoogleGenerativeAIEmbeddings {
    public options: any;
    constructor(opts: any) {
      this.options = opts;
    }
    async embedQuery(text: string): Promise<number[]> {
      return [0.4, 0.5, 0.6];
    }
    async embedDocuments(texts: string[]): Promise<number[][]> {
      return texts.map(() => [0.4, 0.5, 0.6]);
    }
  }
  return { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings };
});

// Mock external APIs
jest.mock('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn()
    }))
  }
}));

// Mock file system operations
jest.mock('fs', () => {
  const actualFs = ( (jest as any).requireActual('fs') ) as Record<string, any>;
  return {
    ...actualFs,
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn()
  };
});