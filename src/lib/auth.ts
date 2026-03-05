import { SignJWT, jwtVerify } from "jose";
import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-dev-secret-change-in-prod"
);

export const COOKIE_NAME = "sq_token";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type UserRole = "SUPERADMIN" | "ADMIN" | "ENCARGADO" | "CAJERA" | "EMPLEADO";

export interface SessionPayload {
  sub: string;
  username: string;
  role: UserRole;
  organizationId: string | null; // null = SUPERADMIN
  employeeId?: string;
  plan?: "FREE" | "STARTER" | "PRO";
  planExpiresAt?: string | null; // ISO string
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}
