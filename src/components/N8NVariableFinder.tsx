'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WorkflowSelector from './WorkflowSelector';
import SearchBar from './SearchBar';
import ErrorDisplay from './ErrorDisplay';
import ResultsList from './ResultsList';
import { Eye } from 'lucide-react';
import { useConnection } from '../contexts/ConnectionContext';
import SessionManagerModal from './SessionManagerModal';

interface Workflow {
    id: string;
    name: string;
    active: boolean;
    nodes: number;
    updatedAt: string;
}

interface Match {
    field: string;
    expression: string;
    fullValue: string;
    context: string;
    matchIndex: number;
}

interface SearchResult {
    nodeName: string;
    nodeType: string;
    nodeId: string;
    matches: Match[];
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

const N8NVariableFinder: React.FC = () => {
    const { sessions, activeSessionId } = useConnection();
    const [showSessionManager, setShowSessionManager] = useState(false);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isSessionReady = useMemo(() => {
        return activeSession && 
               activeSession.apiKey && 
               activeSession.baseUrl && 
               activeSession.apiKey !== '***encrypted***';
    }, [activeSession]);

    const loadWorkflows = useCallback(async (): Promise<void> => {
        if (!isSessionReady || !activeSession) return;
        
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/n8n/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    apiKey: activeSession.apiKey, 
                    baseUrl: activeSession.baseUrl 
                })
            });
            const data: ApiResponse<{ workflows: Workflow[] }> = await response.json();
            if (data.success && data.data) {
                setWorkflows(data.data.workflows);
            } else {
                setError('Error fetching workflows: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError('Error: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    }, [isSessionReady, activeSession]);

    useEffect(() => {
        if (isSessionReady) {
            loadWorkflows();
        }
    }, [isSessionReady, loadWorkflows]);

    const searchVariable = useCallback(async (): Promise<void> => {
        if (!selectedWorkflow || !searchTerm.trim()) {
            setError('Select a workflow and enter a variable to search for');
            return;
        }
        if (!isSessionReady) {
            setError('No active session');
            return;
        }

        setLoading(true);
        setError('');
        setSearchResults([]);
        try {
            const response = await fetch('/api/n8n/search-variable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: activeSession!.apiKey,
                    baseUrl: activeSession!.baseUrl,
                    workflowId: selectedWorkflow.id,
                    searchTerm: searchTerm.trim()
                })
            });
            const data: ApiResponse<{ results: SearchResult[] }> = await response.json();
            if (data.success && data.data) {
                setSearchResults(data.data.results);
            } else {
                setError('Search error: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError('Error: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    }, [selectedWorkflow, searchTerm, isSessionReady, activeSession]);

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

    if (!isSessionReady) {
        return (
            <>
                <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                    <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md border border-gray-200 text-center">
                        <h1 className="text-2xl font-bold mb-4">To start, unlock your n8n session</h1>
                        <p className="mb-6 text-gray-600">
                            {sessions.length === 0 
                                ? 'Add a session in your session manager to use the application.'
                                : 'You have saved sessions. Unlock one with a password to start working.'
                            }
                        </p>
                        <button
                            onClick={() => setShowSessionManager(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            {sessions.length === 0 ? 'Add Session' : 'Manage Sessions'}
                        </button>
                    </div>
                </div>
                <SessionManagerModal open={showSessionManager} onClose={() => setShowSessionManager(false)} />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 flex flex-col gap-4">
                <WorkflowSelector
                    workflows={workflows}
                    selectedWorkflow={selectedWorkflow}
                    onSelect={setSelectedWorkflow}
                    onRefresh={loadWorkflows}
                    loading={loading}
                />
                <SearchBar
                    searchTerm={searchTerm}
                    onChange={setSearchTerm}
                    onSearch={searchVariable}
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
                    <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                        <Eye className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                        <p className="text-gray-500 break-words">
                            No variable <span className="font-mono bg-gray-100 px-2 py-1 rounded">&quot;{searchTerm}&quot;</span> found in the selected workflow
                        </p>
                        <div className="mt-4 text-sm text-gray-400">
                            Check if the variable name is correct and if the workflow contains the expected nodes
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default N8NVariableFinder;