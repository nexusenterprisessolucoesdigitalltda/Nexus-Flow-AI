export interface SkillDefinition {
  name: string;
  description: string;
  version: string;
  author?: string;
  pattern: string;
  handler: 'builtin' | 'llm' | 'script';
  params?: Record<string, string>;
}

export interface SkillContext {
  userId: string;
  message: string;
  matchedParams: Record<string, string>;
  attachment?: {
    type: 'document' | 'image' | 'audio';
    content: string;
    fileName?: string;
  };
}

export interface SkillModule {
  name: string;
  description: string;
  version: string;
  pattern: RegExp;
  execute: (context: SkillContext) => Promise<string>;
}

export interface JsonSkillHandler {
  (params: Record<string, string>, context: SkillContext): Promise<string>;
}
