import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorDisplay from '../src/components/ErrorDisplay';

describe('ErrorDisplay', () => {
  it('renders error message when error is provided', () => {
    const errorMessage = 'Something went wrong';
    render(<ErrorDisplay error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles long error messages', () => {
    const longErrorMessage = 'This is a very long error message that should be displayed properly without breaking the layout or causing any issues with the component rendering';
    render(<ErrorDisplay error={longErrorMessage} />);
    expect(screen.getByText(longErrorMessage)).toBeInTheDocument();
  });

  it('handles special characters in error messages', () => {
    const specialCharError = 'Error with special chars: <>&"\'';
    render(<ErrorDisplay error={specialCharError} />);
    expect(screen.getByText(specialCharError)).toBeInTheDocument();
  });

  it('handles HTML in error messages safely', () => {
    const htmlError = '<script>alert("xss")</script>Error message';
    render(<ErrorDisplay error={htmlError} />);
    expect(screen.getByText(htmlError)).toBeInTheDocument();
    expect(screen.queryByText('xss')).not.toBeInTheDocument();
  });

  it('handles error with line breaks', () => {
    const multilineError = 'Error line 1\nError line 2\nError line 3';
    render(<ErrorDisplay error={multilineError} />);
    expect(screen.getByText(/Error line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Error line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Error line 3/)).toBeInTheDocument();
  });

  it('handles very short error messages', () => {
    render(<ErrorDisplay error="!" />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('handles error with only whitespace', () => {
    render(<ErrorDisplay error="   " />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('   ');
  });
}); 
