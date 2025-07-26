import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionManagerModal from '../src/components/SessionManagerModal';
import { ConnectionProvider } from '../src/contexts/ConnectionContext';

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

const mockSessions = [
  {
    id: 'session-1',
    name: 'Test Session 1',
    baseUrl: 'https://test1.com',
    apiKey: 'test-key-1',
    isConnected: true,
  },
  {
    id: 'session-2',
    name: 'Test Session 2',
    baseUrl: 'https://test2.com',
    apiKey: '***encrypted***',
    isConnected: false,
  },
];

const mockAddSession = jest.fn();
const mockRemoveSession = jest.fn();
const mockSetActiveSession = jest.fn();

jest.mock('../src/contexts/ConnectionContext', () => ({
  useConnection: () => ({
    sessions: mockSessions,
    activeSessionId: 'session-1',
    addSession: mockAddSession,
    removeSession: mockRemoveSession,
    setActiveSession: mockSetActiveSession,
  }),
}));

describe('SessionManagerModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  describe('Session List', () => {
    it('renders active sessions', () => {
      render(<SessionManagerModal {...defaultProps} />);
      expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      expect(screen.getByText('Test Session 2')).toBeInTheDocument();
    });
    it('shows active session indicator', () => {
      render(<SessionManagerModal {...defaultProps} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
    it('calls removeSession when delete button is clicked', async () => {
      render(<SessionManagerModal {...defaultProps} />);
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
      await waitFor(() => {
        expect(mockRemoveSession).toHaveBeenCalledWith('session-1');
      });
    });
  });
  describe('Unlock Existing Session', () => {
    it('shows unlock form for encrypted sessions', () => {
      render(<SessionManagerModal {...defaultProps} />);
      expect(screen.getByText('Unlock Session')).toBeInTheDocument();
      expect(screen.getByText('Test Session 2')).toBeInTheDocument();
    });
    it('shows password input when session is selected', async () => {
      render(<SessionManagerModal {...defaultProps} />);
      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter password for the session')).toBeInTheDocument();
      });
    });
    it('calls setActiveSession when unlock button is clicked', async () => {
      mockSetActiveSession.mockResolvedValue(true);
      render(<SessionManagerModal {...defaultProps} />);
      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);
      const passwordInput = screen.getByPlaceholderText('Enter password for the session');
      fireEvent.change(passwordInput, { target: { value: 'test-password' } });
      const unlockButton = screen.getByText('Unlock');
      fireEvent.click(unlockButton);
      await waitFor(() => {
        expect(mockSetActiveSession).toHaveBeenCalledWith('session-2', 'test-password');
      });
    });
    it('shows error for incorrect password', async () => {
      mockSetActiveSession.mockResolvedValue(false);
      render(<SessionManagerModal {...defaultProps} />);
      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);
      const passwordInput = screen.getByPlaceholderText('Enter password for the session');
      fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
      const unlockButton = screen.getByText('Unlock');
      fireEvent.click(unlockButton);
      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });
    });
  });
  describe('Form Navigation', () => {
    it('shows add form when add button is clicked', () => {
      render(<SessionManagerModal {...defaultProps} />);
      expect(screen.getByText('Unlock Session')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Add New Session'));
      expect(screen.getByText('Session name *')).toBeInTheDocument();
      expect(screen.getByText('n8n URL *')).toBeInTheDocument();
      expect(screen.getByText('API Key *')).toBeInTheDocument();
    });
    it('calls addSession when form is submitted', async () => {
      mockAddSession.mockResolvedValue('new-session-id');
      render(<SessionManagerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Add New Session'));
      const nameInput = screen.getByPlaceholderText('e.g., Production n8n');
      const urlInput = screen.getByPlaceholderText('https://n8n.example.com');
      const apiKeyInput = screen.getByPlaceholderText('Your API Key');
      const passwordInput = screen.getByPlaceholderText('Password to secure data');
      fireEvent.change(nameInput, { target: { value: 'New Session' } });
      fireEvent.change(urlInput, { target: { value: 'https://new.com' } });
      fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
      fireEvent.change(passwordInput, { target: { value: 'new-password' } });
      const submitButton = screen.getByText('Add Session');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(mockAddSession).toHaveBeenCalledWith({
          name: 'New Session',
          baseUrl: 'https://new.com',
          apiKey: 'new-key',
          description: '',
        }, 'new-password');
      });
    });
  });
}); 