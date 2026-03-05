import type { PrismaClient, UserRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import jwt from "jsonwebtoken";
const { JsonWebTokenError, TokenExpiredError } = jwt;
type JwtPayload = jwt.JwtPayload;
type VerifyOptions = jwt.VerifyOptions;

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

type UserLookup = Pick<PrismaClient, "user">;

export type AuthConfig = {
  jwtSecret: string;
  prisma: UserLookup;
  jwtVerifyOptions?: VerifyOptions;
};

type AuthErrorPayload = {
  error: "Unauthorized" | "Forbidden";
  message: string;
};

type JwtClaims = JwtPayload & {
  sub: string;
};

function sendReply(reply: FastifyReply, statusCode: 401 | 403, body: AuthErrorPayload): void {
  reply.code(statusCode).send(body);
}

function unauthorized(reply: FastifyReply, message: string): void {
  sendReply(reply, 401, { error: "Unauthorized", message });
}

function forbidden(reply: FastifyReply, message: string): void {
  sendReply(reply, 403, { error: "Forbidden", message });
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

function verifyClaims(token: string, config: AuthConfig): JwtClaims {
  const payload = jwt.verify(token, config.jwtSecret, { ...config.jwtVerifyOptions, complete: false });

  if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new JsonWebTokenError("JWT payload must include a string sub claim");
  }

  return payload as JwtClaims;
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  config: AuthConfig,
  tokenRequired: boolean
): Promise<boolean> {
  request.user = undefined;

  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    if (tokenRequired) {
      unauthorized(reply, "Authentication required");
      return false;
    }

    return true;
  }

  let claims: JwtClaims;

  try {
    claims = verifyClaims(token, config);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      unauthorized(reply, "Token has expired");
      return false;
    }

    unauthorized(reply, "Invalid token");
    return false;
  }

  const user = await config.prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      username: true,
      role: true
    }
  });

  if (!user) {
    unauthorized(reply, "User no longer exists");
    return false;
  }

  request.user = user;
  return true;
}

export function authMiddleware(config: AuthConfig): preHandlerHookHandler {
  return async function handleAuth(request, reply): Promise<void> {
    await authenticate(request, reply, config, true);
  };
}

export function optionalAuth(config: AuthConfig): preHandlerHookHandler {
  return async function handleOptionalAuth(request, reply): Promise<void> {
    await authenticate(request, reply, config, false);
  };
}

export function requireAuth(config: AuthConfig): preHandlerHookHandler {
  return async function handleRequireAuth(request, reply): Promise<void> {
    const ok = await authenticate(request, reply, config, true);

    if (!ok || !request.user) {
      return;
    }
  };
}

export function requireAdmin(config: AuthConfig): preHandlerHookHandler {
  return async function handleRequireAdmin(request, reply): Promise<void> {
    const ok = await authenticate(request, reply, config, true);

    if (!ok || !request.user) {
      return;
    }

    if (request.user.role !== "ADMIN") {
      forbidden(reply, "Admin access required");
    }
  };
}

export { extractBearerToken };
