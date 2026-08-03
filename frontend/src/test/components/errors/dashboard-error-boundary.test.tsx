import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DashboardError from '../../../app/[locale]/(dashboard)/error';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'errors.unexpected_error': 'Something went wrong',
      'errors.generic': 'Please try again',
      'errors.server_error': 'Server error',
      'actions.retry': 'Retry',
      'actions.back': 'Back',
    };

    return translations[key] ?? key;
  },
}));

describe('DashboardError', () => {
  it('renders localized fallback copy and allows retry', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<DashboardError error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please try again')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
