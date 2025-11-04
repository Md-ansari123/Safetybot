import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, FunctionDeclaration, Type, Blob } from '@google/genai';
import { BotStatus, Transcript } from './types';
import { decode, decodeAudioData } from './utils/audioUtils';
import { BotIcon, HistoryIcon, SettingsIcon } from './components/icons';
import { SettingsPanel } from './components/SettingsPanel';
import { PrebuiltVoice } from './types';

type BotExpression = 'neutral' | 'concerned' | 'alert' | 'happy' | 'focused';
export type AvatarTheme = 'emerald' | 'sapphire' | 'ruby';

export interface AppSettings {
    name: string;
    voice: PrebuiltVoice;
    avatarTheme: AvatarTheme;
}

interface IncidentReport {
  description: string;
  location: string;
  timestamp: string;
}

const recordSafetyIncident: FunctionDeclaration = {
  name: 'record_safety_incident',
  description: 'Records a safety incident or hazard reported by a user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: 'A detailed description of the incident.' },
      location: { type: Type.STRING, description: 'The specific location or sector where the incident occurred.' },
    },
    required: ['description', 'location'],
  },
};

const getWeatherUpdate: FunctionDeclaration = {
    name: 'get_weather_update',
    description: 'Gets the current weather and underground conditions for a specific location.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: { type: Type.STRING, description: 'The mining site or area.' },
      },
      required: ['location'],
    },
};

const sendSmsAlert: FunctionDeclaration = {
    name: 'send_sms_alert',
    description: 'Sends an SMS alert to a supervisor or headquarters.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: 'The recipient of the message (e.g., "supervisor", "headquarters").' },
        message: { type: Type.STRING, description: 'The content of the message.' },
      },
      required: ['recipient', 'message'],
    },
};

const markTeamAttendance: FunctionDeclaration = {
    name: 'mark_team_attendance',
    description: 'Marks the attendance for an entire team.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        team_id: { type: Type.STRING, description: 'The ID or name of the team.' },
      },
      required: ['team_id'],
    },
};

const App: React.FC = () => {
  const [status, setStatus] = useState<BotStatus>(BotStatus.IDLE);
  const [expression, setExpression] = useState<BotExpression>('neutral');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    name: 'Jaaved Khan',
    voice: 'Kore',
    avatarTheme: 'emerald',
  });
  
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('aiName');
      const savedVoice = localStorage.getItem('aiVoice');
      const savedTheme = localStorage.getItem('aiAvatarTheme');
      
      setSettings({
        name: savedName || 'Jaaved Khan',
        voice: (savedVoice as PrebuiltVoice) || 'Kore',
        avatarTheme: (savedTheme as AvatarTheme) || 'emerald',
      });
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    }
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
        localStorage.setItem('aiName', newSettings.name);
        localStorage.setItem('aiVoice', newSettings.voice);
        localStorage.setItem('aiAvatarTheme', newSettings.avatarTheme);
    } catch (e) {
        console.error("Failed to save settings to localStorage", e);
    }
  };

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const processorUrlRef = useRef<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const inputTranscriptionRef = useRef('');
  const outputTranscriptionRef = useRef('');
  const groundingChunksForTurnRef = useRef<any[]>([]);
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const tempExpressionActiveRef = useRef(false);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopConversation = useCallback(async () => {
    setStatus(BotStatus.IDLE);
    setExpression('neutral');
    tempExpressionActiveRef.current = false;

    audioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors from stopping already-stopped sources.
      }
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }

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

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.close();
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (processorUrlRef.current) {
      URL.revokeObjectURL(processorUrlRef.current);
      processorUrlRef.current = null;
    }

    if(mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
  }, []);

  const startConversation = useCallback(async () => {
    setStatus(BotStatus.CONNECTING);
    setError(null);
    setTranscripts([]);
    setIncidentReports([]);
    inputTranscriptionRef.current = '';
    outputTranscriptionRef.current = '';
    groundingChunksForTurnRef.current = [];

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setStatus(BotStatus.ERROR);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

          inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
            latencyHint: 'interactive',
          });
          outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000,
            latencyHint: 'interactive',
          });
          
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 16000,
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;
          
          const systemInstruction = `You are ${settings.name}, an AI Mining Safety Officer. Your tone is calm, clear, and authoritative, but also reassuring.
- Prioritize safety above all else.
- Use simple, direct language. Mines are noisy.
- The user's current location is latitude ${userLocation.latitude}, longitude ${userLocation.longitude}.
- When a safety incident is reported, confirm the details clearly.
- When asked for weather, provide concise, relevant data for underground operations (e.g., "Air quality is good, seismic activity is stable.").
- If a user sounds distressed or reports a critical incident, immediately suggest sending an SMS alert.
- Keep responses brief and to the point.`;

          const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
              onopen: async () => {
                if (!inputAudioContextRef.current) return;
                const inputAudioContext = inputAudioContextRef.current;

                setStatus(BotStatus.LISTENING);
                
                const source = inputAudioContext.createMediaStreamSource(stream);
                mediaStreamSourceRef.current = source;
                
                const analyser = inputAudioContext.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                const draw = () => {
                  if (!canvasRef.current || !analyserRef.current) return;
                  animationFrameRef.current = requestAnimationFrame(draw);
                  
                  analyserRef.current.getByteFrequencyData(dataArray);
                  
                  const canvas = canvasRef.current;
                  const canvasCtx = canvas.getContext('2d');
                  if (!canvasCtx) return;

                  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                  
                  const barWidth = (canvas.width / bufferLength) * 1.5;
                  let x = 0;
                  const themeColors = {
                    emerald: 'rgba(110, 231, 183,',
                    sapphire: 'rgba(96, 165, 250,',
                    ruby: 'rgba(248, 113, 113,',
                  };
                  const color = themeColors[settings.avatarTheme];

                  for (let i = 0; i < bufferLength; i++) {
                    const barHeight = dataArray[i] / 2.5;
                    canvasCtx.fillStyle = `${color} ${barHeight / 150})`;
                    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                  }
                };
                draw();

                const processorCode = `
                  function encode(bytes) {
                    let binary = '';
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                      binary += String.fromCharCode(bytes[i]);
                    }
                    return btoa(binary);
                  }

                  class AudioProcessor extends AudioWorkletProcessor {
                    process(inputs) {
                      const input = inputs[0];
                      if (input && input.length > 0) {
                        const channelData = input[0];
                        if (channelData && channelData.length > 0) {
                          const l = channelData.length;
                          const int16 = new Int16Array(l);
                          for (let i = 0; i < l; i++) {
                            int16[i] = channelData[i] * 32768;
                          }
                          const base64Data = encode(new Uint8Array(int16.buffer));
                          this.port.postMessage(base64Data);
                        }
                      }
                      return true;
                    }
                  }
                  registerProcessor('audio-processor', AudioProcessor);
                `;

                const blob = new window.Blob([processorCode], { type: 'application/javascript' });
                const processorUrl = URL.createObjectURL(blob);
                processorUrlRef.current = processorUrl;
                
                await inputAudioContext.audioWorklet.addModule(processorUrl);
                const audioWorkletNode = new AudioWorkletNode(inputAudioContext, 'audio-processor');
                audioWorkletNodeRef.current = audioWorkletNode;

                audioWorkletNode.port.onmessage = (event) => {
                  const base64Data = event.data as string;
                  const pcmBlob: Blob = {
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=16000',
                  };
                  sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                };

                source.connect(analyser);
                source.connect(audioWorkletNode);
              },
              onmessage: async (message: LiveServerMessage) => {
                const outputAudioContext = outputAudioContextRef.current;
                if (!outputAudioContext) return;

                if (message.serverContent?.interrupted) {
                    for (const source of audioSourcesRef.current.values()) {
                        source.stop();
                    }
                    audioSourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                }

                if (message.serverContent?.groundingMetadata?.groundingChunks) {
                  groundingChunksForTurnRef.current.push(...message.serverContent.groundingMetadata.groundingChunks);
                }

                if (message.serverContent?.outputTranscription) {
                    outputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                }
                if (message.serverContent?.inputTranscription) {
                    inputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                }

                if (message.serverContent?.turnComplete) {
                    const fullInput = inputTranscriptionRef.current.trim();
                    const fullOutput = outputTranscriptionRef.current.trim();

                    if (fullInput) {
                        setTranscripts(prev => [...prev, { speaker: 'user', text: fullInput }]);
                        setStatus(BotStatus.THINKING);
                    }
                    if (fullOutput) {
                        const chunks = groundingChunksForTurnRef.current
                          .map(chunk => {
                            if (chunk.maps) return { uri: chunk.maps.uri, title: chunk.maps.title };
                            if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
                            return null;
                          })
                          .filter((chunk): chunk is { uri: string; title: string } => chunk !== null);

                        setTranscripts(prev => [...prev, { 
                          speaker: 'bot', 
                          text: fullOutput,
                          groundingChunks: chunks.length > 0 ? chunks : undefined
                        }]);
                    }
                    
                    inputTranscriptionRef.current = '';
                    outputTranscriptionRef.current = '';
                    groundingChunksForTurnRef.current = [];
                }

                if (message.toolCall?.functionCalls) {
                  for (const fc of message.toolCall.functionCalls) {
                    let result = 'OK, done.';
                    let expression: BotExpression = 'neutral';
                    let transcriptText = '';

                    if (fc.name === 'record_safety_incident') {
                        expression = 'concerned';
                        transcriptText = `Recording incident at ${fc.args.location}: "${fc.args.description}"`;
                        const newIncident: IncidentReport = {
                            description: fc.args.description as string,
                            location: fc.args.location as string,
                            timestamp: new Date().toISOString(),
                        };
                        setIncidentReports(prev => [...prev, newIncident]);
                    } else if (fc.name === 'get_weather_update') {
                        expression = 'focused';
                        transcriptText = `Checking conditions for ${fc.args.location}...`;
                    } else if (fc.name === 'send_sms_alert') {
                        expression = 'alert';
                        transcriptText = `Sending SMS to ${fc.args.recipient}: "${fc.args.message}"`;
                    } else if (fc.name === 'mark_team_attendance') {
                        expression = 'happy';
                        transcriptText = `Roger that. Attendance marked for ${fc.args.team_id}.`;
                    }
                    else {
                      transcriptText = `Performing action: ${fc.name}`;
                    }
                    
                    if (expression !== 'neutral') {
                        tempExpressionActiveRef.current = true;
                    }
                    setExpression(expression);
                    setTranscripts(prev => [...prev, { speaker: 'system', text: transcriptText }]);
                    
                    sessionPromise.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [
                          {
                            id: fc.id,
                            response: {
                              name: fc.name,
                              content: { result },
                            },
                          },
                        ],
                      });
                    });
                  }
                }
                
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                if (base64Audio) {
                  setStatus(BotStatus.SPEAKING);
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

                  const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                  const source = outputAudioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputAudioContext.destination);
                  
                  source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                    if (audioSourcesRef.current.size === 0) {
                        setStatus(BotStatus.LISTENING);
                        if (tempExpressionActiveRef.current) {
                            setExpression('neutral');
                            tempExpressionActiveRef.current = false;
                        }
                    }
                  });

                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  audioSourcesRef.current.add(source);
                }
              },
              onerror: (e: ErrorEvent) => {
                console.error('Live session error:', e);
                setError('A connection error occurred. Please check your network and try again.');
                setStatus(BotStatus.ERROR);
              },
              onclose: (e: CloseEvent) => {
                if (!e.wasClean && statusRef.current !== BotStatus.ERROR) {
                  console.error('Live session closed unexpectedly:', e);
                  setError('Connection lost. Please check your network and try again.');
                  setStatus(BotStatus.ERROR);
                } else {
                  setStatus(BotStatus.IDLE);
                }
              },
            },
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } },
              },
              tools: [{
                functionDeclarations: [recordSafetyIncident, getWeatherUpdate, sendSmsAlert, markTeamAttendance],
              }],
              systemInstruction: systemInstruction,
            },
          });
          sessionPromiseRef.current = sessionPromise;

        } catch (err) {
          console.error(err);
          let errorMessage = 'Failed to start conversation.';
          if (err instanceof Error) {
            if (err.name === 'NotAllowedError') {
              errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
            } else {
              errorMessage = `Error: ${err.message || 'An unknown error occurred.'}`;
            }
          }
          setError(errorMessage);
          setStatus(BotStatus.ERROR);
        }
      },
      (err) => {
        console.error(`Geolocation error: ${err.message}`);
        setError("Could not get your location. Please enable location services in your browser settings and try again.");
        setStatus(BotStatus.ERROR);
      }
    );
  }, [setError, setTranscripts, setIncidentReports, settings]);

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  const getBotStatusText = () => {
    switch (status) {
      case BotStatus.IDLE: return 'Ready to Assist';
      case BotStatus.CONNECTING: return 'Connecting...';
      case BotStatus.LISTENING: return 'Listening...';
      case BotStatus.THINKING: return 'Thinking...';
      case BotStatus.SPEAKING: return 'Speaking...';
      case BotStatus.ERROR: return 'Error';
      default: return 'Standby';
    }
  };
  
  const themeColors = {
      emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500', button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500', border: 'border-emerald-700/50' },
      sapphire: { text: 'text-blue-400', bg: 'bg-blue-500', button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500', border: 'border-blue-700/50' },
      ruby: { text: 'text-red-400', bg: 'bg-red-500', button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500', border: 'border-red-700/50' },
  }
  const currentTheme = themeColors[settings.avatarTheme];

  const botStateClasses: { [key in BotStatus]?: string } = {
    [BotStatus.SPEAKING]: 'is-talking',
    [BotStatus.LISTENING]: 'is-listening',
    [BotStatus.CONNECTING]: 'is-connecting',
    [BotStatus.THINKING]: 'is-thinking',
  };

  const expressionClasses: { [key in BotExpression]: string } = {
      'neutral': '',
      'concerned': 'is-concerned',
      'alert': 'is-alert',
      'happy': 'is-happy',
      'focused': 'is-focused',
  }

  const botClass = `bot-avatar w-40 h-40 md:w-48 md:h-48 mx-auto ${botStateClasses[status] || ''} ${expressionClasses[expression]}`;

  return (
    <div className="flex flex-col h-screen font-sans p-2 sm:p-4 bg-gray-900 text-gray-200 max-w-4xl mx-auto">
      <header className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className={`w-8 h-8 ${currentTheme.bg} rounded-full flex-shrink-0`}></div>
          <h1 className={`text-base sm:text-lg md:text-xl font-bold truncate ${currentTheme.text}`}>{settings.name}</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
            <button onClick={() => setIsHistoryVisible(!isHistoryVisible)} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <HistoryIcon className="w-6 h-6 text-gray-400" />
            </button>
            <button onClick={() => setIsSettingsVisible(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <SettingsIcon className="w-6 h-6 text-gray-400" />
            </button>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <SettingsPanel 
            isOpen={isSettingsVisible}
            onClose={() => setIsSettingsVisible(false)}
            settings={settings}
            onSettingsChange={handleSettingsChange}
        />
        {isHistoryVisible ? (
             <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm p-2 sm:p-4 z-10 overflow-y-auto">
                <h2 className={`text-xl sm:text-2xl font-bold mb-4 ${currentTheme.text}`}>Activity Log</h2>

                <h3 className="text-lg sm:text-xl font-bold mt-6 mb-2 text-yellow-400">Incident Log</h3>
                <div className="space-y-4 text-left">
                    {incidentReports.length > 0 ? incidentReports.map((report, i) => (
                        <div key={i} className="bg-yellow-900/50 p-4 rounded-lg border border-yellow-700/50">
                           <p className="font-semibold text-yellow-300">Location: <span className="font-normal text-gray-200 break-words">{report.location}</span></p>
                           <p className="font-semibold text-yellow-300 mt-1">Description: <span className="font-normal text-gray-200 break-words">{report.description}</span></p>
                           <p className="text-xs text-yellow-500 mt-2 text-right">{new Date(report.timestamp).toLocaleString()}</p>
                        </div>
                    )) : <p className="text-gray-500">No incidents reported in this session.</p>}
                </div>
                
                <h3 className={`text-lg sm:text-xl font-bold mt-8 mb-2 ${currentTheme.text}`}>Conversation History</h3>
                <div className="space-y-4 text-left">
                    {transcripts.length > 0 ? transcripts.map((t, i) => (
                        <div key={i} className={`p-3 rounded-lg ${
                            t.speaker === 'user' ? 'bg-gray-800 ml-auto' : 
                            t.speaker === 'bot' ? `${currentTheme.bg}/20 mr-auto` : 'bg-yellow-900/50 text-center italic text-yellow-300'
                        } max-w-[90%] sm:max-w-[85%] md:max-w-[80%]`}>
                            <p className="font-semibold capitalize text-sm mb-1">{t.speaker}</p>
                            <p className="break-words">{t.text}</p>
                            {t.groundingChunks && t.groundingChunks.length > 0 && (
                                <div className={`mt-2 pt-2 border-t ${currentTheme.border}`}>
                                    <p className={`text-xs font-semibold ${currentTheme.text} mb-1`}>Sources:</p>
                                    <ul className="list-disc list-inside text-xs space-y-1">
                                        {t.groundingChunks.map((chunk, j) => (
                                            <li key={j}>
                                                <a href={chunk.uri} target="_blank" rel="noopener noreferrer" className={`${currentTheme.text} hover:underline`}>
                                                    {chunk.title || 'View on Google Maps'}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )) : <p className="text-gray-500">No conversation history yet.</p>}
                </div>
                <button onClick={() => setIsHistoryVisible(false)} className={`mt-6 px-4 py-2 ${currentTheme.button} rounded-lg transition-colors text-sm sm:text-base`}>Close</button>
            </div>
        ) : (
            <>
                <BotIcon className={botClass} theme={settings.avatarTheme} />
                <p className="mt-4 text-lg font-medium text-gray-400">{getBotStatusText()}</p>
                <canvas ref={canvasRef} className="w-full h-16 md:h-20 absolute bottom-28 md:bottom-24 left-0" />
            </>
        )}
      </main>
      
      <footer className="p-2 sm:p-4 flex flex-col items-center">
        {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
        {status === BotStatus.IDLE || status === BotStatus.ERROR ? (
          <button
            onClick={startConversation}
            className={`px-6 py-3 md:px-8 md:py-4 ${currentTheme.button} text-white font-bold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 text-base md:text-lg`}
          >
            Start Conversation
          </button>
        ) : (
          <button
            onClick={stopConversation}
            className="px-6 py-3 md:px-8 md:py-4 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-105 text-base md:text-lg"
          >
            End Conversation
          </button>
        )}
        <p className="text-xs text-gray-600 mt-4">Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;