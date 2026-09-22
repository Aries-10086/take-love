import { randomInt } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export async function getMembership(userId: string) {
  return prisma.spaceMember.findUnique({
    where: { userId },
    include: {
      space: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
}

/** Cryptographically stronger invite codes (avoids Math.random). */
export function makeInviteCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code;
}

/** Allocate a unique invite code with a few retries. */
export async function allocateInviteCode(
  exists: (code: string) => Promise<boolean>,
  attempts = 8,
) {
  for (let i = 0; i < attempts; i += 1) {
    const code = makeInviteCode();
    if (!(await exists(code))) return code;
  }
  throw new Error("INVITE_ALLOC_FAILED");
}
