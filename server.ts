import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Shared Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `
You are "Ari", a warm, confident, upbeat, and concise AI assistant acting as a friendly professional recruiter and talking CV for Artjom Alihodzin.

PERSONALITY & SPEAKING STYLE:
- Warm, confident, upbeat, concise, and articulate (like a top-tier executive recruiter or executive peer).
- Speak in SHORT, SPOKEN-STYLE answers: strictly 2 to 4 sentences per response. Never monologue or give long lists.
- After your brief answer, warmly offer to go deeper into a specific achievement, story, or detail.
- When the conversation begins or you are prompted to greet, your very first spoken words MUST BE EXACTLY:
  "Hello, I am Artjom's assistant, what would you like to know about him?"
- Language adaptation: If the visitor speaks Estonian, reply in natural, professional Estonian. If they speak Russian, reply in fluent, natural Russian. Otherwise reply in English.
- STRICT FACTUAL INTEGRITY: Only state facts from the verified knowledge base below. If a visitor asks something not covered (personal contact details like private phone/home address, unverified opinions, speculations, or fabricated numbers), say with professional warmth: "I don't have that specific information, but I'd suggest reaching out to Artjom directly." Never invent numbers, projects, or credentials.

VERIFIED KNOWLEDGE BASE ABOUT ARTJOM ALIHODZIN:
- Identity & Base: Artjom Alihodzin, based in Tallinn, Estonia.
- Education: Third-year student of International Business Administration at Estonian Business School (EBS). Currently studying Growth Hacking with AI and Digital Product Development at EBS.
- Entrepreneurship: Owner and manager of Sautin OÜ, an Estonian micro-company.
- Southwestern Advantage (Sales Manager, with company since November 2021):
  - Five summer seasons of direct door-to-door sales in the United States (rural Minnesota).
  - Over $300,000 in personal sales revenue.
  - Over $100,000 in sales revenue generated from his personal sales team.
  - Recruited 7 people, coached and led them on the ground in the US.
  - Coached 3 people specifically on recruiting and preparing new sales representatives.
- Direct-to-Consumer Sales Project for G4S (February to May 2024):
  - Led a team of 10 on a Southwestern Ventures direct-to-consumer sales project for G4S in Estonia.
  - Successfully sold 500+ subscription products in just 10 weeks.
- Core Strengths: Sales, leadership, coaching, resilience, self-motivation, and self-sufficiency.
- Languages:
  - English: Professional proficiency (IELTS B2)
  - Estonian: Professional level
  - Russian: Fluent
- Personal Interests: Sales methodology, personal growth, data-driven fitness and performance, and leveraging AI in modern business.
`;

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    voice: 'Ari',
    subject: 'Artjom Alihodzin',
  });
});

// Artjom's profile data endpoint for instant client-side summary card
app.get('/api/profile', (_req, res) => {
  res.json({
    name: 'Artjom Alihodzin',
    tagline: 'Business student, sales leader, founder',
    location: 'Tallinn, Estonia',
    education: {
      institution: 'Estonian Business School (EBS)',
      degree: 'International Business Administration (3rd year)',
      currentFocus: ['Growth Hacking with AI', 'Digital Product Development'],
    },
    ventures: [
      {
        role: 'Owner & Manager',
        company: 'Sautin OÜ',
        description: 'Estonian micro-company',
      },
      {
        role: 'Sales Manager',
        company: 'Southwestern Advantage',
        period: 'Nov 2021 – Present',
        stats: [
          '5 summer seasons door-to-door sales in rural Minnesota, USA',
          '$300,000+ personal sales revenue',
          '$100,000+ personal team sales revenue',
          'Recruited 7 reps, led & coached on the ground in USA',
          'Coached 3 team leaders on recruiting & onboarding',
        ],
      },
      {
        role: 'Team Lead (Southwestern Ventures)',
        company: 'G4S Estonia Project',
        period: 'Feb 2024 – May 2024',
        stats: [
          'Led team of 10 on direct-to-consumer sales initiative',
          '500+ subscription products sold in 10 weeks',
        ],
      },
    ],
    strengths: ['Sales', 'Leadership', 'Coaching', 'Resilience', 'Self-motivation', 'Self-sufficiency'],
    languages: [
      { language: 'English', level: 'Professional (IELTS B2)' },
      { language: 'Estonian', level: 'Professional level' },
      { language: 'Russian', level: 'Fluent' },
    ],
    interests: ['Sales methodology', 'Personal growth', 'Data-driven fitness & performance', 'AI in business'],
  });
});

// Setup WebSocket server for Gemini Live Audio streaming
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live] Client connected');
  let liveSession: any = null;
  let isClosed = false;
  const earlyMessageQueue: any[] = [];

  const sendToClient = (payload: object) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  };

  const processClientMessage = (msg: any) => {
    if (!liveSession) {
      earlyMessageQueue.push(msg);
      return;
    }

    try {
      if (msg.type === 'start_greeting') {
        console.log('[Live] Triggering opening greeting from Ari');
        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: 'The conversation is starting now. Greet me with your required opening line.',
                },
              ],
            },
          ],
          turnComplete: true,
        });
      } else if (msg.type === 'audio' && msg.audio) {
        liveSession.sendRealtimeInput({
          audio: {
            data: msg.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (msg.type === 'text' && msg.text) {
        console.log('[Live] Received text query:', msg.text);
        liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text: msg.text }],
            },
          ],
          turnComplete: true,
        });
      } else if (msg.type === 'stop') {
        try {
          liveSession.sendRealtimeInput({ endOfTurn: true });
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('[Live] Error executing client message:', err);
    }
  };

  // Listen to client messages immediately
  clientWs.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      processClientMessage(msg);
    } catch (err) {
      console.error('[Live] Error parsing client message:', err);
    }
  });

  try {
    // Establish connection with Gemini Live API using gemini-3.8-live
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      callbacks: {
        onopen: () => {
          console.log('[Live] Connected to Gemini Live backend');
        },
        onmessage: (message: any) => {
          if (isClosed) return;

          // Handle audio parts from model turn
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts && Array.isArray(parts)) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                sendToClient({
                  type: 'audio',
                  audio: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                });
              }
            }
          }

          // Handle real-time speech output transcription
          if (message.serverContent?.outputTranscription?.text) {
            sendToClient({
              type: 'output_transcription',
              text: message.serverContent.outputTranscription.text,
            });
          }

          // Handle visitor input speech transcription
          if (message.serverContent?.inputTranscription?.text) {
            sendToClient({
              type: 'input_transcription',
              text: message.serverContent.inputTranscription.text,
            });
          }

          // Handle user interruption event
          if (message.serverContent?.interrupted) {
            sendToClient({ type: 'interrupted' });
          }

          // Handle turn complete event
          if (message.serverContent?.turnComplete || message.serverContent?.generationComplete) {
            sendToClient({ type: 'turn_complete' });
          }
        },
        onerror: (err: any) => {
          console.error('[Live] Gemini session error:', err);
          sendToClient({
            type: 'error',
            message: err?.message || 'Error from voice model session',
          });
        },
        onclose: (event: any) => {
          console.log('[Live] Gemini session closed:', event?.code, event?.reason);
          sendToClient({ type: 'closed', reason: event?.reason });
        },
      },
    });

    console.log('[Live] LiveSession initialized, notifying client');
    sendToClient({ type: 'ready' });

    // Process any queued messages
    while (earlyMessageQueue.length > 0) {
      const queuedMsg = earlyMessageQueue.shift();
      processClientMessage(queuedMsg);
    }

    clientWs.on('close', () => {
      console.log('[Live] Client disconnected');
      isClosed = true;
      try {
        if (liveSession) {
          liveSession.close();
        }
      } catch (err) {
        console.error('[Live] Error closing live session:', err);
      }
    });

    clientWs.on('error', (err) => {
      console.error('[Live] Client WebSocket error:', err);
      isClosed = true;
      try {
        if (liveSession) {
          liveSession.close();
        }
      } catch {
        // ignore
      }
    });
  } catch (err: any) {
    console.error('[Live] Failed to initialize Gemini session:', err);
    sendToClient({
      type: 'error',
      message: err?.message || 'Failed to initialize voice session',
    });
  }
});

// Mount Vite or static build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
