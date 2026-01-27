import React, { useState } from 'react';
import { Download, Copy, ChevronDown, ChevronRight, Package, Search, Code } from 'lucide-react';

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

interface ResultsListProps {
  searchResults: SearchResult[];
  onCopy: (text: string) => void;
  onExport: () => void;
}

const ResultsList: React.FC<ResultsListProps> = ({ searchResults, onCopy, onExport }) => {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedNode(prev => (prev === nodeId ? null : nodeId));
  };

  const isCodeNode = (nodeType: string) => {
    return nodeType === 'n8n-nodes-base.code' ||
           nodeType === 'n8n-nodes-base.function' ||
           nodeType === 'n8n-nodes-base.functionItem';
  };

  const isJavaScriptMatch = (match: Match) => {
    return match.context.includes('Code Node') && match.context.includes('Line');
  };

  const formatCodeSnippet = (expression: string, isJsCode: boolean) => {
    if (!isJsCode || expression.length < 100) {
      return expression;
    }

    // For long code, show only the relevant lines
    const lines = expression.split('\n');
    if (lines.length <= 5) {
      return expression;
    }

    return lines.slice(0, 3).join('\n') + '\n... (' + (lines.length - 3) + ' more lines)';
  };

  const totalMatches = searchResults.reduce((acc, result) => acc + result.matches.length, 0);

  return (
    <section className="bg-card rounded-xl shadow-sm border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center">
            <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">3</span>
            Results ({searchResults.length})
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
              {totalMatches} matches
            </span>
          </h2>
          <button
            onClick={onExport}
            className="px-4 py-2 border border-input rounded-lg hover:bg-accent flex items-center transition-colors text-sm font-medium text-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {searchResults.map((result, index) => {
          const isExpanded = expandedNode === result.nodeId;
          const nodeType = result.nodeType.replace('n8n-nodes-base.', '');

          return (
            <article key={`${result.nodeId}-${index}`} className="hover:bg-accent transition-colors">
              <div className="p-4 cursor-pointer" onClick={() => toggleNode(result.nodeId)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCodeNode(result.nodeType)
                        ? 'bg-primary/10'
                        : 'bg-primary/10'
                    }`}>
                      {isCodeNode(result.nodeType) ? (
                        <Code className="h-4 w-4 text-primary" />
                      ) : (
                        <Package className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {result.nodeName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                          {nodeType}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                          {result.matches.length} matches
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border bg-muted/50">
                  <div className="pt-4 space-y-3">
                    {result.matches.map((match, matchIndex) => {
                      const isJsMatch = isJavaScriptMatch(match);
                      const formattedCode = formatCodeSnippet(match.expression, isJsMatch);

                      return (
                        <div key={matchIndex} className={`bg-card rounded-lg p-4 border shadow-sm ${
                          isJsMatch ? 'border-primary/30' : 'border-border'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {isJsMatch ? (
                                <Code className="h-4 w-4 text-primary" />
                              ) : (
                                <Search className="h-4 w-4 text-primary" />
                              )}
                              <span className={`text-sm font-medium px-3 py-1 rounded-full border ${
                                isJsMatch
                                  ? 'bg-primary/10 border-primary/30 text-primary'
                                  : 'bg-primary/10 border-primary/30 text-primary'
                              }`}>
                                {match.field}
                              </span>
                              {isJsMatch && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  JavaScript
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onCopy(match.expression)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                                title="Copy expression"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              {match.fullValue !== match.expression && (
                                <button
                                  onClick={() => onCopy(match.fullValue)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors text-xs"
                                  title="Copy full code"
                                >
                                  Full
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`rounded border p-3 mb-3 ${
                            isJsMatch ? 'bg-primary/5 border-primary/20' : 'bg-muted border-border'
                          }`}>
                            <code className={`text-sm break-all font-mono ${
                              isJsMatch ? 'text-primary' : 'text-foreground'
                            }`}>
                              {formattedCode}
                            </code>
                          </div>

                          {match.context && (
                            <div className={`text-xs text-muted-foreground bg-muted p-2 rounded border ${
                              isJsMatch && 'border-primary/20'
                            }`}>
                              <span className="font-medium text-foreground">Context:</span> {match.context}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ResultsList; 