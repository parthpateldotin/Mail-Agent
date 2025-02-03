export interface LLMConfig {
  provider: 'openai';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompts: {
    contextAnalysis: string;
    responseGeneration: string;
    responseValidation: string;
  };
}

export const llmConfig: LLMConfig = {
  provider: 'openai',
  apiKey: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'gpt-4',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
  systemPrompts: {
    contextAnalysis: `You are an AI email assistant tasked with analyzing incoming emails.
Your goal is to understand the email's intent, identify key entities, and determine if a response is required.
Consider tone, urgency, and business context in your analysis.`,
    
    responseGeneration: `You are an AI email assistant tasked with generating professional email responses.
Your responses should be clear, concise, and maintain a professional tone while addressing all points raised in the original email.
Ensure responses are contextually appropriate and follow business etiquette.`,
    
    responseValidation: `You are an AI email assistant tasked with validating email responses.
Check for professionalism, completeness, accuracy, and appropriateness of the response.
Ensure all key points from the original email are addressed and the tone matches the context.`
  }
}; 