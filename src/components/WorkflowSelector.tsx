import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

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

const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ workflows, selectedWorkflow, onSelect, onRefresh, loading }) => (
  <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
      Wybierz Workflow
    </h2>
    <div className="flex items-center space-x-4">
      <select
        value={selectedWorkflow?.id || ''}
        onChange={e => {
          const workflow = workflows.find(w => w.id === e.target.value) || null;
          onSelect(workflow);
        }}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        <option value="">Wybierz workflow...</option>
        {workflows.map(workflow => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.name} ({workflow.nodes} node'ów) {workflow.active ? '🟢' : '🔴'}
          </option>
        ))}
      </select>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center"
        title="Odśwież listę workflow"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </button>
    </div>
    {workflows.length === 0 && !loading && (
      <p className="mt-3 text-sm text-gray-500">Brak dostępnych workflow</p>
    )}
  </section>
);

export default WorkflowSelector; 