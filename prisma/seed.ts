import { hash } from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const passwordHash = await hash("demo1234", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@jianai.test" },
    update: { name: "小艾", passwordHash },
    create: {
      email: "alice@jianai.test",
      name: "小艾",
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@jianai.test" },
    update: { name: "阿捡", passwordHash },
    create: {
      email: "bob@jianai.test",
      name: "阿捡",
      passwordHash,
    },
  });

  await prisma.spaceMember.deleteMany({
    where: { userId: { in: [alice.id, bob.id] } },
  });

  const space = await prisma.space.upsert({
    where: { inviteCode: "LOVE26" },
    update: {
      name: "我们的捡爱",
      createdBy: alice.id,
    },
    create: {
      name: "我们的捡爱",
      inviteCode: "LOVE26",
      createdBy: alice.id,
    },
  });

  await prisma.suggestionFeedback.deleteMany({
    where: { suggestion: { spaceId: space.id } },
  });
  await prisma.plan.deleteMany({ where: { spaceId: space.id } });
  await prisma.suggestion.deleteMany({ where: { spaceId: space.id } });
  await prisma.moment.deleteMany({ where: { spaceId: space.id } });
  await prisma.spaceMember.deleteMany({ where: { spaceId: space.id } });

  await prisma.spaceMember.createMany({
    data: [
      { spaceId: space.id, userId: alice.id, role: "owner" },
      { spaceId: space.id, userId: bob.id, role: "member" },
    ],
  });

  await prisma.moment.createMany({
    data: [
      {
        spaceId: space.id,
        authorId: alice.id,
        content: "晚饭后沿着江边走了很久，风有点凉，但很舒服。",
        mood: "calm",
        tags: JSON.stringify(["散步", "认真聊天"]),
        wantAgain: "yes",
        visibility: "shared",
      },
      {
        spaceId: space.id,
        authorId: bob.id,
        content: "在家看了一部很慢的电影，中途一起泡了茶。",
        mood: "happy",
        tags: JSON.stringify(["电影", "在家"]),
        wantAgain: "yes",
        visibility: "shared",
      },
    ],
  });

  console.log("Seeded demo space:", space.inviteCode);
  console.log("Accounts: alice@jianai.test / bob@jianai.test  password: demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
