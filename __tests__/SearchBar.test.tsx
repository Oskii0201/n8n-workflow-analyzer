import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../src/components/SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    searchTerm: '',
    onChange: jest.fn(),
    onSearch: jest.fn(),
    loading: false,
    disabled: false,
    onKeyPress: jest.fn(),
    onExampleClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<SearchBar {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/e\.g\. \$/)).toBeInTheDocument();
  });

  it('displays search term in input', () => {
    const searchTerm = 'test-variable';
    render(<SearchBar {...defaultProps} searchTerm={searchTerm} />);
    
    const input = screen.getByPlaceholderText(/e\.g\. \$/);
    expect(input).toHaveValue(searchTerm);
  });

  it('calls onChange when input value changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SearchBar {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByPlaceholderText(/e\.g\. \$/);
    await user.type(input, 'new-value');
    
    expect(onChange).toHaveBeenCalledTimes(9); // 'new-value' has 9 characters
  });

  it('calls onKeyPress when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onKeyPress = jest.fn();
    render(<SearchBar {...defaultProps} onKeyPress={onKeyPress} />);
    
    const input = screen.getByPlaceholderText(/e\.g\. \$/);
    await user.type(input, '{Enter}');
    
    expect(onKeyPress).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<SearchBar {...defaultProps} loading={true} />);
    
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<SearchBar {...defaultProps} disabled={true} />);
    
    const input = screen.getByPlaceholderText(/e\.g\. \$/);
    expect(input).toBeDisabled();
  });

  it('displays help examples', () => {
    render(<SearchBar {...defaultProps} />);
    
    expect(screen.getByText(/Node reference/i)).toBeInTheDocument();
    expect(screen.getByText(/Alternative/i)).toBeInTheDocument();
    // Property występuje jako label i jako kod, więc sprawdzamy oba
    const propertyMatches = screen.getAllByText(/Property/i);
    expect(propertyMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Nested/i)).toBeInTheDocument();
    
    expect(screen.getByText(/\$\(/)).toBeInTheDocument();
    expect(screen.getByText(/\$node\[/)).toBeInTheDocument();
    expect(screen.getByText(/\$json\./)).toBeInTheDocument();
    expect(screen.getByText(/\.item\.json\./)).toBeInTheDocument();
  });

  it('calls onExampleClick when example is clicked', async () => {
    const user = userEvent.setup();
    const onExampleClick = jest.fn();
    render(<SearchBar {...defaultProps} onExampleClick={onExampleClick} />);

    await user.click(screen.getByText('Node reference'));
    expect(onExampleClick).toHaveBeenCalledWith("$('NodeName')");
  });

  it('has correct accessibility attributes', () => {
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/e\.g\. \$/);
    expect(input).toHaveAttribute('type', 'text');
  });
}); 
