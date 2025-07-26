import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsList from '../src/components/ResultsList';

const mockResults = [
  {
    nodeName: 'Node A',
    nodeType: 'n8n-nodes-base.httpRequest',
    nodeId: '1',
    matches: [
      {
        field: 'url',
        expression: "$json.url",
        fullValue: 'https://example.com',
        context: 'Node context',
        matchIndex: 0,
      },
    ],
  },
  {
    nodeName: 'Node B',
    nodeType: 'n8n-nodes-base.set',
    nodeId: '2',
    matches: [
      {
        field: 'value',
        expression: "$json.value",
        fullValue: '42',
        context: '',
        matchIndex: 0,
      },
      {
        field: 'another',
        expression: "$json.another",
        fullValue: 'test',
        context: 'Another context',
        matchIndex: 1,
      },
    ],
  },
];

describe('ResultsList', () => {
  it('renders results and matches', () => {
    render(
      <ResultsList
        searchResults={mockResults}
        onCopy={jest.fn()}
        onExport={jest.fn()}
      />
    );
    expect(screen.getByText('Results (2)')).toBeInTheDocument();
    expect(screen.getByText('Node A')).toBeInTheDocument();
    expect(screen.getByText('Node B')).toBeInTheDocument();
    expect(screen.getByText('httpRequest')).toBeInTheDocument();
    expect(screen.getByText('set')).toBeInTheDocument();
    expect(screen.getByText('1 matches')).toBeInTheDocument();
    expect(screen.getByText('2 matches')).toBeInTheDocument();
  });

  it('expands and collapses nodes, only one at a time', () => {
    render(
      <ResultsList
        searchResults={mockResults}
        onCopy={jest.fn()}
        onExport={jest.fn()}
      />
    );
    // Expand Node A
    fireEvent.click(screen.getByText('Node A'));
    expect(screen.getByText('$json.url')).toBeInTheDocument();
    // Expand Node B, Node A collapses
    fireEvent.click(screen.getByText('Node B'));
    expect(screen.getByText('$json.value')).toBeInTheDocument();
    expect(screen.queryByText('$json.url')).not.toBeInTheDocument();
    // Collapse Node B
    fireEvent.click(screen.getByText('Node B'));
    expect(screen.queryByText('$json.value')).not.toBeInTheDocument();
  });

  it('calls onCopy when copy button is clicked', () => {
    const onCopy = jest.fn();
    render(
      <ResultsList
        searchResults={mockResults}
        onCopy={onCopy}
        onExport={jest.fn()}
      />
    );
    // Expand Node A
    fireEvent.click(screen.getByText('Node A'));
    // Click copy button
    const copyBtn = screen.getAllByTitle('Copy expression')[0];
    fireEvent.click(copyBtn);
    expect(onCopy).toHaveBeenCalledWith('$json.url');
  });

  it('calls onExport when export button is clicked', () => {
    const onExport = jest.fn();
    render(
      <ResultsList
        searchResults={mockResults}
        onCopy={jest.fn()}
        onExport={onExport}
      />
    );
    const exportBtn = screen.getByRole('button', { name: /export json/i });
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalled();
  });

  it('renders empty state if no results', () => {
    render(
      <ResultsList
        searchResults={[]}
        onCopy={jest.fn()}
        onExport={jest.fn()}
      />
    );
    expect(screen.getByText('Results (0)')).toBeInTheDocument();
    expect(screen.getByText('0 matches')).toBeInTheDocument();
  });
}); 