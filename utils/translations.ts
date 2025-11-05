export const translations = {
  en: {
    // UI
    aiNameLabel: 'AI Name',
    aiVoiceLabel: 'AI Voice',
    avatarThemeLabel: 'Avatar Theme',
    languageLabel: 'Language',
    settingsTitle: 'Settings',
    doneButton: 'Done',
    startConversation: 'Start Conversation',
    endConversation: 'End Conversation',
    readyToAssist: 'Ready to Assist',
    connecting: 'Connecting...',
    listening: 'Listening...',
    speaking: 'Speaking...',
    error: 'Error',
    standby: 'Standby',
    activityLog: 'Activity Log',
    incidentLog: 'Incident Log',
    noIncidents: 'No incidents reported.',
    conversationHistory: 'Conversation History',
    noHistory: 'No conversation history.',
    closeButton: 'Close',
    poweredBy: 'Powered by Gemini',
    dangerZone: 'Danger Zone',
    clearHistory: 'Clear History',
    clearHistoryDesc: 'This will permanently delete all conversation and incident history.',
    clearHistoryConfirm: 'Are you sure you want to delete all history? This action cannot be undone.',
    // System Prompt
    systemInstruction: (name: string) => `You are ${name}, an AI Mining Safety Officer. Your tone is calm, clear, and authoritative, but also reassuring.
- Prioritize safety above all else. Use simple, direct language.
- When a safety incident is reported, confirm the details clearly.
- If a user sounds distressed or reports a critical incident, immediately suggest sending an SMS alert.
- Keep responses brief and to the point.`,
  },
  es: {
    // UI
    aiNameLabel: 'Nombre de la IA',
    aiVoiceLabel: 'Voz de la IA',
    avatarThemeLabel: 'Tema del Avatar',
    languageLabel: 'Idioma',
    settingsTitle: 'Configuración',
    doneButton: 'Hecho',
    startConversation: 'Iniciar Conversación',
    endConversation: 'Terminar Conversación',
    readyToAssist: 'Listo para Ayudar',
    connecting: 'Conectando...',
    listening: 'Escuchando...',
    speaking: 'Hablando...',
    error: 'Error',
    standby: 'En espera',
    activityLog: 'Registro de Actividad',
    incidentLog: 'Registro de Incidentes',
    noIncidents: 'No se han reportado incidentes.',
    conversationHistory: 'Historial de Conversación',
    noHistory: 'No hay historial de conversación.',
    closeButton: 'Cerrar',
    poweredBy: 'Desarrollado por Gemini',
    dangerZone: 'Zona Peligrosa',
    clearHistory: 'Limpiar Historial',
    clearHistoryDesc: 'Esto eliminará permanentemente todo el historial de conversaciones e incidentes.',
    clearHistoryConfirm: '¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.',
    // System Prompt
    systemInstruction: (name: string) => `Eres ${name}, un Oficial de Seguridad Minera de IA. Tu tono es tranquilo, claro y autoritario, pero también tranquilizador.
- Prioriza la seguridad por encima de todo. Usa un lenguaje simple y directo.
- Cuando se reporte un incidente de seguridad, confirma los detalles claramente.
- Si un usuario suena angustiado o reporta un incidente crítico, sugiere inmediatamente enviar una alerta por SMS.
- Mantén las respuestas breves y al grano.`,
  },
  hi: {
    // UI
    aiNameLabel: 'एआई नाम',
    aiVoiceLabel: 'एआई आवाज़',
    avatarThemeLabel: 'अवतार थीम',
    languageLabel: 'भाषा',
    settingsTitle: 'सेटिंग्स',
    doneButton: 'हो गया',
    startConversation: 'बातचीत शुरू करें',
    endConversation: 'बातचीत समाप्त करें',
    readyToAssist: 'सहायता के लिए तैयार',
    connecting: 'कनेक्ट हो रहा है...',
    listening: 'सुन रहा है...',
    speaking: 'बोल रहा है...',
    error: 'त्रुटि',
    standby: 'स्टैंडबाय',
    activityLog: 'गतिविधि लॉग',
    incidentLog: 'घटना लॉग',
    noIncidents: 'कोई घटना रिपोर्ट नहीं हुई।',
    conversationHistory: 'बातचीत का इतिहास',
    noHistory: 'कोई बातचीत का इतिहास नहीं।',
    closeButton: 'बंद करें',
    poweredBy: 'जेमिनी द्वारा संचालित',
    dangerZone: 'खतरनाक क्षेत्र',
    clearHistory: 'इतिहास साफ़ करें',
    clearHistoryDesc: 'यह सभी बातचीत और घटना के इतिहास को स्थायी रूप से हटा देगा।',
    clearHistoryConfirm: 'क्या आप वाकई सारा इतिहास हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।',
    // System Prompt
    systemInstruction: (name: string) => `आप ${name} हैं, एक एआई खनन सुरक्षा अधिकारी। आपका लहजा शांत, स्पष्ट और आधिकारिक है, लेकिन आश्वस्त करने वाला भी है।
- सुरक्षा को सबसे ऊपर प्राथमिकता दें। सरल, सीधी भाषा का प्रयोग करें।
- जब किसी सुरक्षा घटना की सूचना दी जाती है, तो विवरणों की स्पष्ट रूप से पुष्टि करें।
- यदि कोई उपयोगकर्ता परेशान लगता है या किसी गंभीर घटना की रिपोर्ट करता है, तो तुरंत एक एसएमएस अलर्ट भेजने का सुझाव दें।
- प्रतिक्रियाओं को संक्षिप्त और सटीक रखें।`,
  },
};

export type Language = keyof typeof translations;
