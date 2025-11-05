import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, FunctionDeclaration, Type, Blob } from '@google/genai';
import { BotStatus, Transcript, PrebuiltVoice } from './types';
import { decode, decodeAudioData, encode } from './utils/audioUtils';
import { BotIcon, HistoryIcon, SettingsIcon } from './components/icons';
import { SettingsPanel } from './components/SettingsPanel';
import { translations, Language } from './utils/translations';

// Define App-specific types for clarity
export type BotExpression = 'neutral' | 'concerned' | 'alert' | 'happy' | 'focused';
export type AvatarTheme = 'emerald' | 'sapphire' | 'ruby';

export interface AppSettings {
    name: string;
    voice: PrebuiltVoice;
    avatarTheme: AvatarTheme;
    language: Language;
}

interface IncidentReport {
  description: string;
  location: string;
  timestamp: string;
}

// Define Gemini Function Declarations for the AI to use
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'record_safety_incident',
    description: 'Records a safety incident or hazard reported by a user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: 'A detailed description of the incident.' },
        location: { type: Type.STRING, description: 'The specific location where the incident occurred.' },
      },
      required: ['description', 'location'],
    },
  },
  {
    name: 'get_weather_update',
    description: 'Gets the current weather and underground conditions for a specific location.',
    parameters: {
      type: Type.OBJECT,
      properties: { location: { type: Type.STRING, description: 'The mining site or area.' } },
      required: ['location'],
    },
  },
  {
    name: 'send_sms_alert',
    description: 'Sends an SMS alert to a supervisor or headquarters.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'The recipient, e.g., "supervisor", "headquarters".' },
        message: { type: Type.STRING, description: 'The content of the message.' },
      },
      required: ['recipient', 'message'],
    },
  },
  {
    name: 'mark_team_attendance',
    description: 'Marks the attendance for an entire team.',
    parameters: {
      type: Type.OBJECT,
      properties: { team_id: { type: Type.STRING, description: 'The ID or name of the team.' } },
      required: ['team_id'],
    },
  },
];

const App: React.FC = () => {
  // Core application state
  const [status, setStatus] = useState<BotStatus>(BotStatus.IDLE);
  const [expression, setExpression] = useState<BotExpression>('neutral');
  const [transcripts, setTranscripts] = useState<Transcript[]>(() => {
    try {
        const saved = localStorage.getItem('transcripts');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>(() => {
    try {
        const saved = localStorage.getItem('incidentReports');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [error, setError] = useState<string | null>(null);
  
  // UI visibility state
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  
  // User-configurable settings
  const [settings, setSettings] = useState<AppSettings>({
    name: 'Jaaved Khan',
    voice: 'Kore',
    avatarTheme: 'emerald',
    language: 'en',
  });

  // Refs for managing asynchronous operations and browser/API resources
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const statusRef = useRef(status); // Ref to track status in callbacks, avoiding stale closures

  // Load settings from localStorage on initial component mount
  useEffect(() => {
    try {
      const savedSettings = {
        name: localStorage.getItem('aiName') || 'Jaaved Khan',
        voice: (localStorage.getItem('aiVoice') as PrebuiltVoice) || 'Kore',
        avatarTheme: (localStorage.getItem('aiAvatarTheme') as AvatarTheme) || 'emerald',
        language: (localStorage.getItem('aiLanguage') as Language) || 'en',
      };
      setSettings(savedSettings);
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    }
  }, []);

  // Persist settings to localStorage whenever they change
  const handleSettingsChange = (newSettings: AppSettings) => {
    const oldSettings = settings;
    setSettings(newSettings);
    try {
        localStorage.setItem('aiName', newSettings.name);
        localStorage.setItem('aiVoice', newSettings.voice);
        localStorage.setItem('aiAvatarTheme', newSettings.avatarTheme);
        localStorage.setItem('aiLanguage', newSettings.language);
    } catch (e) {
        console.error("Failed to save settings to localStorage", e);
    }

    // If a setting that requires a session restart is changed during an active session,
    // end the current session so the new settings can be applied on the next start.
    const requiresRestart =
      oldSettings.voice !== newSettings.voice ||
      oldSettings.language !== newSettings.language ||
      oldSettings.name !== newSettings.name;

    const isSessionActive = statusRef.current !== BotStatus.IDLE && statusRef.current !== BotStatus.ERROR;

    if (requiresRestart && isSessionActive) {
      stopConversation();
    }
  };

  // Persist transcripts and incidents to localStorage
  useEffect(() => {
    try {
        localStorage.setItem('transcripts', JSON.stringify(transcripts));
    } catch (e) { console.error("Failed to save transcripts", e); }
  }, [transcripts]);

  useEffect(() => {
    try {
        localStorage.setItem('incidentReports', JSON.stringify(incidentReports));
    } catch (e) { console.error("Failed to save incident reports", e); }
  }, [incidentReports]);

  // Keep statusRef synchronized with the status state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const handleClearHistory = () => {
    if (window.confirm(translations[settings.language].clearHistoryConfirm)) {
        setTranscripts([]);
        setIncidentReports([]);
        localStorage.removeItem('transcripts');
        localStorage.removeItem('incidentReports');
        setIsSettingsVisible(false); // Close panel after action
    }
  };
  
  /**
   * Comprehensive cleanup function to stop the conversation and release all resources.
   * This is critical for preventing memory leaks and ensuring the app can be started again cleanly.
   */
  const stopConversation = useCallback(async () => {
    setStatus(BotStatus.IDLE);
    setExpression('neutral');

    // 1. Stop all queued audio playback
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    // 2. Stop visualization animation
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // 3. Close the Gemini session
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
        }
    }
    
    // 4. Stop microphone stream
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    // 5. Disconnect and close audio processing nodes and contexts
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    if (inputAudioContextRef.current?.state !== 'closed') await inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') await outputAudioContextRef.current?.close();

    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
  }, []);

  // Effect to ensure cleanup runs when the component unmounts
  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  /**
   * Starts the conversation by acquiring permissions, setting up audio pipelines,
   * and connecting to the Gemini Live API.
   */
  const startConversation = useCallback(async () => {
    // Reset state for a new session
    setStatus(BotStatus.CONNECTING);
    setError(null);
    
    try {
        inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000, latencyHint: 'interactive' });
        outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000, latencyHint: 'interactive' });
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, noiseSuppression: true, echoCancellation: true } });

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const systemInstruction = translations[settings.language].systemInstruction(settings.name);

        let currentInput = '', currentOutput = '';
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    const inputCtx = inputAudioContextRef.current;
                    const stream = mediaStreamRef.current;
                    if (!inputCtx || !stream) return;
                    
                    setStatus(BotStatus.LISTENING);
                    
                    // Setup microphone input and visualization
                    const source = inputCtx.createMediaStreamSource(stream);
                    const analyser = inputCtx.createAnalyser();
                    analyser.fftSize = 256;
                    analyserRef.current = analyser;

                    const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    
                    source.connect(analyser);
                    analyser.connect(scriptProcessor);
                    // The processor must be connected to the destination to receive audio events.
                    // To prevent echoing the user's voice, we connect it through a GainNode with gain set to 0.
                    const gainNode = inputCtx.createGain();
                    gainNode.gain.setValueAtTime(0, inputCtx.currentTime);
                    scriptProcessor.connect(gainNode);
                    gainNode.connect(inputCtx.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    try {
                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(s => s.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                        if (message.serverContent?.outputTranscription) currentOutput += message.serverContent.outputTranscription.text;
                        if (message.serverContent?.inputTranscription) currentInput += message.serverContent.inputTranscription.text;
                        
                        if (message.serverContent?.turnComplete) {
                            if (currentInput.trim()) setTranscripts(prev => [...prev, { speaker: 'user', text: currentInput.trim() }]);
                            if (currentOutput.trim()) setTranscripts(prev => [...prev, { speaker: 'bot', text: currentOutput.trim() }]);
                            currentInput = ''; currentOutput = '';
                        }
    
                        if (message.toolCall?.functionCalls) {
                            const functionResponses = message.toolCall.functionCalls.map(fc => {
                                let result: string;
                                let tempExpr: BotExpression = 'neutral';
                                let sysText = `Action: ${fc.name}`;
    
                                switch(fc.name) {
                                    case 'record_safety_incident':
                                        tempExpr = 'concerned';
                                        sysText = `Recording incident: "${fc.args.description}"`;
                                        setIncidentReports(prev => [...prev, { ...fc.args, timestamp: new Date().toISOString() } as IncidentReport]);
                                        result = 'Incident recorded successfully.';
                                        break;
                                    case 'send_sms_alert':
                                        tempExpr = 'alert';
                                        sysText = `Sending SMS to ${fc.args.recipient}...`;
                                        result = `Alert sent to ${fc.args.recipient}.`;
                                        break;
                                    case 'mark_team_attendance':
                                        tempExpr = 'happy';
                                        sysText = `Attendance marked for ${fc.args.team_id}.`;
                                        result = `Team ${fc.args.team_id} attendance has been marked.`;
                                        break;
                                    case 'get_weather_update':
                                         tempExpr = 'focused';
                                         sysText = `Fetching weather for ${fc.args.location}.`;
                                         // In a real app, you'd fetch this. We'll simulate it.
                                         result = `The weather at ${fc.args.location} is clear, with stable underground temperature.`;
                                         break;
                                    default:
                                        result = 'Action completed.';
                                }
                                
                                setExpression(tempExpr);
                                setTranscripts(prev => [...prev, { speaker: 'system', text: sysText }]);
                                return { id: fc.id, name: fc.name, response: { result } };
                            });
                            
                            sessionPromiseRef.current?.then(session => session.sendToolResponse({ functionResponses }));
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        const outputCtx = outputAudioContextRef.current;
                        if (base64Audio && outputCtx) {
                            setStatus(BotStatus.SPEAKING);
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
    
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            source.onended = () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) {
                                    setStatus(BotStatus.LISTENING);
                                    setExpression('neutral');
                                }
                            };
    
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    } catch (err: any) {
                        console.error("Error processing message:", err);
                        setError(`An error occurred while processing the response: ${err.message}. Please restart.`);
                        stopConversation();
                        setStatus(BotStatus.ERROR);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Connection Error:', e);
                    setError('A connection error occurred. Please try again.');
                    stopConversation();
                    setStatus(BotStatus.ERROR);
                },
                onclose: () => {
                    if (statusRef.current !== BotStatus.IDLE && statusRef.current !== BotStatus.ERROR) {
                        setError('Connection lost unexpectedly.');
                        stopConversation();
                        setStatus(BotStatus.ERROR);
                    }
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } }
                },
                tools: [{ functionDeclarations }],
                systemInstruction,
            },
        });
    } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        setStatus(BotStatus.ERROR);
        stopConversation();
    }
  }, [settings, stopConversation]);

  // Animation effect for audio visualization
  useEffect(() => {
    if (status !== BotStatus.LISTENING || !analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const themeColors = { emerald: 'rgba(110, 231, 183,', sapphire: 'rgba(96, 165, 250,', ruby: 'rgba(248, 113, 113,' };

    const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        if (!canvasCtx) return;
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;
        const color = themeColors[settings.avatarTheme];
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2.5;
            canvasCtx.fillStyle = `${color} ${barHeight / 150})`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };
    draw();

    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); }
  }, [status, settings.avatarTheme]);

  const t = translations[settings.language];
  const botStatusText = {
      [BotStatus.IDLE]: t.readyToAssist, [BotStatus.CONNECTING]: t.connecting,
      [BotStatus.LISTENING]: t.listening, [BotStatus.SPEAKING]: t.speaking, [BotStatus.ERROR]: t.error
  }[status] || t.standby;
  
  const theme = {
      emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500', button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' },
      sapphire: { text: 'text-blue-400', bg: 'bg-blue-500', button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' },
      ruby: { text: 'text-red-400', bg: 'bg-red-500', button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
  }[settings.avatarTheme];

  const botClass = `bot-avatar w-40 h-40 md:w-48 md:h-48 mx-auto ${
    { [BotStatus.SPEAKING]: 'is-talking', [BotStatus.LISTENING]: 'is-listening', [BotStatus.CONNECTING]: 'is-connecting' }[status] || ''
  } ${
    { 'neutral': '', 'concerned': 'is-concerned', 'alert': 'is-alert', 'happy': 'is-happy', 'focused': 'is-focused' }[expression]
  }`;

  return (
    <div className="flex flex-col h-screen font-sans p-2 sm:p-4 bg-gray-900 text-gray-200 max-w-4xl mx-auto">
      <header className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3 min-w-0">
          <div className={`w-8 h-8 ${theme.bg} rounded-full flex-shrink-0`}></div>
          <h1 className={`text-lg md:text-xl font-bold truncate ${theme.text}`}>{settings.name}</h1>
        </div>
        <div className="flex items-center space-x-1">
            <button onClick={() => setIsHistoryVisible(v => !v)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="View history"><HistoryIcon className="w-6 h-6 text-gray-400" /></button>
            <button onClick={() => setIsSettingsVisible(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Open settings"><SettingsIcon className="w-6 h-6 text-gray-400" /></button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <SettingsPanel isOpen={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} settings={settings} onSettingsChange={handleSettingsChange} onClearHistory={handleClearHistory} />
        {isHistoryVisible ? (
             <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm p-4 z-10 overflow-y-auto">
                <h2 className={`text-2xl font-bold mb-4 ${theme.text}`}>{t.activityLog}</h2>
                <h3 className="text-xl font-bold mt-6 mb-2 text-yellow-400">{t.incidentLog}</h3>
                <div className="space-y-4 text-left">
                    {incidentReports.length > 0 ? incidentReports.map((r, i) => (
                        <div key={i} className="bg-yellow-900/50 p-4 rounded-lg border border-yellow-700/50">
                           <p className="font-semibold text-yellow-300">Location: <span className="font-normal text-gray-200 break-words">{r.location}</span></p>
                           <p className="font-semibold text-yellow-300 mt-1">Description: <span className="font-normal text-gray-200 break-words">{r.description}</span></p>
                           <p className="text-xs text-yellow-500 mt-2 text-right">{new Date(r.timestamp).toLocaleString()}</p>
                        </div>
                    )) : <p className="text-gray-500">{t.noIncidents}</p>}
                </div>
                <h3 className={`text-xl font-bold mt-8 mb-2 ${theme.text}`}>{t.conversationHistory}</h3>
                <div className="space-y-4 text-left">
                    {transcripts.length > 0 ? transcripts.map((t, i) => (
                        <div key={i} className={`p-3 rounded-lg ${t.speaker === 'user' ? 'bg-gray-800' : t.speaker === 'bot' ? `${theme.bg}/20` : 'bg-yellow-900/50 text-center italic'} max-w-[85%]`}>
                            <p className="font-semibold capitalize text-sm mb-1">{t.speaker}</p>
                            <p className="break-words">{t.text}</p>
                        </div>
                    )) : <p className="text-gray-500">{t.noHistory}</p>}
                </div>
                <button onClick={() => setIsHistoryVisible(false)} className={`mt-6 px-4 py-2 ${theme.button} rounded-lg`}>{t.closeButton}</button>
            </div>
        ) : (
            <>
                <BotIcon className={botClass} theme={settings.avatarTheme} />
                <p className="mt-4 text-lg font-medium text-gray-400">{botStatusText}</p>
                <canvas ref={canvasRef} className="w-full h-20 absolute bottom-24 left-0" />
            </>
        )}
      </main>
      
      <footer className="p-4 flex flex-col items-center">
        {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
        {status === BotStatus.IDLE || status === BotStatus.ERROR ? (
          <button onClick={startConversation} className={`px-8 py-4 ${theme.button} text-white font-bold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-transform transform hover:scale-105 text-lg`}>
            {t.startConversation}
          </button>
        ) : (
          <button onClick={stopConversation} className="px-8 py-4 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-transform transform hover:scale-105 text-lg">
            {t.endConversation}
          </button>
        )}
        <p className="text-xs text-gray-600 mt-4">{t.poweredBy}</p>
      </footer>
    </div>
  );
};

export default App;
