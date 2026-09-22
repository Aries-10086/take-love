# 捡爱（Jian Ai）

双人私密恋爱空间：记下相处时刻，再一起决定下一次约会。

## 本地启动

```bash
cp .env.example .env
# 编辑 .env：至少设置 AUTH_SECRET（可用 openssl rand -base64 32）

npm install
npx prisma db push
npm run db:seed   # 可选：写入演示账号（勿用于生产）
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

### 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | 本地默认 `file:./dev.db`（SQLite） |
| `AUTH_SECRET` | Auth.js 签名密钥，生产必填 |
| `AUTH_URL` | 站点公网地址，如 `https://example.com` |

### 演示账号（仅 seed 后）

| 邮箱 | 密码 |
|------|------|
| `alice@jianai.test` | `demo1234` |
| `bob@jianai.test` | `demo1234` |

邀请码：`LOVE26`

## 生产部署注意

- **不要**在生产跑 `db:seed`
- 当前默认库是 **SQLite**，适合单机/小流量；正式多实例请换 Postgres，并用 `prisma migrate` 管理 schema（勿依赖 `db push`）
- 设置强随机 `AUTH_SECRET`，并把 `AUTH_URL` 指到 HTTPS 域名
- 登录/注册/加入有进程内限流；多实例部署需换共享限流（如 Redis）

## 已实现能力

- 邮箱注册 / 登录（密码 ≥ 8 位）
- 双人空间、邀请码/链接加入、离开交接与邀请码轮换
- 时刻时间线、私密可见、置顶与筛选
- 规则建议引擎、双人喜欢、采纳为约会
- 完成约会回流成时刻；首页「下一次」与本周来信
- 玩法：抽签、报告、那年今日、默契问答、惊喜便签
- 隐私说明与账号注销

## 文档

见仓库根目录 `项目落地文档.md` 与 `SKILL.md`（Commit-as-Prompt）
