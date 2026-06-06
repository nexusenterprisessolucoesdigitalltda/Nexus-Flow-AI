export type MediaType = 'text' | 'document' | 'image' | 'audio';

export interface BotMessage {
  text: string;
  userId: string;
  userName?: string;
  chatId: string;
  mediaType: MediaType;
  mediaUrl?: string;
  mediaFileName?: string;
  reply: (text: string) => Promise<void>;
  replyWithMarkdown?: (text: string) => Promise<void>;
  sendTyping?: () => Promise<void>;
}

export interface PlatformAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface BotPlatform {
  readonly name: string;
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
  getInfo(): { name: string; uptime: number };
}
