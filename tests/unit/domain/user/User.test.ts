import { describe, it, expect } from 'vitest';
import { User } from '../../../../src/domain/user/User';
import { InvalidUserRegistrationError } from '../../../../src/domain/user/errors';

describe('User', () => {
  describe('register', () => {
    it('creates a valid user with a generated id', () => {
      const user = User.register({ email: 'jane@icart.com', name: 'Jane Doe' });
      expect(user.id).toBeTruthy();
      expect(user.email).toBe('jane@icart.com');
      expect(user.name).toBe('Jane Doe');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('normalizes email to lowercase and trims whitespace', () => {
      const user = User.register({ email: '  Jane@ICart.COM  ', name: 'Jane' });
      expect(user.email).toBe('jane@icart.com');
    });

    it('trims whitespace from name', () => {
      const user = User.register({ email: 'jane@icart.com', name: '  Jane Doe  ' });
      expect(user.name).toBe('Jane Doe');
    });

    it.each(['not-an-email', 'missing-at.com', '@nodomain', 'no-dot@domain'])(
      'rejects an invalid email format ("%s")',
      (email) => {
        expect(() => User.register({ email, name: 'Jane' })).toThrow(InvalidUserRegistrationError);
      }
    );

    it('rejects an empty name', () => {
      expect(() => User.register({ email: 'jane@icart.com', name: '' })).toThrow(
        InvalidUserRegistrationError
      );
    });

    it('rejects a blank (whitespace-only) name', () => {
      expect(() => User.register({ email: 'jane@icart.com', name: '   ' })).toThrow(
        InvalidUserRegistrationError
      );
    });

    it('rejects a name longer than 200 characters', () => {
      const longName = 'a'.repeat(201);
      expect(() => User.register({ email: 'jane@icart.com', name: longName })).toThrow(
        InvalidUserRegistrationError
      );
    });
  });

  describe('reconstitute', () => {
    it('rebuilds a user from a persisted snapshot', () => {
      const original = User.register({ email: 'jane@icart.com', name: 'Jane' });
      const snapshot = original.toSnapshot();
      const rebuilt = User.reconstitute(snapshot);

      expect(rebuilt.id).toBe(original.id);
      expect(rebuilt.email).toBe(original.email);
      expect(rebuilt.name).toBe(original.name);
    });
  });
});
