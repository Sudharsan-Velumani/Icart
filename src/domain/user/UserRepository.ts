export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface UserCredentialsRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface NewUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserCredentialsRecord | null>;
  save(user: NewUserRecord): Promise<void>;
}