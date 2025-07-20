import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { userSupabaseService } from '../lib/userSupabaseService';
import { useAuth } from './AuthContext';
import { BotConfig, SupabaseConfig } from '../types';

interface RealtimeConfigContextType {
  botConfig: BotConfig | null;
  updateConfig: (config: Partial<BotConfig>) => Promise<void>;
  saveToUserSupabase: boolean;
  setSaveToUserSupabase: (save: boolean) => void;
  isConnected: boolean;
  lastUpdate: Date | null;
  loading: boolean;
  error: string | null;
}

const RealtimeConfigContext = createContext<RealtimeConfigContextType | undefined>(undefined);

export function RealtimeConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [saveToUserSupabase, setSaveToUserSupabase] = useState(false);
  const [userSupabaseConfig, setUserSupabaseConfig] = useState<SupabaseConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Load user's Supabase config to determine save preference
  useEffect(() => {
    if (user) {
      loadUserSupabaseConfig();
    }
  }, [user]);

  const loadUserSupabaseConfig = async () => {
    try {
      const { data } = await supabase
        .from('supabase_configs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setUserSupabaseConfig(data);
        setSaveToUserSupabase(true);
        
        // Try to load config from user's Supabase
        const userConfig = await userSupabaseService.loadBotConfigFromUserSupabase(data, user!.id);
        if (userConfig) {
          setBotConfig(userConfig);
          setLastUpdate(new Date());
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.log('No user Supabase config found, using main database');
    }
    
    // Fallback to main database
    loadInitialConfig();
  };
  // Load initial config
  const loadInitialConfig = useCallback(async () => {
    if (!user) {
      setBotConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading bot config for user:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading bot config:', fetchError);
        setError('Failed to load configuration');
        return;
      }

      console.log('Loaded bot config:', data);
      setBotConfig(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error in loadInitialConfig:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) {
      setBotConfig(null);
      setIsConnected(false);
      setLoading(false);
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      return;
    }

    // Load initial config
    loadInitialConfig();

    // Create real-time channel
    const realtimeChannel = supabase
      .channel(`bot_config_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bot_configs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time config update:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              setBotConfig(payload.new as BotConfig);
              setLastUpdate(new Date());
              
              // Emit custom event for backward compatibility
              const event = new CustomEvent('botConfigUpdated', { 
                detail: payload.new 
              });
              window.dispatchEvent(event);
              break;
              
            case 'DELETE':
              setBotConfig(null);
              setLastUpdate(new Date());
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(realtimeChannel);

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [user, loadInitialConfig]);

  // Update config function
  const updateConfig = useCallback(async (configUpdate: Partial<BotConfig>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Save to user's Supabase if configured
      if (saveToUserSupabase && userSupabaseConfig) {
        const updatedConfig = await userSupabaseService.saveBotConfigToUserSupabase(
          userSupabaseConfig,
          configUpdate,
          user.id
        );
        setBotConfig(updatedConfig);
        setLastUpdate(new Date());
        return;
      }

      // Fallback to main database
      if (botConfig?.id) {
        // Update existing config
        const updatedConfig = {
          ...configUpdate,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('bot_configs')
          .update(updatedConfig)
          .eq('id', botConfig.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating config:', error);
          throw error;
        }
      } else {
        // Create new config
        const newConfig = {
          user_id: user.id,
          name: 'AI Assistant',
          system_prompt: 'Du är en hjälpsam AI-assistent som svarar på svenska och hjälper användare med deras frågor.',
          tone: 'friendly' as const,
          primary_color: '#2563EB',
          welcome_message: 'Hej! Hur kan jag hjälpa dig idag?',
          company_information: '',
          ...configUpdate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('bot_configs')
          .insert([newConfig])
          .select()
          .single();

        if (error) {
          console.error('Error creating config:', error);
          throw error;
        }

        setBotConfig(data);
      }
    } catch (err) {
      console.error('Error in updateConfig:', err);
      throw err;
    }
  }, [user, botConfig, saveToUserSupabase, userSupabaseConfig]);

  return (
    <RealtimeConfigContext.Provider value={{
      botConfig,
      updateConfig,
      saveToUserSupabase,
      setSaveToUserSupabase,
      isConnected,
      lastUpdate,
      loading,
      error,
    }}>
      {children}
    </RealtimeConfigContext.Provider>
  );
}

export function useRealtimeConfig() {
  const context = useContext(RealtimeConfigContext);
  if (context === undefined) {
    throw new Error('useRealtimeConfig must be used within a RealtimeConfigProvider');
  }
  return context;
}