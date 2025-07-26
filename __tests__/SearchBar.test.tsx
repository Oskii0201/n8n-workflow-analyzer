import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders search input and button', () => {
    render(<SearchBar {...defaultProps} />);
    
    expect(screen.getByPlaceholderText(/e\.g\. \$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
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

  it('calls onSearch when search button is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<SearchBar {...defaultProps} onSearch={onSearch} searchTerm="test" />);
    
    const button = screen.getByRole('button', { name: /search/i });
    await user.click(button);
    
    expect(onSearch).toHaveBeenCalledTimes(1);
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
    
    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<SearchBar {...defaultProps} disabled={true} />);
    
    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
  });

  it('disables button when search term is empty', () => {
    render(<SearchBar {...defaultProps} searchTerm="" />);
    
    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
  });

  it('disables button when search term is only whitespace', () => {
    render(<SearchBar {...defaultProps} searchTerm="   " />);
    
    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
  });

  it('enables button when search term is valid', () => {
    render(<SearchBar {...defaultProps} searchTerm="valid-search" />);
    
    const button = screen.getByRole('button', { name: /search/i });
    expect(button).not.toBeDisabled();
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

  it('has correct accessibility attributes', () => {
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/e\.g\. \$/);
    expect(input).toHaveAttribute('type', 'text');
  });
}); 