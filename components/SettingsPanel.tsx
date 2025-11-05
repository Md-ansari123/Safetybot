import React from 'react';
import { AppSettings, AvatarTheme } from '../App';
import { PrebuiltVoice } from '../types';
import { Language, translations } from '../utils/translations';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  onClearHistory: () => void;
}

const voiceOptions: { value: PrebuiltVoice; label: string }[] = [
    { value: 'Kore', label: 'Kore (Male, Deep)' },
    { value: 'Puck', label: 'Puck (Male, Youthful)' },
    { value: 'Charon', label: 'Charon (Male, Mature)' },
    { value: 'Fenrir', label: 'Fenrir (Female, Deep)' },
    { value: 'Zephyr', label: 'Zephyr (Female, Youthful)' },
];

const themeOptions: { value: AvatarTheme; label: string }[] = [
    { value: 'emerald', label: 'Emerald' },
    { value: 'sapphire', label: 'Sapphire' },
    { value: 'ruby', label: 'Ruby' },
];

const languageOptions: { value: Language, label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'hi', label: 'हिन्दी' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onClearHistory,
}) => {
  if (!isOpen) return null;
  
  const t = translations[settings.language];

  const handleFieldChange = (field: keyof AppSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the panel
      >
        <h2 id="settings-title" className="text-2xl font-bold mb-6 text-gray-100">{t.settingsTitle}</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="aiName" className="block text-sm font-medium text-gray-400 mb-2">
              {t.aiNameLabel}
            </label>
            <input
              type="text"
              id="aiName"
              value={settings.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label htmlFor="aiVoice" className="block text-sm font-medium text-gray-400 mb-2">
              {t.aiVoiceLabel}
            </label>
            <select
              id="aiVoice"
              value={settings.voice}
              onChange={(e) => handleFieldChange('voice', e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            >
              {voiceOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="aiAvatarTheme" className="block text-sm font-medium text-gray-400 mb-2">
              {t.avatarThemeLabel}
            </label>
            <select
              id="aiAvatarTheme"
              value={settings.avatarTheme}
              onChange={(e) => handleFieldChange('avatarTheme', e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            >
              {themeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="aiLanguage" className="block text-sm font-medium text-gray-400 mb-2">
              {t.languageLabel}
            </label>
            <select
              id="aiLanguage"
              value={settings.language}
              onChange={(e) => handleFieldChange('language', e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-red-400">{t.dangerZone}</h3>
            <p className="text-sm text-gray-400 mt-1 mb-3">{t.clearHistoryDesc}</p>
            <button
                onClick={onClearHistory}
                className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition"
            >
                {t.clearHistory}
            </button>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition"
          >
            {t.doneButton}
          </button>
        </div>
      </div>
    </div>
  );
};
