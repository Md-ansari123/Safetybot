import React from 'react';
import { AppSettings, AvatarTheme } from '../App';
import { PrebuiltVoice } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
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

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  if (!isOpen) return null;

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
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-100">Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="aiName" className="block text-sm font-medium text-gray-400 mb-2">
              AI Name
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
              AI Voice
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
              Avatar Theme
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
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
