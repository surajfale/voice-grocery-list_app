const COMPLETION_PRICING = {
  'gpt-4o-mini': {
    prompt: 0.003, // USD per 1K tokens
    completion: 0.009
  },
  'gpt-4o-mini-2024-07-18': {
    prompt: 0.003,
    completion: 0.009
  }
};

const EMBEDDING_PRICING = {
  'text-embedding-3-small': {
    prompt: 0.00002 // USD per 1K tokens
  },
  'text-embedding-3-large': {
    prompt: 0.00013
  }
};

const roundCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value * 10000) / 10000;
};

export const estimateCompletionCost = (model, usage = {}) => {
  if (!model || !COMPLETION_PRICING[model]) {
    return null;
  }

  const pricing = COMPLETION_PRICING[model];
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || usage.output_tokens || 0;

  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;

  return roundCurrency(promptCost + completionCost);
};

export const estimateEmbeddingCost = (model, usage = {}) => {
  if (!model || !EMBEDDING_PRICING[model]) {
    return null;
  }

  const pricing = EMBEDDING_PRICING[model];
  const promptTokens = usage.total_tokens || usage.prompt_tokens || 0;
  const totalCost = (promptTokens / 1000) * pricing.prompt;
  return roundCurrency(totalCost);
};

export default {
  estimateCompletionCost,
  estimateEmbeddingCost
};


