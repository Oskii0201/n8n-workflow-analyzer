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
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
        Select workflow
      </h2>
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search workflows..."
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
          {selectedWorkflow && (
            <button
              onClick={clearSelection}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showDropdown && filteredWorkflows.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredWorkflows.map(workflow => (
                <button
                  key={workflow.id}
                  onClick={() => handleWorkflowSelect(workflow)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-3 ${workflow.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{workflow.name}</div>
                      <div className="text-sm text-gray-500">{workflow.nodes} nodes</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
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
          className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center"
          title="Refresh workflow list"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>
      {workflows.length === 0 && !loading && (
        <p className="mt-3 text-sm text-gray-500">No workflows available</p>
      )}
      {showDropdown && filteredWorkflows.length === 0 && searchTerm.trim() && (
        <div className="mt-3 text-sm text-gray-500">No workflows found matching &quot;{searchTerm}&quot;</div>
      )}
    </section>
  );
};

export default WorkflowSelector; 