# 具身智能科研对象池工作台

这是一个面向内部团队的具身智能科研对象池工作台，用于维护北美具身智能、机器人和 Physical AI 领域的人员名单、Eric 简短判断、优先级和飞书人物资料入口。

当前产品定位是 **经过人工筛选和分析的重点人员名单**。详细调研内容统一保存在飞书文档中，网页只保存对应人员的飞书文档链接。

当前版本已经从“前端本地原型”调整为 **Next.js 页面 + RESTful API Route Handlers** 的架构。前端页面通过 `/api/...` 接口读写数据；配置 Supabase 环境变量后，API 会读写 Supabase PostgreSQL、Auth 和 Storage。

## 当前已实现

- 工作概览：实时工作简报 + 每日工作记录，只保留当前任务、今日/本周摘要、最近 7 天动态、最新判断和下一步
- 工作记录：独立 `/updates` 页面查看全部历史记录，支持按日期、类型、人员和实验室筛选，并可新增、编辑、复制和删除
- 工作动态：面向上级展示有意义的成果，按日期分组，支持关联人员、实验室和飞书资料；普通系统审计日志不在首页展示
- 实时简报：标题、工作描述、关注方向和下一步计划均可通过右侧 Drawer 编辑，并通过 REST API 保存
- 人员目录：默认是紧凑宽行卡片，展示人物、机构方向、Eric 简短判断、优先级和飞书入口
- 人员头像：支持 JPG、PNG、WebP 上传、预览、替换和删除，单张最大 2MB；本地演示走 `public/uploads`，云端走 Supabase Storage
- 人物详情：不再建设独立网页详情页，完整人物资料统一从飞书打开
- 编辑模式：默认浏览态没有输入框；只有从“更多”菜单进入编辑时才出现表单
- 新增 / 编辑人员：只保留基础信息、Eric 简短判断、优先级、上级批注和飞书文档链接
- 登录权限：Supabase Auth 登录；`admin` / `editor` 可编辑，`viewer` 只能查看
- 协作功能：上级批注、工作动态、系统修改历史、归档/恢复、最近操作记录
- CSV 导入和导出
- RESTful API：人员、组织、动态、简报、下一步、头像和认证均已提供接口

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000/dashboard
```

常用页面：

- `/dashboard`：工作概览
- `/updates`：工作记录
- `/people`：人员目录
- `/people/new`：新增人员
- `/login`：登录页；没有 Supabase 环境变量时显示本地演示入口

本地如果没有配置 Supabase，系统会继续使用内存 seed 数据和本地头像目录，方便快速验收页面。配置 Supabase 后，内部页面会要求登录，数据会持久化到云端。

## RESTful API

人员：

```text
GET    /api/people
POST   /api/people
GET    /api/people/:id
PATCH  /api/people/:id
DELETE /api/people/:id
GET    /api/organizations
```

动态、认证和批量操作：

```text
GET    /api/auth/me
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/activity-logs
GET    /api/updates
POST   /api/updates
GET    /api/updates/:id
PATCH  /api/updates/:id
DELETE /api/updates/:id
POST   /api/people/import
POST   /api/research-pool/reset
```

Dashboard：

```text
GET    /api/dashboard/brief
PATCH  /api/dashboard/brief
GET    /api/dashboard/next-steps
POST   /api/dashboard/next-steps
PATCH  /api/dashboard/next-steps/:id
DELETE /api/dashboard/next-steps/:id
```

上传：

```text
GET    /api/uploads/avatar?path=...
POST   /api/uploads/avatar
DELETE /api/uploads/avatar
```

头像上传在本地演示模式下保存到 `public/uploads/avatars/`。配置 Supabase 后，头像会保存到私有 `avatars` bucket，并通过 `/api/uploads/avatar?path=...` 读取，避免直接暴露 Storage 文件。

当前 REST API 保持原路径不变。没有 Supabase 环境变量时使用服务端内存中的 seed 数据；配置 Supabase 后使用 `lib/supabase-research-pool-store.ts` 写入 PostgreSQL。

## Supabase 和部署

需要的环境变量见 `.env.example`：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 只能放在本地 `.env.local` 或 Vercel 服务器环境变量中，不能提交到 GitHub。
- Supabase Auth 建议关闭公开注册，只邀请 Eric 和上级账号。
- `user_profiles.role` 使用小写：`admin`、`editor`、`viewer`。
- 正式环境不要依赖 `public/uploads`，头像应使用 Supabase Storage。

数据库文件：

```text
supabase/migrations/20260717000000_cloud_deployment.sql
supabase/seed.sql
```

部署前建议顺序：

1. 在 Supabase 创建项目。
2. 执行 `supabase/migrations/20260717000000_cloud_deployment.sql`。
3. 在 Supabase Auth 中创建 Eric 和上级账号，关闭公开注册。
4. 在 `user_profiles` 中写入账号对应角色。
5. 按需执行 `supabase/seed.sql` 导入 starter 数据。
6. 在 Vercel 中导入 GitHub 仓库。
7. 配置 `.env.example` 中列出的环境变量。
8. Vercel Build Command 使用 `npm run build:vercel`。仓库已包含 `vercel.json`，正常导入时会自动读取。
9. 部署后检查登录、数据持久化、头像、飞书链接和 Viewer 权限。

## 验收建议

1. 未登录访问 `/dashboard`、`/updates`、`/people`、`/people/new` 会跳转 `/login`。
2. Eric 登录后可以新增、编辑、删除人员和工作记录。
3. Viewer 登录后只能查看，看不到写入入口，直接调用写入 API 会被拒绝。
4. 新增人员后刷新页面仍然存在。
5. 修改优先级后另一台电脑能看到。
6. 新增每日工作记录后 Dashboard 更新。
7. 头像上传、替换、删除后刷新仍然显示，并能跨设备访问。
8. “详情”按钮正确在新标签页打开飞书；没有飞书链接时显示“补充详情”。
9. Vercel 重新部署后数据仍然存在。

## 常用命令

```bash
npm run dev
npm run build
npm run build:vercel
npm test
npm run lint
npm run smoke:supabase
```

## 第一版暂不做

- 人员关系网络可视化
- 地理地图
- 自动爬虫
- AI 自动推荐联系人
- 邮件发送
- 论文全文管理
- 多人即时聊天
