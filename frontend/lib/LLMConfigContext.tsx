/**
 * LLM Configuration Context
 * Manages LLM provider settings globally
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LLMConfig, LLMProvider } from '@/types';
import { DEFAULT_CONFIG, saveConfig, loadConfig, getActiveConfig } from '@/services/llmProvider';

interface LLMConfigContextValue {
  config: LLMConfig;
  updateConfig: (updates: Partial<LLMConfig>) => void;
  resetConfig: () => void;
}

const LLMConfigContext = createContext<LLMConfigContextValue | undefined>(undefined);

interface LLMConfigProviderProps {
  children: ReactNode;
}

export const LLMConfigProvider: React.FC<LLMConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<LLMConfig>(getActiveConfig());

  useEffect(() => {
    // Load config on mount
    const loaded = getActiveConfig();
    setConfig(loaded);
  }, []);

  const updateConfig = (updates: Partial<LLMConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveConfig(updates);
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('llm_config');
  };

  return (
    <LLMConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </LLMConfigContext.Provider>
  );
};

export const useLLMConfig = (): LLMConfigContextValue => {
  const context = useContext(LLMConfigContext);
  if (!context) {
    throw new Error('useLLMConfig must be used within LLMConfigProvider');
  }
  return context;
};
