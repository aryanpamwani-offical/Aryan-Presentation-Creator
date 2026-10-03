export type AIProviderName = 'openrouter' | 'cloudflare' | 'gemini' | 'auto';

export interface AIProviderConfig {
    name: AIProviderName;
    isConfigured: boolean;
    generate: (
        promptContents: string,
        systemPrompt: string,
        mode: 'outline' | 'presentation'
    ) => Promise<string>;
}
