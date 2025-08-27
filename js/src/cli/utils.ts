import { input, select, checkbox } from '@inquirer/prompts';
import { AnalystType, AnalystOption, DepthOption, LLMOption, ProviderOption } from './types';

export const ANALYST_ORDER: AnalystOption[] = [
  { display: "Market Analyst", value: AnalystType.MARKET },
  { display: "Social Media Analyst", value: AnalystType.SOCIAL },
  { display: "News Analyst", value: AnalystType.NEWS },
  { display: "Fundamentals Analyst", value: AnalystType.FUNDAMENTALS }
];

export const DEPTH_OPTIONS: DepthOption[] = [
  { display: "Shallow - Quick research, few debate and strategy discussion rounds", value: 1 },
  { display: "Medium - Middle ground, moderate debate rounds and strategy discussion", value: 3 },
  { display: "Deep - Comprehensive research, in depth debate and strategy discussion", value: 5 }
];

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { display: "OpenAI", url: "https://api.openai.com/v1" },
  { display: "Anthropic", url: "https://api.anthropic.com/" },
  { display: "Google", url: "https://generativelanguage.googleapis.com/v1" },
  { display: "LM Studio", url: "http://localhost:1234/v1" },
  { display: "Openrouter", url: "https://openrouter.ai/api/v1" },
  { display: "Ollama", url: "http://localhost:11434/v1" }
];

export const SHALLOW_AGENT_OPTIONS: Record<string, LLMOption[]> = {
  "openai": [
    { display: "GPT-4o-mini - Fast and efficient for quick tasks", value: "gpt-4o-mini" },
    { display: "GPT-4.1-nano - Ultra-lightweight model for basic operations", value: "gpt-4.1-nano" },
    { display: "GPT-4.1-mini - Compact model with good performance", value: "gpt-4.1-mini" },
    { display: "GPT-4o - Standard model with solid capabilities", value: "gpt-4o" }
  ],
  "anthropic": [
    { display: "Claude Haiku 3.5 - Fast inference and standard capabilities", value: "claude-3-5-haiku-latest" },
    { display: "Claude Sonnet 3.5 - Highly capable standard model", value: "claude-3-5-sonnet-latest" },
    { display: "Claude Sonnet 3.7 - Exceptional hybrid reasoning and agentic capabilities", value: "claude-3-7-sonnet-latest" },
    { display: "Claude Sonnet 4 - High performance and excellent reasoning", value: "claude-sonnet-4-0" }
  ],
  "google": [
    { display: "Gemini 2.0 Flash-Lite - Cost efficiency and low latency", value: "gemini-2.0-flash-lite" },
    { display: "Gemini 2.0 Flash - Next generation features, speed, and thinking", value: "gemini-2.0-flash" },
    { display: "Gemini 2.5 Flash - Adaptive thinking, cost efficiency", value: "gemini-2.5-flash-preview-05-20" }
  ],
  "lm_studio": [
    { display: "Local Model - Default LM Studio model", value: "local-model" }
  ],
  "openrouter": [
    { display: "Meta: Llama 4 Scout", value: "meta-llama/llama-4-scout:free" },
    { display: "Meta: Llama 3.3 8B Instruct - A lightweight and ultra-fast variant of Llama 3.3 70B", value: "meta-llama/llama-3.3-8b-instruct:free" },
    { display: "google/gemini-2.0-flash-exp:free - Gemini Flash 2.0 offers a significantly faster time to first token", value: "google/gemini-2.0-flash-exp:free" }
  ],
  "ollama": [
    { display: "llama3.1 local", value: "llama3.1" },
    { display: "llama3.2 local", value: "llama3.2" }
  ]
};

export const DEEP_AGENT_OPTIONS: Record<string, LLMOption[]> = {
  "openai": [
    { display: "GPT-4.1-nano - Ultra-lightweight model for basic operations", value: "gpt-4.1-nano" },
    { display: "GPT-4.1-mini - Compact model with good performance", value: "gpt-4.1-mini" },
    { display: "GPT-4o - Standard model with solid capabilities", value: "gpt-4o" },
    { display: "o4-mini - Specialized reasoning model (compact)", value: "o4-mini" },
    { display: "o3-mini - Advanced reasoning model (lightweight)", value: "o3-mini" },
    { display: "o3 - Full advanced reasoning model", value: "o3" },
    { display: "o1 - Premier reasoning and problem-solving model", value: "o1" }
  ],
  "anthropic": [
    { display: "Claude Haiku 3.5 - Fast inference and standard capabilities", value: "claude-3-5-haiku-latest" },
    { display: "Claude Sonnet 3.5 - Highly capable standard model", value: "claude-3-5-sonnet-latest" },
    { display: "Claude Sonnet 3.7 - Exceptional hybrid reasoning and agentic capabilities", value: "claude-3-7-sonnet-latest" },
    { display: "Claude Sonnet 4 - High performance and excellent reasoning", value: "claude-sonnet-4-0" },
    { display: "Claude Opus 4 - Most powerful Anthropic model", value: "claude-opus-4-0" }
  ],
  "google": [
    { display: "Gemini 2.0 Flash-Lite - Cost efficiency and low latency", value: "gemini-2.0-flash-lite" },
    { display: "Gemini 2.0 Flash - Next generation features, speed, and thinking", value: "gemini-2.0-flash" },
    { display: "Gemini 2.5 Flash - Adaptive thinking, cost efficiency", value: "gemini-2.5-flash-preview-05-20" },
    { display: "Gemini 2.5 Pro", value: "gemini-2.5-pro-preview-06-05" }
  ],
  "lm_studio": [
    { display: "Local Model - Default LM Studio model", value: "local-model" }
  ],
  "openrouter": [
    { display: "DeepSeek V3 - a 685B-parameter, mixture-of-experts model", value: "deepseek/deepseek-chat-v3-0324:free" },
    { display: "Deepseek - latest iteration of the flagship chat model family from the DeepSeek team.", value: "deepseek/deepseek-chat-v3-0324:free" }
  ],
  "ollama": [
    { display: "llama3.1 local", value: "llama3.1" },
    { display: "qwen3", value: "qwen3" }
  ]
};

export async function getTicker(): Promise<string> {
  const ticker = await input({
    message: 'Enter the ticker symbol to analyze:',
    default: 'SPY',
    validate: (input: string) => {
      if (input.trim().length === 0) {
        return 'Please enter a valid ticker symbol.';
      }
      return true;
    }
  });
  
  return ticker.trim().toUpperCase();
}

export async function getAnalysisDate(): Promise<string> {
  const defaultDate = new Date().toISOString().split('T')[0]!;
  
  const date = await input({
    message: 'Enter the analysis date (YYYY-MM-DD):',
    default: defaultDate,
    validate: (input: string): string | boolean => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(input)) {
        return 'Please enter a valid date in YYYY-MM-DD format.';
      }
      
      try {
        const date = new Date(input);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date > today) {
          return 'Analysis date cannot be in the future.';
        }
        
        return true;
      } catch {
        return 'Please enter a valid date in YYYY-MM-DD format.';
      }
    }
  });
  
  return date.trim();
}

export async function selectAnalysts(): Promise<AnalystType[]> {
  const analysts = await checkbox({
    message: 'Select Your [Analysts Team]:',
    choices: ANALYST_ORDER.map(option => ({
      name: option.display,
      value: option.value
    }))
  });
  
  if (analysts.length === 0) {
    throw new Error('You must select at least one analyst.');
  }
  
  return analysts;
}

export async function selectResearchDepth(): Promise<number> {
  const depth = await select({
    message: 'Select Your [Research Depth]:',
    choices: DEPTH_OPTIONS.map(option => ({
      name: option.display,
      value: option.value
    }))
  });
  
  return depth;
}

export async function selectLLMProvider(): Promise<{ provider: string; url: string }> {
  const providerChoice = await select({
    message: 'Select your LLM Provider:',
    choices: PROVIDER_OPTIONS.map(option => ({
      name: `${option.display} - ${option.url}`,
      value: { provider: option.display, url: option.url }
    }))
  });
  
  console.log(`You selected: ${providerChoice.provider}\tURL: ${providerChoice.url}`);
  return providerChoice;
}

export async function selectShallowThinkingAgent(provider: string): Promise<string> {
  // Map display names to internal keys
  const providerKey = provider.toLowerCase().replace(/\s+/g, '_');
  const options = SHALLOW_AGENT_OPTIONS[providerKey] || [];
  
  if (options.length === 0) {
    throw new Error(`No shallow thinking options available for provider: ${provider}`);
  }
  
  const agent = await select({
    message: 'Select Your [Quick-Thinking LLM Engine]:',
    choices: options.map(option => ({
      name: option.display,
      value: option.value
    }))
  });
  
  return agent;
}

export async function selectDeepThinkingAgent(provider: string): Promise<string> {
  // Map display names to internal keys
  const providerKey = provider.toLowerCase().replace(/\s+/g, '_');
  const options = DEEP_AGENT_OPTIONS[providerKey] || [];
  
  if (options.length === 0) {
    throw new Error(`No deep thinking options available for provider: ${provider}`);
  }
  
  const agent = await select({
    message: 'Select Your [Deep-Thinking LLM Engine]:',
    choices: options.map(option => ({
      name: option.display,
      value: option.value
    }))
  });
  
  return agent;
}