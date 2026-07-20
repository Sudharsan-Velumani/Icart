/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface SessionData {
    adminId?: string;
    adminEmail?: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
  }
}