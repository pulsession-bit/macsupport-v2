export interface StreamConfig {
  sampleRate: number;
}

export interface AudioStreamerConfig {
  inputSampleRate: number;
  outputSampleRate: number;
}

export type Language = 'fr' | 'en' | 'de' | 'th';

export interface TechnicalContext {
  model?: string;
  os?: string;
  serial?: string;
  issue?: string;
}

export interface Turn {
  input: string;
  output: string;
  seq?: number;
  timestamp?: unknown;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
