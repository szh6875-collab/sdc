# Orbyte Hub 政策自动监控（无需 Google Cloud Billing）

这个版本把定时检查放在 GitHub Actions 里运行，不需要创建 Google Cloud 项目，也不需要启用 Cloud Run、Cloud Scheduler、Cloud Storage 或 Gemini API。它使用确定性的 PDF 文本提取和 SHA-256 比较；检测到变化只会生成审核报告，不会自动修改或启用合规规则。

## 一、启用自动监控

1. 在 GitHub 新建一个 repository，把 ZIP **解压后的项目文件**上传到仓库，而不是只把 ZIP 当成一个文件上传。确保 `.github/workflows/policy-monitor.yml` 位于仓库默认分支。
2. 打开仓库的 **Actions** 标签页。如 GitHub 提示尚未启用 Actions，先启用它。
3. 在左侧选择 **Orbyte Official Policy Monitor**，点击 **Run workflow**，选择默认分支并启动。
4. 打开本次运行的日志，查看 `Check official sources and compare guideline PDFs` 步骤。如果官方站点无法访问、返回 404，或 PDF 无法读取，工作流会记录失败状态并保留上次成功的快照；失败不会被当成同步成功。
5. 首次成功下载 PDF 后，状态会显示 `BASELINE SAVED — NO PRIOR COMPARISON`。这是正常现象：第一次只是建立基线，必须在后续成功抓取后才能判断内容是否变化。

配置好的工作流会按马来西亚时间每天约 **00:00 和 12:00** 运行；也可以在 Actions 页面随时手动运行。只有在人工检查最新报告后，手动运行时才勾选 `acknowledge_detected_changes` 输入项。这只会清除已再次成功抓取且哈希仍相同的待审核标记，不会启用合规规则。GitHub 的定时任务可能有延迟，不保证精确到分钟。

## 二、监控结果存在哪里

检测到 PDF 文本变化后，会建立一个持续保留的人工审核队列；下一次抓取即使相同，待审核提示也不会自动消失。人工看完报告后，手动运行工作流并将 `acknowledge_detected_changes` 设为 `true`，才会清除对应的审核标记。只有在文件再次成功抓取且哈希仍一致时才会清除；该操作不会启用或修改合规规则。

自动任务会将三个文件提交回仓库：

- `policy-monitoring/state.json`：上一次成功抓取的规范化文本、哈希和状态，用于下一次比较。
- `public/policy-monitoring/status.json`：Orbyte 页面读取的状态数据。
- `public/policy-monitoring/latest-report.md`：可阅读的检查报告，以及 PDF 变化时的旧/新文本片段。待审核变更会持续保留，直到人工确认；即使下一次抓取内容不再变化，未确认的变更也不会自动消失。

监控涵盖 LHDN 政策指南索引页、MyInvois SDK 指南页、MOF 预算门户，以及 LHDN General 和 Specific 两份 PDF。它还不是所有 SDK Schema、FAQ、Gazette 和 MOF 文件的完整政策知识库。

## 三、让当前 Orbyte Hub 页面显示最新状态

**如果你的应用是从同一个 GitHub 仓库自动构建/部署的**，请确认托管服务会在监控工作流提交新状态后重新构建/部署。页面默认读取 `/policy-monitoring/status.json`。如果托管服务不会随着仓库提交重新部署，GitHub 上的报告会持续更新，但线上应用仍可能展示旧版静态文件。

**如果应用部署在别的地方，且 GitHub 仓库为公开仓库**，请在应用的构建环境变量中设置：

```text
VITE_POLICY_MONITORING_STATUS_URL=https://raw.githubusercontent.com/OWNER/REPOSITORY/main/public/policy-monitoring/status.json
```

把 `OWNER` 和 `REPOSITORY` 换成真实的 GitHub 所有者/仓库名；如果默认分支不是 `main`，也请替换分支名。然后重新构建并部署前端。

公开仓库的原始状态 JSON 可以由浏览器直接读取；私有仓库不能在前端无凭据地读取。**不要把 GitHub Personal Access Token 放进前端环境变量或浏览器代码。** 私有仓库适合同一仓库内完成构建/部署，或由受信任的服务端安全地读取状态。

## 四、结果代表什么

- `baseline_saved`：首次成功抓取，记录基线；不能据此声称文档未变化。
- `unchanged`：本次提取的规范化 PDF 文本哈希和上一次成功快照一致。
- `changed`：文本内容发生变化，需要对照官方来源人工审核。
- `document_not_found`：链接返回 HTTP 404/410；上一次成功快照会保留。
- `unavailable`、`failed` 或 `unverifiable`：本次无法安全验证，不代表旧政策仍然有效。
- 门户网页变化不等于法规变化；PDF 文本变化也不直接证明法律含义、适用范围或生效日期发生变化。

无需填写 API Key。该监控器不调用 AI API，也不会自动激活合规规则。GitHub Actions 本身仍有平台使用限制；本方案消除的是政策定时任务对 Google Cloud Billing 的依赖，不代表所有应用托管服务都没有费用。
