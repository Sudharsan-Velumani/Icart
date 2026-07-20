import { PostgresAdminUserRepository } from './repositories/PostgresAdminUserRepository';
import { PostgresUserRepository } from './repositories/PostgresUserRepository';
import { bcryptPasswordHasher } from './auth/bcryptPasswordHasher';
import { AdminLoginUseCase } from '../application/auth/AdminLoginUseCase';
import { SignupUseCase } from '../application/user/SignupUseCase';
import { UserLoginUseCase } from '../application/user/UserLoginUseCase';

const adminUserRepository = new PostgresAdminUserRepository();
const userRepository = new PostgresUserRepository();

export const authContainer = {
  adminLogin: new AdminLoginUseCase(adminUserRepository, bcryptPasswordHasher),
  userSignup: new SignupUseCase(userRepository, bcryptPasswordHasher),
  userLogin: new UserLoginUseCase(userRepository, bcryptPasswordHasher)
};