# 良甫

个人随笔和技术文章站。公开页面与中文管理后台在同一个 Next.js 项目中，内容由 Payload CMS 和 SQLite 管理。

## 本地启动

使用 Node.js 24.22.3 或更新的 Node 24 版本。可用 `npx -y -p node@24 -c '…'` 临时运行下列 npm 命令。

```sh
npm ci
```

首次配置时，把随机密钥写入本地 `.env`。重启或部署更新时保留同一个密钥。

```sh
umask 077
printf 'PAYLOAD_SECRET=%s\n' "$(openssl rand -hex 32)" > .env
npm run payload -- migrate
npm run seed    # 可选，插入三篇示例文章
npm run dev
```

- [首页](http://localhost:3000)
- [管理后台](http://localhost:3000/admin)，首次访问时设置并确认后台密码。以后只需要输入密码。

## 重置后台密码

在服务器的项目目录运行以下命令。终端会隐藏密码输入，重置后已有后台会话会退出。

```sh
npm run admin:reset-password
```

## 写文章

1. 在后台点「文章」→「新建」，填写标题、文章网址和分类。
2. 用 Markdown 写正文。在光标处粘贴截图，或点「插入图片」。上传后可以补充图片说明。等上传完成后再保存。
3. 保存草稿后点「预览」，打开实际阅读版式。发布后文章才出现在公开列表中。修改已发布文章时，可以先保存新草稿，原版本将继续公开，直到再次发布。
4. 「站点设置」可修改站名、作者、头像、首页主标题、slogan、署名、首页介绍、关于页和公开联系邮箱。

技术文章可用 Markdown 表格和带语言标记的代码块。技术文章包含至少三个二级或三级标题时显示目录。

在对应段落后空一行，用下面的 Markdown 写法添加页边批注。宽屏显示在右侧，窄屏显示在段落下方。

```md
:::note
这里写批注。
:::
```

## 腾讯云 COS 图片存储

部署环境设置 `COS_BUCKET=liangfu-1303587065`、`COS_REGION=ap-nanjing`、
`COS_SECRET_ID` 和 `COS_SECRET_KEY`。密钥只存放在服务端环境，建议使用仅能读、写、删除
`liangfu-media/*` 对象的 CAM 凭据。存储桶保持私有读写，无需为粘贴上传开放跨域访问。

配置后运行数据库迁移并重启服务。媒体 URL 由网站提供。游客只能读取已发布文章、关于页
或站点头像引用的图片。未配置 COS 密钥时，本地开发使用 `data/media/`。切换有旧图片的环境前，
需按媒体的存储前缀与对象键将文件复制到 COS，并验证原有图片地址。

## 自动清理未引用图片

在配置 COS 的单实例环境使用 `npm start` 启动后，网站每天自动检查一次。
只清理上传与最后修改均已满 24 小时、且未被已发布文章、草稿、可恢复的历史版本、关于页或头像引用的图片。
COS 删除失败会保留图片记录，便于下次重试。日常写作只需从正文移除贴错的图。

可以用 `npm run media:cleanup` 查看候选图片。需要立即执行时，在网站停机后运行
`npm run media:cleanup -- apply`。如果桶启用了版本控制，还需在 COS 控制台为
`liangfu-media/` 配置非当前版本的生命周期规则，才能释放历史版本占用的存储空间。

## 部署

在单实例 Node 服务器上运行。上线前配置独立的 `PAYLOAD_SECRET`，并在对外开放前，在本机设置好后台密码。启用 HTTPS 时设置 `ADMIN_COOKIE_SECURE=true`。让 `DATA_DIR` 指向持久化目录，每次更新先执行迁移，再构建并重启。

```sh
npm ci
npm run payload -- migrate
npm run build
npm start
```

默认数据位于 `data/site.db`，本地开发图片位于 `data/media/`。备份 SQLite 时使用 SQLite 在线备份工具，或停机后一并备份数据目录。上线时使用 HTTPS，由反向代理转发到应用。
