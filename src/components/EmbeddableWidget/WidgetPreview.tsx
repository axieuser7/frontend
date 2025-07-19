import React, { useState } from 'react';
import { ChatWidget } from './ChatWidget';
import { BotConfig } from '../../types';

interface WidgetPreviewProps {
  botConfig: BotConfig;
  apiKey: string;
  provider: 'openai' | 'claude' | 'groq';
  position: 'bottom-right' | 'bottom-left';
}

export function WidgetPreview({ botConfig, apiKey, provider, position }: WidgetPreviewProps) {
  return (
    <div className="relative bg-gray-100 rounded-lg p-8 min-h-96 overflow-hidden">
      {/* Simulerad webbplats bakgrund */}
      <div className="absolute inset-0 p-8">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">Exempel på kundens webbplatsinnehåll</p>
        </div>
      </div>

      {/* Chatbot Widget */}
      <ChatWidget
        botConfig={{
          name: botConfig.name,
          welcomeMessage: botConfig.welcome_message,
          primaryColor: botConfig.primary_color,
          tone: botConfig.tone,
          personality: botConfig.personality,
        }}
        apiKey={apiKey}
        provider={provider}
        position={position}
        minimized={true}
      />
    </div>
  );
}