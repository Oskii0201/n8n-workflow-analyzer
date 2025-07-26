'use client';

import React, { useState } from 'react';
import { useConnection } from '../contexts/ConnectionContext';
import { Plus, Lock, Unlock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SessionManagerModal: React.FC<Props> = ({ open, onClose }) => {
  const { sessions, activeSessionId, setActiveSession, addSession, removeSession } = useConnection();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    description: '',
    password: ''
  });

  if (!open) return null;

  const handleUnlockSession = async () => {
    if (!selectedSessionId || !password) {
      setError('Select a session and enter password');
      return;
    }
    
    const success = await setActiveSession(selectedSessionId, password);
    if (success) {
      setPassword('');
      setSelectedSessionId(null);
      setError('');
      onClose();
    } else {
      setError('Invalid password');
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.password) {
      setError('Password is required');
      return;
    }
    setError('');
    const newSessionId = await addSession({
      name: form.name,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      description: form.description,
    }, form.password);
    if (newSessionId) {
      setForm({ name: '', baseUrl: '', apiKey: '', description: '', password: '' });
      setShowAdd(false);
      onClose();
    } else {
      setError('Error adding session');
    }
  };

  const encryptedSessions = sessions.filter(s => s.apiKey === '***encrypted***');
  const decryptedSessions = sessions.filter(s => s.apiKey !== '***encrypted***');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl">×</button>
        <h2 className="text-2xl font-bold mb-4">Manage n8n Sessions</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {!showAdd && (
          <div className="space-y-6">
            {/* Sekcja odblokowywania sesji */}
            {encryptedSessions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-orange-600" />
                  Unlock Session
                </h3>
                <div className="space-y-3">
                  {encryptedSessions.map(session => (
                    <div key={session.id} className={`flex items-center justify-between p-3 rounded border ${selectedSessionId === session.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex-1">
                        <div className="font-semibold">{session.name}</div>
                        <div className="text-xs text-gray-500">{session.description}</div>
                      </div>
                      <button
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`px-3 py-1 rounded text-sm font-medium ${selectedSessionId === session.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}`}
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
                
                {selectedSessionId && (
                  <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="password"
                        placeholder="Enter password for the session"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded"
                        onKeyPress={e => e.key === 'Enter' && handleUnlockSession()}
                      />
                      <button
                        onClick={handleUnlockSession}
                        className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
                      >
                        Unlock
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sekcja aktywnych sesji */}
            {decryptedSessions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Unlock className="h-5 w-5 mr-2 text-green-600" />
                  Active Sessions
                </h3>
                <div className="space-y-2">
                  {decryptedSessions.map(session => (
                    <div key={session.id} className={`flex items-center justify-between p-3 rounded border ${session.id === activeSessionId ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex-1">
                        <div className="font-semibold">{session.name}</div>
                        <div className="text-xs text-gray-500">{session.description}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {session.id === activeSessionId && (
                          <span className="text-sm text-green-600 font-medium">Active</span>
                        )}
                        <button onClick={() => removeSession(session.id)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Przycisk dodawania nowej sesji */}
            <div className="pt-4 border-t">
              <button
                onClick={() => setShowAdd(true)}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Session
              </button>
            </div>
          </div>
        )}

        {/* Formularz dodawania nowej sesji */}
        {showAdd && (
          <form onSubmit={handleAddSession} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Production n8n"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">n8n URL *</label>
              <input
                type="url"
                required
                value={form.baseUrl}
                onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://n8n.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
              <input
                type="password"
                required
                value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Short session description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Encryption password *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password to secure data"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
              >
                Add Session
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setForm({ name: '', baseUrl: '', apiKey: '', description: '', password: '' }); setError(''); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SessionManagerModal; 