import React, { useRef } from 'react';
import { Loader2, Search, Zap, Code, Database, FileText } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onChange: (value: string) => void;
  loading: boolean;
  disabled: boolean;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onExampleClick: (pattern: string) => void;
}

const EXAMPLES = [
  { label: 'Node reference', icon: <Code className="h-4 w-4 text-primary mr-2" />, pattern: "$('NodeName')" },
  { label: 'Alternative', icon: <Database className="h-4 w-4 text-primary mr-2" />, pattern: '$node["NodeName"]' },
  { label: 'Property', icon: <Zap className="h-4 w-4 text-primary mr-2" />, pattern: '$json.property' },
  { label: 'Nested', icon: <FileText className="h-4 w-4 text-primary mr-2" />, pattern: '.item.json.field' },
];

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onChange,
  loading,
  disabled,
  onKeyPress,
  onExampleClick
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

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
    <section className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">2</span>
        Search for Variable
      </h2>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => onChange(e.target.value)}
              placeholder="e.g. $('EmailData').item.json.details - searches automatically"
              className="w-full pl-10 pr-10 py-3 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors placeholder:text-muted-foreground"
              onKeyPress={onKeyPress}
              disabled={disabled}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" data-testid="loader-icon" />
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              onClick={() => handleExampleClick(example.pattern)}
              className="flex items-center p-3 border border-border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {example.icon}
              <div>
                <div className="font-medium text-foreground">{example.label}</div>
                <div className="text-sm text-muted-foreground font-mono">{example.pattern}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SearchBar;
