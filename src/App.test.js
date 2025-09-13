import { render, screen } from '@testing-library/react';
import App from './App';

test('renders OnTrack title', () => {
  render(<App />);
  const titleElement = screen.getByText(/OnTrack/i);
  expect(titleElement).toBeInTheDocument();
});
