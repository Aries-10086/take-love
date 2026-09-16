# 捡爱（Jian Ai）

记录情侣的恋爱时刻，并根据记录给出下一次约会建议。

## 本地启动

```bash
npm install
npx prisma db push
npm run db:seed   # 可选：写入演示账号
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

### 演示账号（seed 后）

| 邮箱 | 密码 |
|------|------|
| `alice@jianai.test` | `demo1234` |
| `bob@jianai.test` | `demo1234` |

两人已绑定同一空间，邀请码：`LOVE26`

## 当前已实现（MVP）

- 邮箱注册 / 登录
- 双人空间创建与邀请码加入
- 恋爱时刻记录、时间线、私密可见性
- 规则引擎约会建议 + 反馈
- 采纳为待办，完成后回流成新记录

## 文档

见仓库根目录 `项目落地文档.md`
