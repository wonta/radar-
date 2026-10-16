# radar

私人中文 GitHub 项目日报与项目档案。项目名保持 `radar`；现有仓库 `wonta/radar-` 与 Vercel 项目继续使用，不新建替代项目。

## 阅读体验

- 每日雷达：按原日期保留速览、重点介绍与其他项目。
- 项目库：用途分类、标签、中文搜索、最近/最早收录、次数与名称排序，分页浏览。
- 项目详情：独立可复制地址、逐日收录记录、原仓库/README/Release 入口。
- 私人收藏：收藏、已读、笔记保存在浏览器；自动迁移旧 `github-radar-saved-v1` 收藏，支持 JSON 导出与合并导入。
- 手机：底部导航、完整用途描述、独立滚动速览表格；不隐藏核心介绍。

## 数据边界

初版重构包含 2026-10-10 至 2026-10-16 的 **7 期、174 条收录、127 个不同仓库**。旧版 36 个仓库仅为节选。“175 条”是先前错误计数。

历史数据来自原对话日报，正文做了编辑整理，**没有把这些数值重新认证为 GitHub 实测数据**。各 metric 带类型和 `verified:false`，并属于具体日期。仓库功能、平台和许可说明同样是历史摘要，实施前请读当前上游文档。网站不计算两次总 Stars 差值来伪造 Stars today。

**自动发现、独立核验、AI 生成日报及 Release 跟踪尚未接通。** 构建发布可以自动运行，但它不会自行生产新一期内容，也不能自动读取其他 ChatGPT 对话。

## 开发

运行环境：Node.js 22+。网站没有运行时 npm 依赖、外部字体或分析脚本。

```sh
npm run check
node scripts/serve.mjs
# http://127.0.0.1:4173
```

`npm test` 执行数据模型回归；`npm run build` 输出 `dist/`。预览服务器只监听本机，模拟生产安全响应头。

真实浏览器测试（开发依赖，仅测试需要）：

```sh
npm install --no-save --ignore-scripts @playwright/test@1.64.1
npx playwright install chromium
npx playwright test
```

CI 固定 Action 提交与 Playwright 版本，运行数据校验、真实 HTTP/ES module/localStorage 浏览器测试。测试产物仅保留 7 天；不捕获登录会话或凭据。

## 新一期内容

旧 `data/catalog.tsv` 和 `data/issues.tsv` 是冻结迁移输入，`data/legacy-lock.json` 防止无意修改。新一期放在 `content/issues/YYYY-MM-DD.json`，不覆写历史快照。

```json
{
  "date": "2026-10-17",
  "source": "editorial",
  "projects": [],
  "entries": [{
    "repo": "morluto/rea",
    "featured": false,
    "summary": "本期实际核验后写入的简介。",
    "detail": "",
    "note": "",
    "metric": {"type": "new", "value": null, "display": null, "verified": false}
  }]
}
```

上面只演示字段形状，不是可以直接发布的日报。已有项目没有热度证据时，不应冒用“新项目”标签。请按实际核验记录选择 `daily`、`total` 或确实新发现的 `new`。已验证数值还需要 `sourceUrl` 与 `capturedAt`。新增仓库需在 `projects` 提供 `id/name/category/flag/tags` 元数据。

```sh
node scripts/import-issue.mjs /path/to/reviewed-issue.json
npm run check
```

导入器拒绝已有日期，验证成功后才写入新文件。改正旧数据必须作为明确的更正提交记录，而不是悄悄更新历史。

## 部署与权限

Vercel 项目：`radar`（`prj_Gs0TxmBW8BaWrbjB2CKUV0LMysTr`）；GitHub 源：`wonta/radar-`，Private。

- Framework: Other / null
- Build: `node scripts/build.mjs`
- Output: `dist`
- Install: 空
- **保留 Vercel Authentication 对所有部署生效。** `noindex` 不是身份验证。

仓库不包含账户密钥；只把 `dist/` 中允许的静态文件发布出去。收藏不跨设备自动同步，原访问域名应保留，避免切换 origin 导致用户看不到原浏览器的收藏。

审计范围、修复和验收限制见 [docs/AUDIT.md](docs/AUDIT.md)。