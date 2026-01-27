'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, LogOut, Settings, Database, Menu, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useConnections } from '@/src/hooks/useConnections';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { activeConnection } = useConnections({ enabled: !!user });

  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/tools/variable-finder', label: 'Variable Finder' },
        { href: '/tools/weekly-scheduler', label: 'Weekly Scheduler' },
        { href: '/connections', label: 'Connections' },
      ]
    : [
        { href: '/', label: 'Home' },
      ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth/login';
  };

  const userInitials = user?.email
    ? user.email
        .split('@')[0]
        .split('.')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex flex-row items-center justify-between h-16 gap-2 w-full">
          <div className="flex flex-row items-center space-x-3 min-w-0">
            <div className="bg-primary/10 rounded-full p-2 flex items-center justify-center">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <Link href={user ? '/dashboard' : '/'}>
              <span className="text-xl font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors">
                N8N Workflow Analyzer
              </span>
            </Link>
            {user && activeConnection && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {activeConnection.name}
              </Badge>
            )}
          </div>

          <div className="hidden md:flex flex-row items-center space-x-2 ml-6">
            {navLinks.map(link => (
              <Button key={link.href} variant="ghost" asChild>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>

          <div className="flex flex-row items-center space-x-2 ml-2">
            <ThemeToggle />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Account</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/connections" className="cursor-pointer">
                      <Database className="mr-2 h-4 w-4" />
                      <span>Connections</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(!open)}
              className="md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border py-2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-foreground hover:text-primary hover:bg-accent rounded transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
