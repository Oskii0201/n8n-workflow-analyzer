'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import WorkflowSelector from './WorkflowSelector';
import SearchBar from './SearchBar';
import ErrorDisplay from './ErrorDisplay';
import ResultsList from './ResultsList';
import { Eye, Database } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useConnections } from '@/src/hooks/useConnections';
import { useWorkflows } from '@/src/hooks/useWorkflows';
import { useSearchVariable } from '@/src/hooks/useSearchVariable';
import type { Workflow } from '@/src/types/n8n';
import { Button } from './ui/button';

const N8NVariableFinder: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { activeConnection, loading: connectionsLoading } = useConnections();
    const { workflows, loading: workflowsLoading, refresh: refreshWorkflows } = useWorkflows(activeConnection?.id);
    const { results: searchResults, loading: searchLoading, search } = useSearchVariable();

    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string>('');

    const loading = workflowsLoading || searchLoading;

    const searchVariable = useCallback(async (): Promise<void> => {
        if (!selectedWorkflow || !searchTerm.trim()) {
            setError('Select a workflow and enter a variable to search for');
            return;
        }
        if (!activeConnection) {
            setError('No active connection');
            return;
        }

        setError('');
        const result = await search({
            connectionId: activeConnection.id,
            workflowId: selectedWorkflow.id,
            searchTerm: searchTerm.trim()
        });

        if (!result.success && result.error) {
            setError(result.error);
        }
    }, [selectedWorkflow, searchTerm, activeConnection, search]);

    const copyToClipboard = useCallback(async (text: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    }, []);

    const exportResults = useCallback((): void => {
        const exportData = {
            workflow: selectedWorkflow?.name,
            searchTerm,
            results: searchResults,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `n8n-search-${selectedWorkflow?.name}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [selectedWorkflow, searchTerm, searchResults]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            searchVariable();
        }
    }, [searchVariable]);

    // Auto-search with debounce
    useEffect(() => {
        if (!selectedWorkflow || !searchTerm.trim()) {
            return;
        }

        const timeoutId = setTimeout(() => {
            searchVariable();
        }, 800); // 800ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedWorkflow, searchVariable]);

    // Show loading state while checking authentication or connections
    if (authLoading || connectionsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Check if user is authenticated
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
                <div className="bg-card rounded-xl shadow-xl p-8 w-full max-w-md border border-border text-center">
                    <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
                    <p className="mb-6 text-muted-foreground">
                        Please sign in to use the N8N Workflow Analyzer.
                    </p>
                    <Button asChild>
                        <Link href="/auth/login">Sign In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Check if there's an active connection
    if (!activeConnection) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
                <div className="bg-card rounded-xl shadow-xl p-8 w-full max-w-md border border-border text-center">
                    <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h1 className="text-2xl font-bold mb-4">No Active Connection</h1>
                    <p className="mb-6 text-muted-foreground">
                        Add an n8n connection to start analyzing workflows.
                    </p>
                    <Button asChild>
                        <Link href="/connections">Manage Connections</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 flex flex-col gap-4">
                <WorkflowSelector
                    workflows={workflows}
                    selectedWorkflow={selectedWorkflow}
                    onSelect={setSelectedWorkflow}
                    onRefresh={refreshWorkflows}
                    loading={loading}
                />
                <SearchBar
                    searchTerm={searchTerm}
                    onChange={setSearchTerm}
                    loading={loading}
                    disabled={!selectedWorkflow}
                    onKeyPress={handleKeyPress}
                    onExampleClick={pattern => setSearchTerm(pattern)}
                />
                {error && <ErrorDisplay error={error} />}
                {searchResults.length > 0 && (
                    <ResultsList
                        searchResults={searchResults}
                        onCopy={copyToClipboard}
                        onExport={exportResults}
                    />
                )}
                {searchResults.length === 0 && searchTerm && !loading && !error && (
                    <div className="text-center py-8 sm:py-12 bg-card rounded-xl shadow-sm border border-border">
                        <Eye className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No results found</h3>
                        <p className="text-muted-foreground break-words">
                            No variable <span className="font-mono bg-muted px-2 py-1 rounded">&quot;{searchTerm}&quot;</span> found in the selected workflow
                        </p>
                        <div className="mt-4 text-sm text-muted-foreground">
                            Check if the variable name is correct and if the workflow contains the expected nodes
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default N8NVariableFinder;
