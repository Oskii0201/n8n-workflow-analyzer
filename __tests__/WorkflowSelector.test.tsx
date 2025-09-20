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

    expect(screen.getByPlaceholderText('Search workflows...')).toBeInTheDocument();
  });

  it('displays all workflows in dropdown when focused', async () => {
    const user = userEvent.setup();
    render(<WorkflowSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search workflows...');
    await user.click(input);

    // Wait for dropdown to appear and check for workflow names
    await waitFor(() => {
      expect(screen.getByText('Workflow 1')).toBeInTheDocument();
      expect(screen.getByText('Workflow 2')).toBeInTheDocument();
      expect(screen.getByText('Workflow 3')).toBeInTheDocument();
    });
  });

  it('shows selected workflow', () => {
    render(<WorkflowSelector {...defaultProps} selectedWorkflow={mockWorkflows[1]} />);

    const input = screen.getByDisplayValue('Workflow 2');
    expect(input).toBeInTheDocument();
  });

  it('calls onSelect when workflow is selected', async () => {
    const user = userEvent.setup();
    render(<WorkflowSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search workflows...');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Workflow 2')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Workflow 2'));

    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockWorkflows[1]);
  });

  it('calls onSelect with null when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<WorkflowSelector {...defaultProps} selectedWorkflow={mockWorkflows[0]} />);

    const clearButton = screen.getByTitle('Clear selection');
    await user.click(clearButton);

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
    
    expect(screen.getByText('No workflows available')).toBeInTheDocument();
  });

  it('does not show empty state when loading', () => {
    render(<WorkflowSelector {...defaultProps} workflows={[]} loading={true} />);
    
    expect(screen.queryByText('No workflows available')).not.toBeInTheDocument();
  });

  it('shows active workflow indicator', async () => {
    const user = userEvent.setup();
    render(<WorkflowSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search workflows...');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('shows inactive workflow indicator', async () => {
    const user = userEvent.setup();
    render(<WorkflowSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search workflows...');
    await user.click(input);

    await waitFor(() => {
      expect(screen.getAllByText('Inactive')).toHaveLength(2);
    });
  });

  it('maintains selection when workflows are updated', () => {
    const { rerender } = render(<WorkflowSelector {...defaultProps} selectedWorkflow={mockWorkflows[1]} />);

    expect(screen.getByDisplayValue('Workflow 2')).toBeInTheDocument();

    const updatedWorkflows = [...mockWorkflows, { id: '4', name: 'Workflow 4', active: false, nodes: 2, updatedAt: '2023-01-04' }];
    rerender(<WorkflowSelector {...defaultProps} workflows={updatedWorkflows} selectedWorkflow={mockWorkflows[1]} />);

    expect(screen.getByDisplayValue('Workflow 2')).toBeInTheDocument();
  });

  it('handles search with no results', async () => {
    const user = userEvent.setup();
    render(<WorkflowSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText('Search workflows...');
    await user.type(input, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No workflows found matching "nonexistent"')).toBeInTheDocument();
    });
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