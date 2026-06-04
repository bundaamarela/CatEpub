import { afterEach, describe, expect, it } from 'vitest';

import { chat, generateText, isAiEnabled } from '@/lib/ai/client';
import { usePrefs } from '@/lib/store/prefs';

const reset = (): void => {
  usePrefs.setState({ aiProvider: 'none', aiApiKey: undefined });
};

afterEach(() => {
  reset();
});

describe('ai/client', () => {
  it('isAiEnabled returns false when provider is none', () => {
    usePrefs.setState({ aiProvider: 'none', aiApiKey: undefined });
    expect(isAiEnabled()).toBe(false);
  });

  it('isAiEnabled returns false when key is empty', () => {
    usePrefs.setState({ aiProvider: 'anthropic', aiApiKey: '' });
    expect(isAiEnabled()).toBe(false);
  });

  it('isAiEnabled returns true when provider is anthropic with non-empty key', () => {
    usePrefs.setState({ aiProvider: 'anthropic', aiApiKey: 'sk-ant-test' });
    expect(isAiEnabled()).toBe(true);
  });

  it('generateText returns null silently when AI is disabled', async () => {
    usePrefs.setState({ aiProvider: 'none', aiApiKey: undefined });
    const result = await generateText({ prompt: 'hello' });
    expect(result).toBeNull();
  });

  it('chat returns null silently when AI is disabled', async () => {
    usePrefs.setState({ aiProvider: 'none', aiApiKey: undefined });
    const result = await chat({ system: 's', messages: [{ role: 'user', content: 'hi' }] });
    expect(result).toBeNull();
  });
});
