import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionProvider, useConnection } from '../src/contexts/ConnectionContext';
import { encryptSessionData, decryptSessionData } from '../src/lib/session-crypto';

jest.mock('../src/lib/session-crypto', () => ({
  encryptSessionData: jest.fn((data, password) => `encrypted_${data}_${password}`),
  decryptSessionData: jest.fn((encryptedData, password) => {
    if (encryptedData === 'encrypted_test-key_test-password') {
      return 'test-key';
    }
    if (encryptedData === 'encrypted_https://test.com_test-password') {
      return 'https://test.com';
    }
    return null;
  }),
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

const TestComponent = () => {
  const { 
    sessions, 
    activeSessionId, 
    addSession, 
    removeSession, 
    setActiveSession,
    onDisconnect 
  } = useConnection();

  const isConnected = activeSessionId !== '';

  return (
    <div>
      <div data-testid="sessions-count">{sessions.length}</div>
      <div data-testid="active-session">{activeSessionId}</div>
      <div data-testid="is-connected">{isConnected ? 'connected' : 'disconnected'}</div>
      <button 
        data-testid="add-session" 
        onClick={() => addSession({
          name: 'Test Session',
          baseUrl: 'https://test.com',
          apiKey: 'test-key',
          description: 'Test description'
        }, 'test-password')}
      >
        Add Session
      </button>
      <button 
        data-testid="remove-session" 
        onClick={() => removeSession('test-id')}
      >
        Remove Session
      </button>
      <button 
        data-testid="set-active" 
        onClick={() => setActiveSession('test-id', 'test-password')}
      >
        Set Active
      </button>
      <button 
        data-testid="disconnect" 
        onClick={onDisconnect}
      >
        Disconnect
      </button>
    </div>
  );
};

describe('ConnectionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  it('provides initial state', () => {
    render(
      <ConnectionProvider>
        <TestComponent />
      </ConnectionProvider>
    );

    expect(screen.getByTestId('sessions-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-session')).toHaveTextContent('');
    expect(screen.getByTestId('is-connected')).toHaveTextContent('disconnected');
  });

  describe('addSession', () => {
    it('adds a new session with encrypted data', async () => {
      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      fireEvent.click(screen.getByTestId('add-session'));

      await waitFor(() => {
        expect(screen.getByTestId('sessions-count')).toHaveTextContent('1');
      });

      expect(encryptSessionData).toHaveBeenCalledTimes(2);
      expect(encryptSessionData).toHaveBeenCalledWith('test-key', 'test-password');
      expect(encryptSessionData).toHaveBeenCalledWith('https://test.com', 'test-password');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'n8n_sessions',
        expect.stringContaining('encrypted_')
      );
    });

    it('sets the new session as active if it is the first session', async () => {
      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      fireEvent.click(screen.getByTestId('add-session'));

      await waitFor(() => {
        expect(screen.getByTestId('active-session')).not.toHaveTextContent('');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('connected');
      });
    });

    it('does not set as active if there are existing sessions', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { id: 'existing-id', name: 'Existing Session', baseUrl: 'https://existing.com', apiKey: 'existing-key' }
      ]));

      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      fireEvent.click(screen.getByTestId('add-session'));

      await waitFor(() => {
        expect(screen.getByTestId('sessions-count')).toHaveTextContent('2');
      });

      expect(screen.getByTestId('active-session')).not.toHaveTextContent('');
    });
  });

  describe('removeSession', () => {
    it('removes a session from the list', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { id: 'test-id', name: 'Test Session', baseUrl: 'https://test.com', apiKey: 'test-key' }
      ]));

      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      fireEvent.click(screen.getByTestId('remove-session'));

      await waitFor(() => {
        expect(screen.getByTestId('sessions-count')).toHaveTextContent('0');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('n8n_sessions', '[]');
    });

    it('sets a new active session if the removed session was active', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { id: 'test-id', name: 'Test Session', baseUrl: 'https://test.com', apiKey: 'test-key' },
        { id: 'other-id', name: 'Other Session', baseUrl: 'https://other.com', apiKey: 'other-key' }
      ]));
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'n8n_sessions') {
          return JSON.stringify([
            { id: 'test-id', name: 'Test Session', baseUrl: 'https://test.com', apiKey: 'test-key' },
            { id: 'other-id', name: 'Other Session', baseUrl: 'https://other.com', apiKey: 'other-key' }
          ]);
        }
        if (key === 'n8n_last_active_session') {
          return 'test-id';
        }
        return null;
      });

      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      fireEvent.click(screen.getByTestId('remove-session'));

      await waitFor(() => {
        expect(screen.getByTestId('sessions-count')).toHaveTextContent('1');
      });

      expect(screen.getByTestId('active-session')).toHaveTextContent('other-id');
    });
  });

  describe('setActiveSession', () => {
    it('successfully unlocks and activates a session', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'n8n_sessions') {
          return JSON.stringify([
            {
              id: 'test-id',
              name: 'Test Session',
              encryptedApiKey: 'encrypted_test-key_test-password',
              encryptedBaseUrl: 'encrypted_https://test.com_test-password',
              isConnected: false
            }
          ]);
        }
        return null;
      });

      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      fireEvent.click(screen.getByTestId('set-active'));

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('connected');
      });

      expect(decryptSessionData).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('n8n_last_active_session', 'test-id');
    });

    it('returns false for incorrect password', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'n8n_sessions') {
          return JSON.stringify([
            {
              id: 'test-id',
              name: 'Test Session',
              encryptedApiKey: 'encrypted_test-key_test-password',
              encryptedBaseUrl: 'encrypted_https://test.com_test-password',
              isConnected: false
            }
          ]);
        }
        if (key === 'n8n_last_active_session') {
          return null;
        }
        return null;
      });
      sessionStorageMock.getItem.mockReturnValue(null);
      (decryptSessionData as jest.Mock).mockReturnValue(null);

      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sessions-count')).toHaveTextContent('1');
      });

      const initialState = screen.getByTestId('is-connected').textContent;
      
      fireEvent.click(screen.getByTestId('set-active'));

      await waitFor(() => {
        const finalState = screen.getByTestId('is-connected').textContent;
        expect(finalState).toBe(initialState);
      });

      expect(decryptSessionData).toHaveBeenCalled();
    });
  });

  describe('session persistence', () => {
    it('loads decrypted sessions from sessionStorage on mount', () => {
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test-id',
          name: 'Test Session',
          apiKey: 'test-key',
          baseUrl: 'https://test.com',
          isConnected: true
        }
      ]));
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'test-id',
          name: 'Test Session',
          encryptedApiKey: 'encrypted_test-key_test-password',
          encryptedBaseUrl: 'encrypted_https://test.com_test-password',
          isConnected: true
        }
      ]));

      render(
        <ConnectionProvider>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId('sessions-count')).toHaveTextContent('1');
      expect(screen.getByTestId('active-session')).not.toHaveTextContent('');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('connected');
    });
  });
}); 