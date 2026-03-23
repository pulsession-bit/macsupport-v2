export interface StreamConfig {
  sampleRate: number;
}

export interface AudioStreamerConfig {
  inputSampleRate: number;
  outputSampleRate: number;
}

export type Language = 'fr' | 'en' | 'de' | 'th';
