# Svensk Chatbot-plattform

En komplett, anpassningsbar chatbot-plattform byggd med React, TypeScript och Supabase.

## 🚀 Funktioner

- **Användarautentisering** - Säker inloggning via Supabase Auth
- **Anpassningsbara chatbots** - Konfigurera personlighet, tonfall och utseende
- **Multi-LLM stöd** - Integration med OpenAI, Claude, Groq och fler
- **Säker API-nyckelhantering** - Krypterad lagring av API-nycklar
- **Inbäddningsbar widget** - Lätt att integrera på vilken webbplats som helst
- **Widget-generator** - Automatisk kodgenerering för enkel implementation
- **Responsiv design** - Fungerar perfekt på alla enheter
- **Svenska språkstöd** - Fullständigt lokaliserat gränssnitt

## 🛠️ Teknisk stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **Routing**: React Router v6
- **Ikoner**: Lucide React
- **Build tool**: Vite

## 📋 Krav

- Node.js 18+ 
- npm eller yarn
- Supabase-konto

## ⚡ Snabbstart

1. **Klona projektet**
   ```bash
   git clone <repository-url>
   cd chatbot-platform
   ```

2. **Installera beroenden**
   ```bash
   npm install
   ```

3. **Konfigurera Supabase**
   - Skapa ett nytt projekt på [supabase.com](https://supabase.com)
   - Kopiera din Project URL och anon key
   - Uppdatera `src/lib/supabase.ts` med dina uppgifter:
   ```typescript
   const supabaseUrl = 'DIN_SUPABASE_URL';
   const supabaseKey = 'DIN_SUPABASE_ANON_KEY';
   ```

4. **Konfigurera databasen**
   - Öppna SQL Editor i Supabase Dashboard
   - Kör SQL-koden från `src/lib/database.sql`

5. **Starta utvecklingsservern**
   ```bash
   npm run dev
   ```

## 🗄️ Databasschema

Plattformen använder följande tabeller:

- `bot_configs` - Chatbot-konfigurationer
- `api_keys` - Krypterade API-nycklar  
- `supabase_configs` - Konfiguration för externa Supabase-projekt
- `chat_sessions` - Chat-sessioner
- `chat_messages` - Chat-meddelanden

## 🔐 Säkerhet

- **Row Level Security (RLS)** aktiverat på alla tabeller
- **API-nycklar krypteras** innan lagring
- **Användarseparation** - användare kan endast se sina egna data
- **Autentisering krävs** för alla känsliga operationer

## 📱 Användning

1. **Registrera/Logga in** - Skapa ett konto eller logga in
2. **Konfigurera din bot** - Anpassa namn, personlighet och utseende
3. **Lägg till API-nycklar** - Konfigurera LLM-providers (OpenAI, Claude, etc.)
4. **Testa chatbot** - Använd den inbyggda chat-gränssnittet
5. **Generera widget-kod** - Skapa inbäddningskod för kundens webbplats
6. **Implementera på webbplats** - Klistra in koden och börja chatta

## 🔗 Widget-inbäddning

Plattformen genererar automatiskt inbäddningskod för:

### HTML/JavaScript (Vanilla)
```html
<div id="chatbot-widget"></div>
<script>
  window.ChatbotConfig = {
    botConfig: { /* din konfiguration */ },
    apiKey: "din-api-nyckel",
    provider: "openai",
    position: "bottom-right"
  };
</script>
<script src="https://din-domän.se/chatbot-widget.js"></script>
```

### React Component
```jsx
import { ChatWidget } from '@din-organisation/chatbot-widget';

function App() {
  return (
    <ChatWidget
      botConfig={botConfig}
      apiKey="din-api-nyckel"
      provider="openai"
      position="bottom-right"
    />
  );
}
```

### Stödda plattformar
- **Vanilla HTML/JS** - Fungerar på alla webbplatser
- **React/Next.js** - NPM-paket tillgängligt
- **WordPress** - Via Custom HTML widget
- **Shopify** - Lägg till i tema-filer
- **Squarespace** - Code injection
- **Wix** - HTML embed

## 🔌 LLM-integration

Plattformen stöder:
- **OpenAI** (GPT-3.5, GPT-4)
- **Anthropic Claude** (Claude-3)
- **Groq** (Snabba open-source modeller)

Lägg till fler providers genom att uppdatera:
- `src/types/index.ts` - Lägg till provider-typ
- `src/components/ApiKeys/ApiKeyManager.tsx` - Lägg till UI-stöd

## 🎨 Anpassning

### Widget-anpassning
Widgeten kan anpassas med:
- **Position** - Höger eller vänster hörn
- **Färger** - Primärfärg och tema
- **Meddelanden** - Välkomsttext och tonfall
- **Storlek** - Responsiv design
- **Animationer** - Mjuka övergångar

### Färger och tema
Uppdatera `tailwind.config.js` för globala färgändringar.

### Språk
Alla UI-texter är på svenska. För internationalisering, överväg att använda `react-i18next`.

### Komponenter
Modulär arkitektur gör det enkelt att lägga till nya funktioner:
- `src/components/` - React-komponenter
- `src/lib/` - Utilities och konfiguration
- `src/types/` - TypeScript-typdefinitioner

## 📚 API-referens

### Auth Context
```typescript
const { user, signIn, signUp, signOut } = useAuth();
```

### Supabase Client
```typescript
import { supabase } from './lib/supabase';

// Läs data
const { data, error } = await supabase
  .from('bot_configs')
  .select('*')
  .eq('user_id', user.id);

// Skriv data  
const { error } = await supabase
  .from('bot_configs')
  .insert({ name: 'Min Bot', user_id: user.id });
```

## 🚀 Deployment

### Netlify
```bash
npm run build
# Ladda upp dist/ mappen till Netlify
```

### Vercel
```bash
npm run build
vercel --prod
```

## 🤝 Bidrag

1. Forka projektet
2. Skapa en feature branch (`git checkout -b feature/ny-funktion`)
3. Commita dina ändringar (`git commit -am 'Lägg till ny funktion'`)
4. Pusha till branchen (`git push origin feature/ny-funktion`)
5. Skapa en Pull Request

## 📝 Licens

MIT License - se [LICENSE](LICENSE) för detaljer.

## 🆘 Support

- **Dokumentation**: Se README och kommentarer i koden
- **Issues**: Rapportera buggar via GitHub Issues
- **Discord**: Gå med i vår community för snabb hjälp

---

Byggd med ❤️ av svenska utvecklare för svenska användare.