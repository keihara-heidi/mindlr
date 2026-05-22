import type { MindlrApi } from '@preload/settings';

declare global {
  interface Window {
    mindlr: MindlrApi;
  }
}

export {};
