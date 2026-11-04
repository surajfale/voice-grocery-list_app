import { describe, it, expect } from 'vitest';
import emailTemplates, { escapeHtml } from '../../templates/emailTemplates.js';

describe('email templates', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('never puts a non-IP "request location" into the reset email', () => {
    // A dotless decimal host survives the old split-on-dots masking
    const injected = '<a href=//3232235777>Verify here</a>.1.2.3';
    const { html, text } = emailTemplates.passwordResetEmail({
      userName: 'Ada',
      resetToken: 'abc123',
      userEmail: 'ada@example.com',
      requestIP: injected,
      requestTime: new Date('2026-11-04T10:00:00Z')
    });
    expect(html).not.toContain('3232235777');
    expect(text).not.toContain('3232235777');
    expect(html).toContain('Unknown location');
  });

  it('masks a real IPv4 address', () => {
    const { html } = emailTemplates.passwordResetEmail({
      userName: 'Ada', resetToken: 't', userEmail: 'ada@example.com', requestIP: '203.0.113.7'
    });
    expect(html).toContain('203.0.113.***');
  });

  it('escapes user-supplied names in every HTML email', () => {
    const userName = '<img src=x onerror=alert(1)>';
    const htmls = [
      emailTemplates.welcomeEmail({ userName, userEmail: 'a@b.co' }).html,
      emailTemplates.passwordResetEmail({ userName, resetToken: 't', userEmail: 'a@b.co', requestIP: '203.0.113.7' }).html,
      emailTemplates.passwordResetConfirmation({ userName }).html,
      emailTemplates.accountDeletionConfirmation({ userName, userEmail: 'a@b.co' }).html
    ];
    htmls.forEach((html) => {
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });
  });
});
