import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Loader2, RefreshCw, Search, X } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: number;
  updatedAt: string;
}

interface WorkflowSelectorProps {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  onSelect: (workflow: Workflow | null) => void;
  onRefresh: () => void;
  loading: boolean;
}

const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ workflows, selectedWorkflow, onSelect, onRefresh, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search term when selected workflow changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm(selectedWorkflow?.name || '');
  }, [selectedWorkflow]);

  // Sort workflows: active first, then inactive
  const sortedWorkflows = useMemo(() => {
    return [...workflows].sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [workflows]);

  // Filter workflows based on search term
  const filteredWorkflows = useMemo(() => {
    if (!searchTerm.trim()) return sortedWorkflows;
    return sortedWorkflows.filter(workflow =>
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedWorkflows, searchTerm]);

  const handleWorkflowSelect = (workflow: Workflow) => {
    onSelect(workflow);
    setSearchTerm(workflow.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onSelect(null);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(true);
    if (!value.trim()) {
      onSelect(null);
    }
  };

  return (
    <section className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
        Select workflow
      </h2>
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search workflows..."
            className="w-full pl-10 pr-10 py-3 bg-background text-foreground border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors placeholder:text-muted-foreground"
          />
          {selectedWorkflow && (
            <button
              onClick={clearSelection}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showDropdown && filteredWorkflows.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredWorkflows.map(workflow => (
                <button
                  key={workflow.id}
                  onClick={() => handleWorkflowSelect(workflow)}
                  className="w-full px-4 py-3 text-left hover:bg-accent flex items-center justify-between border-b border-border last:border-b-0"
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-3 ${workflow.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-medium text-foreground">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">{workflow.nodes} nodes</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {workflow.active ? 'Active' : 'Inactive'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-3 border border-input rounded-lg hover:bg-accent disabled:opacity-50 transition-colors flex items-center"
          title="Refresh workflow list"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>
      {workflows.length === 0 && !loading && (
        <p className="mt-3 text-sm text-muted-foreground">No workflows available</p>
      )}
      {showDropdown && filteredWorkflows.length === 0 && searchTerm.trim() && (
        <div className="mt-3 text-sm text-muted-foreground">No workflows found matching &quot;{searchTerm}&quot;</div>
      )}
    </section>
  );
};

export default WorkflowSelector; 
