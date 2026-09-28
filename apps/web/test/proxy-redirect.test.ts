import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

const origin = 'https://bmost.example';

describe('entry redirects', () => {
  it('sends a new visitor from the root to login before rendering the dashboard', () => {
    const response = proxy(new NextRequest(`${origin}/`));
    expect(response.headers.get('location')).toBe(`${origin}/login`);
  });

  it('sends a signed-in visitor from the root to the dashboard', () => {
    const response = proxy(new NextRequest(`${origin}/`, {
      headers: { cookie: 'bmost_token=valid-token' },
    }));
    expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
  });

  it('sends a new visitor opening the dashboard directly to login', () => {
    const response = proxy(new NextRequest(`${origin}/dashboard`));
    expect(response.headers.get('location')).toBe(`${origin}/login?redirect=%2Fdashboard`);
  });

  it('keeps public verification accessible without signing in', () => {
    const response = proxy(new NextRequest(`${origin}/verify`));
    expect(response.headers.get('location')).toBeNull();
  });
});
