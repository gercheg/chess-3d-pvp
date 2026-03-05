import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import {
  authMiddleware,
  extractBearerToken,
  optionalAuth,
  requireAdmin,
  requireAuth,
  type AuthConfig
} from "../src/auth/middleware.js";

type ReplyMock = {
  statusCode: number;
  sent: boolean;
  payload: unknown;
  code: (statusCode: number) => ReplyMock;
  send: (payload: unknown) => ReplyMock;
};

type RequestMock = {
  headers: {
    authorization?: string;
  };
  user?: {
    id: string;
    email: string;
    username: string;
    role: "USER" | "ADMIN";
  };
};

const users = new Map([
  [
    "user-1",
    {
      id: "user-1",
      email: "alice@chess.local",
      username: "alice",
      role: "USER" as const
    }
  ],
  [
    "admin-1",
    {
      id: "admin-1",
      email: "admin@chess.local",
      username: "admin",
      role: "ADMIN" as const
    }
  ]
]);

const secret = "test-secret";

const config: AuthConfig = {
  jwtSecret: secret,
  prisma: {
    user: {
      findUnique: async ({ where }) => {
        return users.get(where.id) ?? null;
      }
    }
  } as AuthConfig["prisma"]
};

function createReply(): ReplyMock {
  return {
    statusCode: 200,
    sent: false,
    payload: null,
    code(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send(payload) {
      this.sent = true;
      this.payload = payload;
      return this;
    }
  };
}

function createRequest(token?: string): RequestMock {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  };
}

function signToken(subject: string, expiresIn = "1h"): string {
  return jwt.sign({}, secret, {
    subject,
    expiresIn
  });
}

describe("extractBearerToken", () => {
  it("extracts token from a valid bearer header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("returns null for invalid or missing values", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("Token abc")).toBeNull();
    expect(extractBearerToken("Bearer   ")).toBeNull();
  });
});

describe("auth middleware", () => {
  it("authMiddleware rejects requests without token", async () => {
    const request = createRequest();
    const reply = createReply();

    await authMiddleware(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
    expect(request.user).toBeUndefined();
  });

  it("optionalAuth attaches user for a valid token", async () => {
    const request = createRequest(signToken("user-1"));
    const reply = createReply();

    await optionalAuth(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(false);
    expect(request.user).toMatchObject({
      id: "user-1",
      role: "USER"
    });
  });

  it("optionalAuth allows missing token", async () => {
    const request = createRequest();
    const reply = createReply();

    await optionalAuth(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(false);
    expect(request.user).toBeUndefined();
  });

  it("optionalAuth rejects invalid token", async () => {
    const request = createRequest("not-a-token");
    const reply = createReply();

    await optionalAuth(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toMatchObject({ error: "Unauthorized", message: "Invalid token" });
  });

  it("requireAuth rejects when user does not exist", async () => {
    const request = createRequest(signToken("missing-user"));
    const reply = createReply();

    await requireAuth(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toMatchObject({ message: "User no longer exists" });
  });

  it("requireAuth allows valid authenticated request", async () => {
    const request = createRequest(signToken("user-1"));
    const reply = createReply();

    await requireAuth(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(false);
    expect(request.user?.id).toBe("user-1");
  });

  it("requireAdmin rejects non-admin user", async () => {
    const request = createRequest(signToken("user-1"));
    const reply = createReply();

    await requireAdmin(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toMatchObject({ error: "Forbidden", message: "Admin access required" });
  });

  it("requireAdmin allows admin user", async () => {
    const request = createRequest(signToken("admin-1"));
    const reply = createReply();

    await requireAdmin(config)(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.sent).toBe(false);
    expect(request.user?.role).toBe("ADMIN");
  });
});
