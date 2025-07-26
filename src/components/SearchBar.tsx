import React, { useRef } from 'react';
import { Loader2, Search, Zap, Code, Database, FileText } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
  disabled: boolean;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onExampleClick: (pattern: string) => void;
}

const EXAMPLES = [
  { label: 'Node reference', icon: <Code className="h-4 w-4 text-blue-600 mr-2" />, pattern: "$('NodeName')" },
  { label: 'Alternative', icon: <Database className="h-4 w-4 text-green-600 mr-2" />, pattern: '$node["NodeName"]' },
  { label: 'Property', icon: <Zap className="h-4 w-4 text-purple-600 mr-2" />, pattern: '$json.property' },
  { label: 'Nested', icon: <FileText className="h-4 w-4 text-orange-600 mr-2" />, pattern: '.item.json.field' },
];

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onChange, onSearch, loading, disabled, onKeyPress, onExampleClick }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isSearchTermEmpty = !searchTerm || searchTerm.trim() === '';
  const isButtonDisabled = loading || disabled || isSearchTermEmpty;

  // Obsługa kliknięcia w przykład
  const handleExampleClick = (pattern: string) => {
    onExampleClick(pattern);
    setTimeout(() => {
      inputRef.current?.focus();
      // Ustaw kursor w miejscu NodeName jeśli jest
      const pos = pattern.indexOf('NodeName');
      if (pos !== -1 && inputRef.current) {
        inputRef.current.setSelectionRange(pos, pos + 'NodeName'.length);
      } else if (inputRef.current) {
        inputRef.current.setSelectionRange(pattern.length, pattern.length);
      }
    }, 0);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">2</span>
        Search for Variable
      </h2>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => onChange(e.target.value)}
              placeholder="e.g. $('EmailData').item.json.details"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              onKeyPress={onKeyPress}
            />
          </div>
          <button
            onClick={onSearch}
            disabled={isButtonDisabled}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors font-medium"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" data-testid="loader-icon" /> : <Search className="h-4 w-4 mr-2" />}
            Search
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              onClick={() => handleExampleClick(example.pattern)}
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              {example.icon}
              <div>
                <div className="font-medium text-gray-900">{example.label}</div>
                <div className="text-sm text-gray-600 font-mono">{example.pattern}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SearchBar;