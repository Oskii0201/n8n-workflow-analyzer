import React, { useState } from 'react';
import { Download, Copy, ChevronDown, ChevronRight, Package, Search } from 'lucide-react';

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

  const totalMatches = searchResults.reduce((acc, result) => acc + result.matches.length, 0);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">3</span>
            Results ({searchResults.length})
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {totalMatches} matches
            </span>
          </h2>
          <button
            onClick={onExport}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {searchResults.map((result, index) => {
          const isExpanded = expandedNode === result.nodeId;
          const nodeType = result.nodeType.replace('n8n-nodes-base.', '');
          
          return (
            <article key={`${result.nodeId}-${index}`} className="hover:bg-gray-50 transition-colors">
              <div className="p-4 cursor-pointer" onClick={() => toggleNode(result.nodeId)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {result.nodeName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          {nodeType}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {result.matches.length} matches
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="pt-4 space-y-3">
                    {result.matches.map((match, matchIndex) => (
                      <div key={matchIndex} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                              {match.field}
                            </span>
                          </div>
                          <button
                            onClick={() => onCopy(match.expression)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                            title="Copy expression"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="bg-gray-50 rounded border p-3 mb-3">
                          <code className="text-sm text-gray-800 break-all font-mono">
                            {match.expression}
                          </code>
                        </div>
                        
                        {match.context && (
                          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                            <span className="font-medium text-gray-700">Context:</span> {match.context}
                          </div>
                        )}
                      </div>
                    ))}
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