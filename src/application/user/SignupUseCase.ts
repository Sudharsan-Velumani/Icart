import { User } from '../../domain/user/User';
import { EmailAlreadyRegisteredError, InvalidUserRegistrationError } from '../../domain/user/errors';
import type { PublicUser, UserRepository } from '../../domain/user/UserRepository';
import type { PasswordHasher } from '../auth/PasswordHasher';

const MIN_PASSWORD_LENGTH = 8;

export interface SignupCommand {
  email: string;
  password: string;
  name: string;
}

export class SignupUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(command: SignupCommand): Promise<PublicUser> {
    if (!command.password || command.password.length < MIN_PASSWORD_LENGTH) {
      throw new InvalidUserRegistrationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
    }

    const user = User.register({ email: command.email, name: command.name });

    const existing = await this.userRepository.findByEmail(user.email);
    if (existing) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    await this.userRepository.save({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash
    });

    return { id: user.id, email: user.email, name: user.name };
  }
}