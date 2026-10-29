/* Authored from each upstream README on 2026-10-29; evidence is public at https://github.com/<repo>#readme. */
export const EDITORIAL_20261029 = new Map([
  [
    "Motionsites-AI/claude-skill",
    "这是一个供 Claude 使用的网站设计 Skill，目标是制作有视频与动效的落地页。它先从 40 套示例提示中选出与需求接近的 2–3 套，结合 50 多段视频、透明 3D 素材和图片建立具体设计规格，再按配套的 55 多项动画与视觉技巧编写页面；提供截图、移动端溢出、字体和视频播放检查流程，也可只输出面向 Lovable 等工具的提示词。Skill 的代码为 MIT，但示例提示和媒体另有版权限制；截图检查最好配合 Playwright。"
  ],
  [
    "daveebbelaar/bama",
    "面向 macOS 原生应用开发的一套 Agent Skills，而非可以直接运行的应用。它先对参考 App 逐屏截图、整理屏幕索引和用户故事，再以 Swift/SwiftUI 分阶段生成程序，每项变更提交前运行测试并对明暗主题截图；包含设计规范、性能检查、菜单栏快捷键和构建验证等 21 项技能。要求 macOS 26+、Xcode 26+ 和 Swift 6.2；克隆现有 App 时还需要具有电脑操作能力的 Agent，无法在普通 Windows 环境直接完成原生构建。"
  ],
  [
    "anonnerdfrenzy/survival-llm",
    "在 Mac 或 Windows 本机运行的离线问答与生存资料库。安装时先下载本地语言模型和资料库，之后在断网时也能搜索医疗、应急、百科和维修等文章，并在答案旁标出原文出处；还可加入 PDF、Word、EPUB 和文本资料，保存可编辑的个人备注。完整版资料下载约 8.8 GB，精简版约 1.3 GB，模型另占数 GB 到数十 GB；暂不支持扫描图片 OCR。医疗与安全建议仍应核对原始来源，不能把模型输出当成专业诊断。"
  ],
  [
    "blakeandersonw/ai-app-playbook",
    "这是一套关于 AI 应用从立项到盈利的分阶段开发手册，仓库提供 AGENTS.md、章节文档和 Cloudflare Worker 等模板。流程从细分需求验证开始，继续覆盖后端、身份认证、客户端、AI 模型、支付、埋点、留存和营销，示例技术栈包括 Cloudflare、Better Auth、OpenRouter、Stripe 与 SwiftUI。项目中的下载转化率、收入和成本属于作者的模型假设，并非经过验证的普遍结果；它提供实践路线而不是自动生成盈利应用的工具。"
  ],
  [
    "rossark0/rossark-motion-skill",
    "为编程 Agent 提供动画制作原则与可复用代码模板，适合为 React Native 或 SwiftUI 应用中的角色、图标、植物及界面元素添加持续运动。仓库提供统一时间轴、关键姿态之间的平滑过渡、关节支点、延迟跟随与随机循环等方法，并配有动作测量脚本、Swift/TypeScript 模板以及可重新渲染的 MP4/GIF 示例。它不是把任何 SVG 一键转成视频的通用服务；仍需依据画面结构编写动画并检查时序和接触位置。"
  ],
  [
    "smithjohn78390/tongjiang-lab",
    "面向高中教学的免费 3D 互动课程集，覆盖物理、化学、生物和地理，README 目前列出 54 节。每节课都是约 1 MB 的独立 HTML，包含可操作的 3D 场景、控制面板、引导问题和按步骤组织的课堂流程；可以在线使用，也能下载后离线在浏览器、投影仪或电子白板上打开。课程对齐中国高中课标及人教版教材，界面目前主要为中文，其他语言仍处于规划阶段。"
  ],
  [
    "man15h/tellyscope",
    "通过 Android 手机在同一 Wi-Fi 网络下管理 Android TV / Google TV 的工具，底层使用 ADB 调试协议。可以发现并配对电视、查看 CPU/内存和网络状态、遥控操作、传送文件、安装 APK/分包、调整桌面与私人 DNS，并根据 330 多份设备清单预览要停用的预装应用；系统应用以可恢复的禁用方式处理，改动有历史记录和撤销入口。要求手机 Android 8+ 且电视启用调试；Shield 和 Fire TV 的真机兼容性在 README 中尚未验证，停用系统组件仍有风险。"
  ],
  [
    "mirkobrombin/raven",
    "尝试在 x86_64 Linux 上直接运行 Windows 程序的兼容层实验项目。它不启动虚拟机，而是在隔离环境中接管程序发出的 Windows 系统调用，模拟进程、注册表、文件及窗口服务；图形输出接入 Wayland/Vulkan，Direct3D 通过 DXVK 和 vkd3d-proton 转换。仓库给出了 CMake 编译、运行安装包以及独立前缀和回滚方法，并列出 Notepad++、7-Zip、部分 .NET 应用等测试结果。并非所有 Windows 软件都兼容，部分程序与图形功能需要额外组件。"
  ],
  [
    "songjianyang/xss-audit",
    "面向 React、TypeScript、JavaScript 前端代码的静态 XSS 审计 Skill，按 14 层规则检查 DOM 注入、属性和 URL、JSON 注入、postMessage、原型污染、CSS/SVG/MathML、Markdown 清洗器、Trusted Types 和 CSP 等风险。可以指定源代码目录运行，生成包含文件位置、数据流、风险级别、修复建议与待人工核查项的 xss-audit-report.md。工具只做静态分析，关键词命中不等于存在漏洞，动态行为及未扫描文件仍需人工验证。"
  ],
  [
    "wangrongding/tv-fresh",
    "针对国产 MIUI TV 的去广告与桌面替换方案，也封装为可供 Agent 调用的 Skill。通过 ADB 管理广告/统计组件、替换为 Projectivy 桌面，并提供安装代理、SmartTube 和影音应用的分任务流程；README 记录了为解决 HOME 解析冲突而进行的系统框架逆向、命令及恢复步骤。作者明确实测环境为 MiTV-ASTP0 / Android 9，涉及对当前用户卸载系统包、禁用设置组件等操作，误用可能造成黑屏或功能异常；不应把该流程当作适用于所有电视的一键脚本。"
  ],
  [
    "stormydayy/halo-overlay",
    "运行在 Windows、macOS 和 Linux 的悬浮式实时 AI 辅助工具。它分别捕获系统音频与麦克风语音，通过语音识别生成逐字稿，再结合屏幕关键帧和模型提供即时提示；Rewind 可回看最近约 30 秒到 5 分钟的对话和画面，另有会话历史、摘要及 Markdown 导出。模型支持 OpenAI 兼容接口，也可连接 Ollama；语音识别可接在线 API 或本地 Whisper 服务。使用时要考虑模型调用费用、录音与屏幕共享的隐私及授权要求。"
  ],
  [
    "misshexa66/OunceCake",
    "面向 Switch 2 的文件提取实验工具，可读取系统已正常加载的游戏、更新与 DLC 中未加密的 romFS/exeFS 数据，支持实体卡与数字版。它依赖指定的 ns2jb 分支建立 RPC 会话，再通过设备上的 FTP 服务传出文件；工具本身不提供密钥，也不解密受保护的数据。使用条件包括可用的目标设备和相关研究环境，项目作者明确要求仅处理本人拥有的游戏且不要传播提取文件。"
  ],
  [
    "huaxialucaicaizi/ai-startup-skills",
    "为中国大陆一人公司或早期 AI 产品创业者组织的七个 Agent Skill：需求与 MVP 验证、商业计划书、政策与补贴检索、路演、获客、定价销售以及企业注册合规。总入口会根据已完成的阶段选择子技能，并复用前一步产生的验证材料、BP 或报价结果；同时提供同步脚本，方便从独立仓库更新技能。政策、税务和合规内容属于信息参考，仍需核对官方文件；部分营销和注册场景主要面向中国市场。"
  ],
  [
    "deepopen-com/deepopen-3d-webs",
    "面向参考图片的 3D 场景生成与展示工作台。用户提供图片、中文提示词和相机运动轨迹，可在同一界面管理预览图、彩色/深度动画、3D Gaussian 点云与 PLY 模型导出，并通过任务 ID 重放历史结果；采用 Gradio/FastAPI、Python 和 Docker，默认 Web 端口为 8090。项目默认运行演示模式：无 GPU 时可以浏览官方示例和任务页面，但真正从图片生成完整 3D 场景需要 CUDA、模型权重及相应依赖，不能把演示效果等同于无 GPU 的实际推理能力。"
  ]
]);
