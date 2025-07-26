'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Settings, Users, Menu, X } from 'lucide-react';
import { useConnection } from '../contexts/ConnectionContext';
import SessionManagerModal from './SessionManagerModal';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/workflows', label: 'Variable Finder' },
];

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const { sessions, activeSessionId, onShowSettings, onDisconnect } = useConnection();
  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  const isConnected = !!activeSession?.isConnected;
  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 w-full">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-row items-center justify-between h-16 gap-2 w-full">
            <div className="flex flex-row items-center space-x-3 min-w-0">
              <div className="bg-blue-100 rounded-full p-2 flex items-center justify-center">
                <Search className="h-7 w-7 text-blue-600" />
              </div>
              <span className="text-xl font-bold text-gray-900 truncate">N8N Workflow Analyzer</span>
              <span className="flex items-center ml-2">
                <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'} inline-block mr-1`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </span>
            </div>

            <div className="hidden md:flex flex-row items-center space-x-2 ml-6">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-row items-center space-x-2 ml-2">
              <button
                onClick={() => setShowSessionManager(true)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Manage Sessions"
              >
                <Users className="h-5 w-5" />
              </button>
              {isConnected && (
                <>
                  <button
                    onClick={onShowSettings}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={onDisconnect}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}
              <button
                onClick={() => setOpen(!open)}
                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {open && (
            <div className="md:hidden border-t border-gray-200 py-2">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
      <SessionManagerModal open={showSessionManager} onClose={() => setShowSessionManager(false)} />
    </>
  );
};

export default Navbar; 