# Vibepet — AgentPet + OpenCodex 用量注入

AgentPet（Windows 便携版）在本机的配置与自定义注入层备份。作用：右键宠物时，它自带的卡片里多出一块 **OPENCODEX** 区域，显示 DeepSeek 余额、opencode-go 的 5 小时 / 周 / 月额度，以及今日 token 消耗。

## 结构

| 路径 | 作用 |
| --- | --- |
| `ocx-hud/launcher.cs` | 启动器源码：给 AgentPet 进程设置调试端口 9339，启动宠物并调用 `ocx-start.ps1` |
| `ocx-hud/ocx-start.ps1` | 启动数据服务与注入器（已在运行则跳过） |
| `ocx-hud/ocx-server.js` | 本地数据服务（127.0.0.1:47900），定时刷新缓存 |
| `ocx-hud/ocx-fetch.ps1` | 查 DeepSeek 余额、opencode-go 额度、汇总今日本地用量，写入 `cache.json` |
| `ocx-hud/ocx-inject.js` | 连接 WebView2 调试端口，把数据推给弹窗页面 |
| `ocx-hud/ocx-client-inject.js` | 注入到弹窗里的界面代码（复用应用自身的 CSS 类） |
| `ocx-hud/ocx-monitor.ps1` / `.cmd` | 文本版报表：余额 / 三个额度窗口 / 今日分 provider 明细 |
| `windows-portable/agentpet-hook.cmd` | Codex hook 的包装脚本 |
| `hooks.example.json` | `~/.codex/hooks.json` 示例（6 个事件指向包装脚本） |

## 工作原理

1. Codex 通过 `~/.codex/hooks.json` 调用 `agentpet-hook.cmd`，它再调用 `agentpet.exe hook --agent codex`。
   包装脚本存在的原因：Codex 在 Windows 上按 PowerShell 语义执行 hook，`"C:\...\agentpet.exe" hook --agent codex` 会被当成字符串字面量，报 `Unexpected token 'hook'` 并以退出码 1 结束。改成无空格、无引号的 `.cmd` 路径即可。
2. 启动器用进程级环境变量 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9339` 启动 AgentPet；`ocx-inject.js` 每 7 秒轮询 `http://127.0.0.1:9339/json/list`，发现 `popover.html` 就注入区块并推送 `cache.json` 的数据。
3. `ocx-fetch.ps1` 使用 `~/.opencodex/config.json` 里的 key 查询：DeepSeek `https://api.deepseek.com/user/balance`；opencode-go `https://opencode.ai/zen/go/v1/usage`（`rolling`=5 小时、`weekly`、`monthly`）。今日消耗来自 `~/.opencodex/usage.jsonl`。

## 恢复步骤（新机器）

1. 从 AgentPet Releases 下载 `AgentPet-portable-x64.zip`（win-v0.1.11），解压到 `windows-portable\`。
2. 把 `ocx-hud\` 放在 `windows-portable\` 同级；往 `ocx-hud\` 放一份 Node 22+ 的 `node.exe`（未入库，约 90MB）。
3. 把 `hooks.example.json` 合并进 `~/.codex/hooks.json`，路径换成本机路径；`agentpet-hook.cmd` 放到 `windows-portable\`。
4. 改 `launcher.cs` 里的三个绝对路径，然后编译：
```
csc /target:winexe /win32icon:<agentpet.exe> /out:launch-agentpet.exe launcher.cs
```
5. 开机自启：`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 下 `AgentPet` 指向 `launch-agentpet.exe`。
6. 打开 Codex CLI 的 `/hooks`，信任这些条目（改过命令后会再次要求）。
7. 验证：`curl http://127.0.0.1:9339/json/list` 应出现 `popover.html`；右键宠物应看到 OPENCODEX 区块。

## 注意

- 不要把 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` 设成用户级环境变量：所有 WebView2 程序都会读取它，其它程序（例如网易 UU 远程）会抢占端口。只在启动器里给 AgentPet 这一个进程设置。
- 端口 9339 只监听 `127.0.0.1`。
- AgentPet 升级后如果弹窗结构变化，`ocx-client-inject.js` 的选择器与插入点需要调整。
- 修改 `hooks.json` 后需要在 Codex 中重新信任。
- 不要用 AgentPet 设置里的「登录时启动」开关：Tauri 会把 Run 项改回裸 exe 路径；`ocx-inject.js` 会在两分钟内改回来，但最好别动。
