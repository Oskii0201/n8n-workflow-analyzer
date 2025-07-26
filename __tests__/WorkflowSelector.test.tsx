import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowSelector from '../src/components/WorkflowSelector';

const mockWorkflows = [
  { id: '1', name: 'Workflow 1', active: true, nodes: 5, updatedAt: '2023-01-01' },
  { id: '2', name: 'Workflow 2', active: false, nodes: 3, updatedAt: '2023-01-02' },
  { id: '3', name: 'Workflow 3', active: false, nodes: 7, updatedAt: '2023-01-03' },
];

const defaultProps = {
  workflows: mockWorkflows,
  selectedWorkflow: null,
  onSelect: jest.fn(),
  onRefresh: jest.fn(),
  loading: false,
};

describe('WorkflowSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with placeholder when no workflow is selected', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    expect(screen.getByText('Wybierz workflow...')).toBeInTheDocument();
  });

  it('displays all workflows in dropdown', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    expect(screen.getByText('Workflow 1 (5 node\'ów) 🟢')).toBeInTheDocument();
    expect(screen.getByText('Workflow 2 (3 node\'ów) 🔴')).toBeInTheDocument();
    expect(screen.getByText('Workflow 3 (7 node\'ów) 🔴')).toBeInTheDocument();
  });

  it('shows selected workflow', () => {
    render(<WorkflowSelector {...defaultProps} selectedWorkflow={mockWorkflows[1]} />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('2');
  });

  it('calls onSelect when workflow is selected', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockWorkflows[1]);
  });

  it('calls onSelect with null when placeholder is selected', () => {
    render(<WorkflowSelector {...defaultProps} selectedWorkflow={mockWorkflows[0]} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith(null);
  });

  it('shows loading state when loading is true', () => {
    render(<WorkflowSelector {...defaultProps} loading={true} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    const refreshButton = screen.getByRole('button');
    fireEvent.click(refreshButton);
    
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('shows empty state when no workflows are available', () => {
    render(<WorkflowSelector {...defaultProps} workflows={[]} />);
    
    expect(screen.getByText('Brak dostępnych workflow')).toBeInTheDocument();
  });

  it('does not show empty state when loading', () => {
    render(<WorkflowSelector {...defaultProps} workflows={[]} loading={true} />);
    
    expect(screen.queryByText('Brak dostępnych workflow')).not.toBeInTheDocument();
  });

  it('shows active workflow indicator', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    const activeOption = screen.getByText('Workflow 1 (5 node\'ów) 🟢');
    expect(activeOption).toBeInTheDocument();
  });

  it('shows inactive workflow indicator', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    const inactiveOption = screen.getByText('Workflow 2 (3 node\'ów) 🔴');
    expect(inactiveOption).toBeInTheDocument();
  });

  it('maintains selection when workflows are updated', () => {
    const { rerender } = render(<WorkflowSelector {...defaultProps} selectedWorkflow={mockWorkflows[1]} />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('2');
    
  
    const updatedWorkflows = [...mockWorkflows, { id: '4', name: 'Workflow 4', active: false, nodes: 2, updatedAt: '2023-01-04' }];
    rerender(<WorkflowSelector {...defaultProps} workflows={updatedWorkflows} selectedWorkflow={mockWorkflows[1]} />);
    
    expect(select.value).toBe('2');
  });

  it('handles workflow selection with non-existent workflow', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'non-existent' } });
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith(null);
  });

  it('shows refresh button when not loading', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('disables refresh button when loading', () => {
    render(<WorkflowSelector {...defaultProps} loading={true} />);
    
    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeDisabled();
  });

  it('enables refresh button when not loading', () => {
    render(<WorkflowSelector {...defaultProps} />);
    
    const refreshButton = screen.getByRole('button');
    expect(refreshButton).not.toBeDisabled();
  });
}); 