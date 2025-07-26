'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { encryptSessionData, decryptSessionData } from '../lib/session-crypto';

const STORAGE_KEY = 'n8n_sessions';
const LAST_ACTIVE_SESSION_KEY = 'n8n_last_active_session';
const SESSION_STORAGE_KEY = 'n8n_decrypted_sessions';

interface Session {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  isConnected: boolean;
  description?: string;
}

interface EncryptedSession {
  id: string;
  name: string;
  encryptedApiKey: string;
  encryptedBaseUrl: string;
  isConnected: boolean;
  description?: string;
}

interface ConnectionContextType {
  sessions: Session[];
  activeSessionId: string | null;
  setActiveSession: (id: string, password?: string) => Promise<boolean>;
  addSession: (session: Omit<Session, 'id' | 'isConnected'>, password: string) => Promise<string | null>;
  removeSession: (id: string) => void;
  setSessionConnected: (id: string, connected: boolean) => void;
  getDecryptedSession: (id: string, password: string) => Session | null;
  onShowSettings?: () => void;
  onDisconnect?: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

export const ConnectionProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const encryptedSessions: EncryptedSession[] = JSON.parse(stored);
        const sessionStored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        let sessionsWithData: Session[] = [];
        if (sessionStored) {
          try {
            const decryptedSessions: Session[] = JSON.parse(sessionStored);
            sessionsWithData = encryptedSessions.map(encryptedSession => {
              const decryptedSession = decryptedSessions.find(s => s.id === encryptedSession.id);
              if (decryptedSession) {
                return {
                  ...encryptedSession,
                  apiKey: decryptedSession.apiKey,
                  baseUrl: decryptedSession.baseUrl,
                };
              } else {
                return {
                  ...encryptedSession,
                  apiKey: '***encrypted***',
                  baseUrl: '***encrypted***',
                };
              }
            });
          } catch (error) {
            sessionsWithData = encryptedSessions.map(s => ({
              ...s,
              apiKey: '***encrypted***',
              baseUrl: '***encrypted***',
            }));
          }
        } else {
          sessionsWithData = encryptedSessions.map(s => ({
            ...s,
            apiKey: '***encrypted***',
            baseUrl: '***encrypted***',
          }));
        }
        setSessions(sessionsWithData);
        const lastActiveSessionId = localStorage.getItem(LAST_ACTIVE_SESSION_KEY);
        if (lastActiveSessionId && encryptedSessions.find(s => s.id === lastActiveSessionId)) {
          setActiveSessionId(lastActiveSessionId);
        } else if (encryptedSessions.length > 0) {
          setActiveSessionId(encryptedSessions[0].id);
        }
      } catch (error) {
        console.error('Failed to load sessions from localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      const decryptedSessions = sessions.filter(s => s.apiKey !== '***encrypted***');
      if (decryptedSessions.length > 0) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(decryptedSessions));
      }
    }
  }, [sessions]);

  const setSessionConnected = useCallback((id: string, connected: boolean) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isConnected: connected } : s));
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const encryptedSessions: EncryptedSession[] = JSON.parse(stored);
        const updated = encryptedSessions.map(s => s.id === id ? { ...s, isConnected: connected } : s);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update session in localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (activeSessionId && sessions.length > 0) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession && activeSession.apiKey !== '***encrypted***' && !activeSession.isConnected) {
        setSessionConnected(activeSessionId, true);
      }
    }
  }, [activeSessionId, sessions, setSessionConnected]);

  const setActiveSession = useCallback(async (id: string, password?: string): Promise<boolean> => {
    const session = sessions.find(s => s.id === id);
    if (!session) return false;
    if (session.apiKey === '***encrypted***' && password) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const encryptedSessions: EncryptedSession[] = JSON.parse(stored);
          const encryptedSession = encryptedSessions.find(s => s.id === id);
          if (encryptedSession) {
            const decryptedApiKey = decryptSessionData(encryptedSession.encryptedApiKey, password);
            const decryptedBaseUrl = decryptSessionData(encryptedSession.encryptedBaseUrl, password);
            if (decryptedApiKey && decryptedBaseUrl) {
              const updatedSessions = sessions.map(s => 
                s.id === id 
                  ? { ...s, apiKey: decryptedApiKey, baseUrl: decryptedBaseUrl, isConnected: true }
                  : s
              );
              setSessions(updatedSessions);
              setActiveSessionId(id);
              localStorage.setItem(LAST_ACTIVE_SESSION_KEY, id);
              return true;
            }
          }
        } catch (error) {
          console.error('Failed to decrypt session:', error);
        }
      }
      return false;
    }
    setActiveSessionId(id);
    setSessionConnected(id, true);
    localStorage.setItem(LAST_ACTIVE_SESSION_KEY, id);
    return true;
  }, [sessions, setSessionConnected]);

  const addSession = useCallback(async (session: Omit<Session, 'id' | 'isConnected'>, password: string): Promise<string | null> => {
    const newSession: Session = {
      ...session,
      id: Math.random().toString(36).substr(2, 9),
      isConnected: true,
    };
    const encryptedApiKey = encryptSessionData(newSession.apiKey, password);
    const encryptedBaseUrl = encryptSessionData(newSession.baseUrl, password);
    const stored = localStorage.getItem(STORAGE_KEY);
    const encryptedSessions: EncryptedSession[] = stored ? JSON.parse(stored) : [];
    encryptedSessions.push({
      id: newSession.id,
      name: newSession.name,
      encryptedApiKey,
      encryptedBaseUrl,
      isConnected: true,
      description: newSession.description,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedSessions));
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    localStorage.setItem(LAST_ACTIVE_SESSION_KEY, newSession.id);
    return newSession.id;
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remainingSessions = sessions.filter(s => s.id !== id);
      const newActiveId = remainingSessions[0]?.id || '';
      setActiveSessionId(newActiveId);
      localStorage.setItem(LAST_ACTIVE_SESSION_KEY, newActiveId);
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const encryptedSessions: EncryptedSession[] = JSON.parse(stored);
        const filtered = encryptedSessions.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch (error) {
        console.error('Failed to remove session from localStorage:', error);
      }
    }
  }, [activeSessionId, sessions]);

  const getDecryptedSession = useCallback((id: string, password: string): Session | null => {
    const session = sessions.find(s => s.id === id);
    if (!session) return null;
    if (session.apiKey === '***encrypted***') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const encryptedSessions: EncryptedSession[] = JSON.parse(stored);
          const encryptedSession = encryptedSessions.find(s => s.id === id);
          if (encryptedSession) {
            const decryptedApiKey = decryptSessionData(encryptedSession.encryptedApiKey, password);
            const decryptedBaseUrl = decryptSessionData(encryptedSession.encryptedBaseUrl, password);
            if (decryptedApiKey && decryptedBaseUrl) {
              return {
                ...session,
                apiKey: decryptedApiKey,
                baseUrl: decryptedBaseUrl,
              };
            }
          }
        } catch (error) {
          console.error('Failed to decrypt session:', error);
        }
      }
      return null;
    }
    return session;
  }, [sessions]);

  const onShowSettings = useCallback(() => {}, []);
  const onDisconnect = useCallback(() => {
    if (activeSessionId) {
      setSessionConnected(activeSessionId, false);
      // Usuń odszyfrowaną sesję z sessionStorage
      const sessionStored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionStored) {
        try {
          const decryptedSessions: Session[] = JSON.parse(sessionStored);
          const filtered = decryptedSessions.filter(s => s.id !== activeSessionId);
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(filtered));
        } catch {}
      }
      // Ustaw apiKey i baseUrl na '***encrypted***' w stanie sessions
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, apiKey: '***encrypted***', baseUrl: '***encrypted***' }
          : s
      ));
    }
    setActiveSessionId('');
    localStorage.removeItem(LAST_ACTIVE_SESSION_KEY);
  }, [activeSessionId, setSessionConnected]);

  const value: ConnectionContextType = {
    sessions,
    activeSessionId,
    setActiveSession,
    addSession,
    removeSession,
    setSessionConnected,
    getDecryptedSession,
    onShowSettings,
    onDisconnect,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionContext; 