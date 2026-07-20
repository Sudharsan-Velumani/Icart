export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminCredentialsRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminCredentialsRecord | null>;
}