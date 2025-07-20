import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { BotConfig } from '../types';

interface RealtimeConfigContextType {
  botConfig: BotConfig | null;
  updateConfig: (config: Partial<BotConfig>) => void;
  isConnected: boolean;
  lastUpdate: Date | null;
}

const RealtimeConfigContext = createContext<RealtimeConfigContextType | undefined>(undefined);

export function RealtimeConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Load initial config
  const loadInitialConfig = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading bot config:', error);
        return;
      }

      if (data) {
        setBotConfig(data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Error in loadInitialConfig:', err);
    }
  }, [user]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) {
      setBotConfig(null);
      setIsConnected(false);
      return;
    }

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
    if (!user || !botConfig) return;

    try {
      const updatedConfig = {
        ...botConfig,
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
        return;
      }

      // The real-time subscription will handle the state update
    } catch (err) {
      console.error('Error in updateConfig:', err);
    }
  }, [user, botConfig]);

  return (
    <RealtimeConfigContext.Provider value={{
      botConfig,
      updateConfig,
      isConnected,
      lastUpdate,
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