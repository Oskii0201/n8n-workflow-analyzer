import { NextRequest, NextResponse } from 'next/server';

interface N8NNode {
    id: string;
    name: string;
    type: string;
    parameters?: Record<string, any>;
    credentials?: Record<string, any>;
    [key: string]: any;
}

interface N8NWorkflowData {
    id: string;
    name: string;
    nodes: N8NNode[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
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

interface MatchWithPriority extends Match {
    priority: number;
    patternType: string;
}

export async function POST(request: NextRequest) {
    try {
        const { apiKey, baseUrl, workflowId, searchTerm } = await request.json();
        
        if (!apiKey || !baseUrl || !workflowId || !searchTerm) {
            
            return NextResponse.json(
                { success: false, error: 'Wszystkie pola są wymagane' },
                { status: 400 }
            );
        }
        
        const normalizedUrl = baseUrl.replace(/\/$/, '');
        
        const response = await fetch(`${normalizedUrl}/api/v1/workflows/${workflowId}`, {
            method: 'GET',
            headers: {
                'X-N8N-API-KEY': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
       
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: response.status }
            );
        }
        const workflowResponse = await response.json();
        const workflow: N8NWorkflowData | undefined = workflowResponse;
        
        if (!workflow || !Array.isArray(workflow.nodes)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Workflow data is missing or malformed (no nodes array)'
                },
                { status: 500 }
            );
        }

        const results = searchVariableInWorkflow(workflow, searchTerm);

        return NextResponse.json({
            success: true,
            data: { results }
        });
    } catch (error) {
        console.error('Variable search error:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Error searching variable: ${error instanceof Error ? error.message : 'Unknown error'}`
            },
            { status: 500 }
        );
    }
}

// Funkcja do wyszukiwania zmiennej w workflow
function searchVariableInWorkflow(workflow: N8NWorkflowData, searchTerm: string): SearchResult[] {
    const results: SearchResult[] = [];
    const nodes = workflow.nodes || [];

    // Ulepszony escapeRegex z lepszą obsługą specjalnych znaków N8N
    const escapeRegex = (string: string): string => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Rozszerzone wzorce wyrażeń N8N z lepszym dopasowaniem
    const createPatterns = (term: string) => [
        // Exact match - najwyższy priorytet
        new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi'),

        // N8N node references
        new RegExp(`\\$\\(['"]${escapeRegex(term)}['"]\\)`, 'gi'),
        new RegExp(`\\$node\\[['"]${escapeRegex(term)}['"]\\]`, 'gi'),

        // Property access patterns
        new RegExp(`${escapeRegex(term)}\\.[\\w.\\[\\]]+`, 'gi'),
        new RegExp(`\\.[\\w.]*${escapeRegex(term)}[\\w.]*`, 'gi'),

        // Expression patterns
        new RegExp(`\\{\\{[^}]*${escapeRegex(term)}[^}]*\\}\\}`, 'gi'),

        // JSON path patterns
        new RegExp(`\\$json\\..*${escapeRegex(term)}.*`, 'gi'),

        // Items reference patterns
        new RegExp(`\\$items\\[[^\\]]*\\].*${escapeRegex(term)}.*`, 'gi'),

        // Input patterns
        new RegExp(`\\$input.*${escapeRegex(term)}.*`, 'gi'),

        // Partial matches - najniższy priorytet
        new RegExp(escapeRegex(term), 'gi')
    ];

    const patterns = createPatterns(searchTerm);

    nodes.forEach((node) => {
        const matches: MatchWithPriority[] = [];

        // Przeszukuj node rekurencyjnie
        searchInObject(node, '', matches, patterns, searchTerm);

        if (matches.length > 0) {
            // Usuń duplikaty i sortuj według priorytetu
            const uniqueMatches = deduplicateMatches(matches);

            results.push({
                nodeName: node.name,
                nodeType: node.type,
                nodeId: node.id,
                matches: uniqueMatches
            });
        }
    });

    // Sortuj wyniki według liczby dopasowań i priorytetu
    return results.sort((a, b) => {
        const aScore = calculateRelevanceScore(a, searchTerm);
        const bScore = calculateRelevanceScore(b, searchTerm);
        return bScore - aScore;
    });
}

function searchInObject(
    obj: any,
    path: string,
    matches: MatchWithPriority[],
    patterns: RegExp[],
    searchTerm: string,
    maxDepth: number = 10
): void {
    if (maxDepth <= 0 || obj === null || obj === undefined) return;

    // Skip functions and circular references
    if (typeof obj === 'function') return;

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'string' && value.trim()) {
            // Sprawdź każdy wzorzec z priorytetem
            patterns.forEach((pattern, patternIndex) => {
                const regex = new RegExp(pattern.source, pattern.flags);
                let match;

                while ((match = regex.exec(value)) !== null) {
                    const context = getContext(value, match.index, 80);

                    matches.push({
                        field: currentPath,
                        expression: match[0],
                        fullValue: value.length > 500 ? value.substring(0, 500) + '...' : value,
                        context: context,
                        matchIndex: match.index,
                        priority: patternIndex,
                        patternType: getPatternType(patternIndex)
                    });

                    // Zapobiegnij nieskończonym pętlom
                    if (regex.lastIndex === match.index) {
                        regex.lastIndex++;
                    }
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'string' && item.trim()) {
                        patterns.forEach((pattern, patternIndex) => {
                            const regex = new RegExp(pattern.source, pattern.flags);
                            let match;

                            while ((match = regex.exec(item)) !== null) {
                                matches.push({
                                    field: `${currentPath}[${index}]`,
                                    expression: match[0],
                                    fullValue: item,
                                    context: getContext(item, match.index, 80),
                                    matchIndex: match.index,
                                    priority: patternIndex,
                                    patternType: getPatternType(patternIndex)
                                });

                                if (regex.lastIndex === match.index) {
                                    regex.lastIndex++;
                                }
                            }
                        });
                    } else if (typeof item === 'object' && item !== null) {
                        searchInObject(item, `${currentPath}[${index}]`, matches, patterns, searchTerm, maxDepth - 1);
                    }
                });
            } else {
                // Sprawdź czy to nie jest circular reference
                try {
                    JSON.stringify(value);
                    searchInObject(value, currentPath, matches, patterns, searchTerm, maxDepth - 1);
                } catch (error) {
                    // Skip circular references
                    console.warn(`Circular reference detected at ${currentPath}`);
                }
            }
        }
    }
}

function getContext(text: string, index: number, contextLength: number = 80): string {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + contextLength);

    let context = text.substring(start, end);

    // Dodaj ... jeśli tekst został obcięty
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPatternType(patternIndex: number): string {
    const types = [
        'exact-match',
        'node-reference-quote',
        'node-reference-bracket',
        'property-access',
        'property-contains',
        'expression',
        'json-path',
        'items-reference',
        'input-reference',
        'partial-match'
    ];
    return types[patternIndex] || 'unknown';
}

function deduplicateMatches(matches: MatchWithPriority[]): Match[] {
    const seen = new Set<string>();
    const unique: Match[] = [];

    // Sortuj najpierw według priorytetu wzorca
    const sorted = matches.sort((a, b) => {
        return a.priority - b.priority;
    });

    for (const match of sorted) {
        const key = `${match.field}:${match.expression}:${match.matchIndex}`;
        if (!seen.has(key)) {
            seen.add(key);
            // Usuń dodatkowe pola przed dodaniem do wyników
            const cleanMatch: Match = {
                field: match.field,
                expression: match.expression,
                fullValue: match.fullValue,
                context: match.context,
                matchIndex: match.matchIndex
            };
            unique.push(cleanMatch);
        }
    }

    return unique;
}

function calculateRelevanceScore(result: SearchResult, searchTerm: string): number {
    let score = 0;

    // Punkty za liczbę dopasowań
    score += result.matches.length * 10;

    // Punkty za exact match w nazwie node'a
    if (result.nodeName.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 50;
    }

    // Punkty za różne typy dopasowań
    result.matches.forEach(match => {
        if (match.expression === searchTerm) {
            score += 30; // Exact match
        } else if (match.expression.toLowerCase() === searchTerm.toLowerCase()) {
            score += 25; // Case insensitive exact match
        } else if (match.expression.includes(searchTerm)) {
            score += 15; // Contains
        } else {
            score += 5; // Partial match
        }

        // Bonus za krótsze wyrażenia (prawdopodobnie bardziej precyzyjne)
        if (match.expression.length < 50) {
            score += 5;
        }
    });

    return score;
}