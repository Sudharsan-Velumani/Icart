import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../application/auth/PasswordHasher';

const SALT_ROUNDS = 12;

export const bcryptPasswordHasher: PasswordHasher = {
  hash: (plainPassword: string) => bcrypt.hash(plainPassword, SALT_ROUNDS),
  compare: (plainPassword: string, hash: string) => bcrypt.compare(plainPassword, hash)
};