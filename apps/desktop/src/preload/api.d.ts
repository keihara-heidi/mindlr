import type { MindlrApi } from './settings';

declare global {
  interface Window {
    mindlr: MindlrApi;
  }
}

export {};
