# ZKube

ZKube 是一个面向 Apache ZooKeeper 的桌面工作台工具，当前以 Windows 优先交付为目标，基于 Electron、React 和 TypeScript 构建。

英文文档：[README.md](./README.md)

## 项目简介

ZKube 重点解决的是 ZooKeeper 日常使用里最常见、也最容易在传统桌面工具里变得笨重的几类操作：

- 管理多套连接配置
- 按需浏览较大的节点树
- 把节点打开到独立工作台中处理
- 编辑节点数据并配合格式化工具保存
- 查看和更新选定 ACL 数据
- 打包成适合 Windows 使用的桌面应用

当前版本已经具备核心桌面工作流，但整体仍处于持续完善阶段。

## 当前状态

ZKube 正在积极开发中。

已经实现的能力包括：

- 连接创建、本地保存与 JSON 导入
- 根节点加载、树展开、本地过滤和深度搜索
- 从树或搜索结果打开节点到工作台
- 节点编辑、JSON/XML 格式化与保存流程
- `world:anyone` ACL 的查看与编辑
- 运行时反馈、连接状态处理以及打包冒烟测试

当前有意保持收敛的范围包括：

- 当前主要支持 Windows-first 交付
- ACL 编辑目前只覆盖 `world:anyone` 记录
- SSH 隧道、更严格的导入校验等高级能力尚未完成

## 功能特性

### 连接管理

- 创建并保存连接配置
- 通过 JSON 导入连接配置
- 使用 Electron `safeStorage` 保护敏感信息

### 节点树浏览

- 按需加载根节点
- 懒加载展开子路径
- 对已加载路径做本地过滤
- 基于当前 ZooKeeper 会话执行深度搜索

### 节点工作台

- 从树或搜索结果直接打开节点
- 支持多标签页工作流
- 保存前支持 JSON / XML 格式化
- 在连接切换后隔离旧工作台状态

### 桌面运行时

- 类型化的 Electron preload bridge
- 通过状态栏与提示消息提供运行时反馈
- 基于 `electron-builder` 的 Windows 打包
- 基于 Playwright 的 Electron 冒烟测试

## 技术栈

- Electron 42
- React 19
- TypeScript
- Vite
- Zustand
- Monaco Editor
- Vitest
- Playwright
- `node-zookeeper-client`

## 快速开始

### 环境要求

- 建议使用 Node.js 20+
- 仓库默认使用 npm 作为包管理器

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 启动完整 Electron 开发环境

```bash
npm run dev:electron
```

## 验证命令

单元测试：

```bash
npm run test:unit
```

类型检查：

```bash
npm run typecheck
```

Electron 冒烟测试：

```bash
npm run test:e2e -- tests/e2e/app-smoke.spec.ts
```

## 打包

构建 renderer、Electron bundle 和 Windows 安装包：

```bash
npm run build
```

打包产物会输出到 `release/`。

## 连接真实 ZooKeeper 集群时的注意事项

ZKube 可以连接真实 ZooKeeper 环境。在接入共享环境或生产环境前，建议先确认：

- 目标地址和认证范围是否正确
- 风险操作是否已先在测试环境验证
- 删除、覆盖、修改节点前是否明确影响范围
- 导入的连接配置是否包含敏感运维信息

## 仓库结构

- `electron/`
  Electron 主进程、preload bridge 和 IPC 注册
- `src/domain/`
  连接与 ZooKeeper 会话领域逻辑
- `src/infrastructure/`
  本地持久化、安全存储和 ZooKeeper 适配层
- `src/renderer/`
  React 桌面界面、树面板、工作台、运行时反馈和连接流程
- `src/shared/`
  共享模型、类型化 IPC 契约和通用声明
- `tests/domain/`
  领域层与 IPC 测试
- `tests/renderer/`
  渲染层交互测试
- `tests/e2e/`
  Electron 冒烟测试
- `docs/superpowers/`
  本仓库的设计与实现计划文档

## 项目文档

- 英文文档：[README.md](./README.md)
- 更新日志：[CHANGELOG.md](./CHANGELOG.md)
- 设计说明：[docs/superpowers/specs/2026-05-13-zkube-desktop-design.md](./docs/superpowers/specs/2026-05-13-zkube-desktop-design.md)
- 实现计划：[docs/superpowers/plans/2026-05-13-zkube-desktop-v1.md](./docs/superpowers/plans/2026-05-13-zkube-desktop-v1.md)

## 后续路线

后续值得继续推进的方向包括：

- 更强的连接切换并发控制
- 更严格、更具事务性的 JSON 导入校验
- 更完整的 ACL 编辑能力
- 从当前 Windows-first 继续扩展到更多平台

## 贡献说明

欢迎围绕稳定性、交互体验、打包质量和 ZooKeeper 工作流覆盖继续完善这个项目。

如果你要提交改动，建议优先遵守这些原则：

- 改动尽量聚焦，并配套测试
- Electron 边界优先保持类型清晰
- 涉及 ZooKeeper 写操作时，要特别谨慎验证破坏性路径

## License

当前仓库采用 MIT License。完整许可证文本见 [LICENSE](./LICENSE)。
