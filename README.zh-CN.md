# ZKube

<p align="center">
  <strong>面向 Apache ZooKeeper 的现代桌面工作台。</strong>
</p>

<p align="center">
  基于 Electron、React、TypeScript 和 Monaco Editor 构建。
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="https://github.com/espen7/ZKube">GitHub</a>
  ·
  <a href="./CHANGELOG.md">更新日志</a>
  ·
  <a href="./LICENSE">MIT License</a>
</p>

## 项目截图

![ZKube screenshot - light theme](docs/screenshot.png)

![ZKube screenshot - dark theme](docs/screenshot_dark.png)

## 项目简介

ZKube 是一个面向 `Apache ZooKeeper` 的桌面图形工具，重点解决日常运维和开发里最常见的几类操作：

- 在多个 ZooKeeper 环境之间快速切换
- 按需浏览大规模节点树，而不是一次性全量加载
- 用现代编辑器查看和编辑节点数据
- 在同一工作区里查看元数据与 ACL
- 对重要节点做本地标记，方便重复访问


## 为什么做 ZKube

ZooKeeper 的概念不复杂，但一旦进入日常运维和排障，传统桌面工具往往会显得笨重、陈旧，很多核心操作也不够顺手。ZKube 的目标就是把这些高频流程整理成更现代的控制台体验：

- **Connection workspace**：统一管理连接配置和切换状态
- **Tree browser**：更紧凑的节点树浏览、过滤、深度搜索与本地标记
- **Workbench**：围绕节点数据、元数据和 ACL 的集中工作区
- **Desktop runtime**：保持 Electron 边界清晰、设置可持久化、Windows 打包可落地

## 主要能力

### 连接管理

- 本地保存和编辑连接配置
- 从 JSON 文件导入连接
- 导出已保存连接到 `zkube-connections.json`
- 区分连接中、健康、断开等运行状态
- 连接异常断开时自动感知并弹出提示

### 节点树浏览

- 按需加载根节点
- 懒加载展开子节点
- 对已加载节点做本地过滤
- 基于当前连接执行深度搜索
- 不依赖后台 watch，改为手动刷新树状态
- 右键支持创建子节点、删除节点、本地颜色标记

### 本地节点标记

- 支持红、橙、黄、绿四种颜色
- 按 `connectionId + nodePath` 维度持久化
- 在 Tree 中直接显示颜色点
- 在 Workbench 顶部集中展示当前连接下的 `MARK NODE` 列表，作为快捷跳转入口

### 节点工作区

- 从 Tree 或搜索结果直接打开节点
- 使用 Monaco Editor 编辑节点数据
- 保存前支持 JSON / XML 格式化
- 节点数据保存基于 ZooKeeper `version` 做原子更新
- 当外部已更新节点时，明确提示版本冲突
- 手动刷新节点，并在有未保存草稿时阻止静默覆盖

### 元数据与 ACL

- 在 `Meta` 页签中统一显示 `Path / Version / Children / Data size / Mtime`
- 查看和编辑 `world:anyone` ACL 记录
- 把节点摘要信息和工作区操作收敛在同一块区域内

### 桌面体验

- Light / Dark 主题切换
- 英文 / 简体中文界面语言切换
- 全局字号设置
- About 弹窗与应用信息展示
- 基于 `electron-builder` 的 Windows 打包

## 当前范围

ZKube 现在已经可以覆盖核心 ZooKeeper 桌面工作流，但整体范围仍然是有意识收敛过的。

### 已实现

- 基于 Electron 的桌面应用，当前以 Windows 优先交付
- 直连型 ZooKeeper 连接配置管理
- Tree 浏览、过滤、搜索、手动刷新
- 节点创建 / 删除 / 编辑
- 本地节点标记
- 元数据与 ACL 查看/编辑
- 打包链路、单元测试、类型检查、Electron 冒烟测试

### 目前暂不覆盖

- SSH Tunnel
- 更完整的 diff / 历史恢复能力
- 超出当前范围的高级 ACL 编写体验
- 对所有展开路径做 watch 驱动的实时同步
- 面向 macOS 和 Linux 的正式发布与打磨

## 技术栈

- Electron 42
- React 19
- TypeScript
- Vite
- Zustand
- Monaco Editor
- `node-zookeeper-client`
- Vitest
- Playwright

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm
- 当前更推荐在 Windows 环境下开发和打包，以保持和现阶段发布目标一致

### 安装依赖

```bash
npm install
```

### 仅启动前端预览

适合快速看界面改动：

```bash
npm run dev
```

### 启动完整 Electron 开发环境

推荐用于真实功能联调：

```bash
npm run dev:electron
```

## 验证命令

### 类型检查

```bash
npm run typecheck
```

### 单元测试

```bash
npm run test:unit
```

### Electron 冒烟测试

```bash
npm run test:e2e -- tests/e2e/app-smoke.spec.ts
```

## 构建与打包

一键构建 renderer、Electron bundle 和 Windows 安装包：

```bash
npm run build
```

常用分步命令：

```bash
npm run build:renderer
npm run build:electron
npm run package:win
```

构建产物会输出到：

- `dist/`
- `dist-electron/`
- `../ZKube-release/`

## 连接真实 ZooKeeper 集群时的注意事项

ZKube 可以直接连接真实环境。在接入共享环境或生产环境前，建议先确认：

- 目标地址和连接配置是否正确
- 是否理解当前 create / edit / delete 操作的影响范围
- 高风险操作是否已经先在低环境验证
- 导入与导出的连接配置是否按敏感运维数据对待
- 外部节点可能已被其他客户端更新，必要时先手动刷新再继续操作

## 仓库结构

- `electron/`：Electron 主进程、preload bridge、窗口与启动逻辑
- `src/domain/`：会话与应用行为相关的领域逻辑
- `src/infrastructure/`：存储、安全处理和 ZooKeeper 适配层
- `src/renderer/`：React 界面、布局、Tree、Workbench、设置和弹窗
- `src/shared/`：共享 IPC 契约、模型和错误定义
- `tests/domain/`：领域层和 Electron 启动测试
- `tests/renderer/`：前端交互与界面测试
- `tests/e2e/`：Playwright 冒烟测试
- `docs/`：截图和设计/计划类文档

## 文档入口

- 英文文档：[README.md](./README.md)
- 更新日志：[CHANGELOG.md](./CHANGELOG.md)

## 后续路线

后续值得继续推进的方向包括：

- 更完整的 ACL 支持
- 更严格的连接导入校验与保护
- 更丰富的节点比较与恢复能力
- 在 Windows 版本继续稳定后推进 macOS 和 Linux 支持

## 贡献说明

欢迎围绕这些方向继续改进：

- ZooKeeper 工作流的正确性和可靠性
- Windows 打包与发布质量
- Tree / Workbench 交互体验
- 测试覆盖和运行时稳定性

如果你准备提交改动，建议优先保持：

- 改动范围聚焦
- 验证链路明确
- ZooKeeper 写操作足够谨慎

## License

当前仓库采用 MIT License，详见 [LICENSE](./LICENSE)。
