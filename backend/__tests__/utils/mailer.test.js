/**
 * Mailer Utilities Unit Tests
 * Target: Branch Coverage ≥ 96%
 * 
 * Tests nodemailer email sending functionality
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Mailer Utilities', () => {
  let mockSendMail;
  let mockCreateTransport;
  let sendEmail;

  beforeEach(async () => {
    // Reset modules to allow fresh mocking
    jest.resetModules();
    
    // Reset console mocks
    console.log = jest.fn();
    console.error = jest.fn();

    // Create mock sendMail function
    mockSendMail = jest.fn();
    
    // Create mock transporter
    mockCreateTransport = jest.fn(() => ({
      sendMail: mockSendMail,
    }));

    // Mock nodemailer
    jest.unstable_mockModule('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
      createTransport: mockCreateTransport,
    }));

    // Mock dotenv
    jest.unstable_mockModule('dotenv', () => ({
      default: {
        config: jest.fn(),
      },
      config: jest.fn(),
    }));
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.resetModules();
  });

  // ============================================================
  // MOCK MODE TESTS (No credentials)
  // ============================================================

  describe('Mock Mode (No Credentials)', () => {
    beforeEach(async () => {
      // Clear mail credentials
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      // Re-import after clearing env
      const mailerModule = await import('../../src/utils/mailer.js');
      sendEmail = mailerModule.sendEmail;
    });

    afterEach(() => {
      // Restore env variables if needed
      process.env.MAIL_USER = 'test@test.com';
      process.env.MAIL_PASS = 'testpass';
    });

    it('should log mock email when MAIL_USER is not set', async () => {
      delete process.env.MAIL_USER;
      process.env.MAIL_PASS = 'somepass';

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('recipient@test.com', 'Test Subject', '<p>Test Body</p>');

      expect(console.log).toHaveBeenCalledWith('DEBUG: MAIL_USER is', 'NOT SET');
    });

    it('should log mock email when MAIL_PASS is not set', async () => {
      process.env.MAIL_USER = 'someuser';
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('recipient@test.com', 'Test Subject', '<p>Test Body</p>');

      expect(console.log).toHaveBeenCalledWith('DEBUG: MAIL_PASS is', 'NOT SET');
    });

    it('should log mock email when both credentials are missing', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('recipient@test.com', 'Test Subject', '<p>Test Body</p>');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[MOCK EMAIL]'));
    });

    it('should log recipient in mock mode', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('john@example.com', 'Welcome', '<h1>Welcome!</h1>');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('john@example.com'));
    });

    it('should log subject in mock mode', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Important Subject', '<p>Body</p>');

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Important Subject'));
    });

    it('should log HTML body in mock mode', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<div>Custom HTML Content</div>');

      expect(logger.info).toHaveBeenCalledWith('Body:', '<div>Custom HTML Content</div>');

    });

    it('should not call transporter.sendMail in mock mode', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should return undefined in mock mode', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      const result = await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(result).toBeUndefined();
    });
  });

  // ============================================================
  // REAL EMAIL SENDING TESTS (With credentials)
  // ============================================================

  describe('Real Email Sending (With Credentials)', () => {
    beforeEach(async () => {
      // Set mail credentials
      process.env.MAIL_USER = 'sender@example.com';
      process.env.MAIL_PASS = 'secretpassword';
      process.env.MAIL_HOST = 'smtp.example.com';
      process.env.MAIL_PORT = '587';

      // Mock successful sendMail
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id-123' });
    });

    it('should send email successfully with all required fields', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      
      await mailerModule.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<h1>Test Body</h1>'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining('no-reply@example.com'),
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<h1>Test Body</h1>',
      });
    });

    it('should log message ID on success', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'success-123' });

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      // Check that console.log was called with the message format
      expect(console.log).toHaveBeenCalledWith('Message sent: %s', 'success-123');
    });

    it('should use correct sender address', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('sender@example.com'),
        })
      );
    });

    it('should handle multiple recipients', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      const recipients = 'user1@test.com, user2@test.com, user3@test.com';

      await mailerModule.sendEmail(recipients, 'Broadcast', '<p>Message</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipients,
        })
      );
    });

    it('should handle empty subject', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', '', '<p>Body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '',
        })
      );
    });

    it('should handle empty HTML body', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '',
        })
      );
    });

    it('should handle complex HTML content', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      const complexHtml = `
        <html>
          <body>
            <h1>Welcome!</h1>
            <p>Click <a href="https://example.com/verify?token=abc123">here</a> to verify.</p>
            <table>
              <tr><td>Name</td><td>John</td></tr>
            </table>
          </body>
        </html>
      `;

      await mailerModule.sendEmail('test@test.com', 'Welcome', complexHtml);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: complexHtml,
        })
      );
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('Error Handling', () => {
    beforeEach(async () => {
      process.env.MAIL_USER = 'sender@example.com';
      process.env.MAIL_PASS = 'secretpassword';
    });

    it('should throw error when sendMail fails', async () => {
      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(error);

      const mailerModule = await import('../../src/utils/mailer.js');

      await expect(
        mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should log error message when sendMail fails', async () => {
      const error = new Error('Authentication failed');
      mockSendMail.mockRejectedValue(error);

      const mailerModule = await import('../../src/utils/mailer.js');

      try {
        await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');
      } catch (e) {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith('Error sending email:', error);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      networkError.code = 'ECONNREFUSED';
      mockSendMail.mockRejectedValue(networkError);

      const mailerModule = await import('../../src/utils/mailer.js');

      await expect(
        mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockSendMail.mockRejectedValue(timeoutError);

      const mailerModule = await import('../../src/utils/mailer.js');

      await expect(
        mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND smtp.example.com');
      dnsError.code = 'ENOTFOUND';
      mockSendMail.mockRejectedValue(dnsError);

      const mailerModule = await import('../../src/utils/mailer.js');

      await expect(
        mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow('ENOTFOUND');
    });

    it('should handle invalid recipient error', async () => {
      const recipientError = new Error('Invalid recipient');
      recipientError.responseCode = 550;
      mockSendMail.mockRejectedValue(recipientError);

      const mailerModule = await import('../../src/utils/mailer.js');

      await expect(
        mailerModule.sendEmail('invalid@nonexistent.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow('Invalid recipient');
    });

    it('should handle rate limiting error', async () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.responseCode = 429;
      mockSendMail.mockRejectedValue(rateLimitError);

      const mailerModule = await import('../../src/utils/mailer.js');

      await expect(
        mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>')
      ).rejects.toThrow('Too many requests');
    });
  });

  // ============================================================
  // TRANSPORTER CONFIGURATION TESTS
  // ============================================================

  describe('Transporter Configuration', () => {
    beforeEach(async () => {
      process.env.MAIL_HOST = 'smtp.custom.com';
      process.env.MAIL_PORT = '465';
      process.env.MAIL_USER = 'customuser@custom.com';
      process.env.MAIL_PASS = 'custompassword';
    });

    it('should create transporter with environment config', async () => {
      // Re-import to trigger transporter creation
      await import('../../src/utils/mailer.js');

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.custom.com',
        port: '465',
        secure: false,
        auth: {
          user: 'customuser@custom.com',
          pass: 'custompassword',
        },
      });
    });

    it('should use secure: false for non-465 ports', async () => {
      process.env.MAIL_PORT = '587';
      
      await import('../../src/utils/mailer.js');

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          secure: false,
        })
      );
    });
  });

  // ============================================================
  // DEBUG LOGGING TESTS
  // ============================================================

  describe('Debug Logging', () => {
    it('should log debug message for MAIL_USER status when set', async () => {
      process.env.MAIL_USER = 'test@test.com';
      process.env.MAIL_PASS = 'pass';
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(console.log).toHaveBeenCalledWith('DEBUG: MAIL_USER is', 'SET');
    });

    it('should log debug message for MAIL_USER status when not set', async () => {
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(console.log).toHaveBeenCalledWith('DEBUG: MAIL_USER is', 'NOT SET');
    });

    it('should log debug message for MAIL_PASS status when set', async () => {
      process.env.MAIL_USER = 'test@test.com';
      process.env.MAIL_PASS = 'pass';
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(console.log).toHaveBeenCalledWith('DEBUG: MAIL_PASS is', 'SET');
    });

    it('should log debug message for MAIL_PASS status when not set', async () => {
      process.env.MAIL_USER = 'test@test.com';
      delete process.env.MAIL_PASS;

      const mailerModule = await import('../../src/utils/mailer.js');
      await mailerModule.sendEmail('test@test.com', 'Subject', '<p>Body</p>');

      expect(console.log).toHaveBeenCalledWith('DEBUG: MAIL_PASS is', 'NOT SET');
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('Edge Cases', () => {
    beforeEach(async () => {
      process.env.MAIL_USER = 'test@test.com';
      process.env.MAIL_PASS = 'pass';
      mockSendMail.mockResolvedValue({ messageId: 'edge-case-123' });
    });

    it('should handle very long email addresses', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';

      await mailerModule.sendEmail(longEmail, 'Subject', '<p>Body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: longEmail,
        })
      );
    });

    it('should handle special characters in subject', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      const specialSubject = '特殊字符 & <script> "quotes" \'apostrophes\'';

      await mailerModule.sendEmail('test@test.com', specialSubject, '<p>Body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: specialSubject,
        })
      );
    });

    it('should handle emoji in content', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');
      const emojiContent = '<p>Hello! 👋 Welcome 🎉</p>';

      await mailerModule.sendEmail('test@test.com', 'Subject', emojiContent);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: emojiContent,
        })
      );
    });

    it('should handle undefined values gracefully', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');

      await mailerModule.sendEmail(undefined, undefined, undefined);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Intern Project" <no-reply@example.com>',
        to: undefined,
        subject: undefined,
        html: undefined,
      });
    });

    it('should handle null values gracefully', async () => {
      const mailerModule = await import('../../src/utils/mailer.js');

      await mailerModule.sendEmail(null, null, null);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Intern Project" <no-reply@example.com>',
        to: null,
        subject: null,
        html: null,
      });
    });
  });
});
