# ZKube

ZKube 是一个面向 Windows 优先交付的 ZooKeeper 桌面可视化工具，基于 Electron、React 和 TypeScript 构建。

## 当前能力

- 连接管理：支持新增、保存、导入连接配置
- 节点树浏览：支持根节点加载、按需展开、本地过滤、深度搜索
- 节点工作台：支持从树或搜索结果打开节点
- 节点编辑：支持文本编辑、JSON/XML 格式化、保存
- ACL 面板：支持 `world:anyone` 记录的查看与编辑
- 运行时反馈：状态栏、提示消息、连接切换后的工作台隔离
- Windows 打包：可生成安装包并包含基础 Electron 冒烟测试

## 技术栈

- Electron 42
- React 19
- TypeScript
- Vite
- Zustand
- Monaco Editor
- Playwright
- Vitest
- `node-zookeeper-client`

## 本地开发

```bash
npm install
npm run dev
```

## 验证命令

```bash
npm run test:unit
npm run typecheck
npm run test:e2e -- tests/e2e/app-smoke.spec.ts
```

## 打包

```bash
npm run build
```

打包成功后，Windows 安装产物会输出到 `release/`。

## 目录说明

- `electron/`
  Electron 主进程和 preload
- `src/domain/`
  连接与 ZooKeeper 会话领域逻辑
- `src/infrastructure/`
  本地存储、安全存储、ZooKeeper 适配
- `src/renderer/`
  React 工作台界面
- `tests/domain/`
  领域层测试
- `tests/renderer/`
  渲染层测试
- `tests/e2e/`
  Electron 冒烟测试

## 注意事项

- 当前交付目标是 Windows-first。
- 连接真实 ZooKeeper 集群时，请先确认目标环境和权限范围。
- 对生产集群操作前，建议先在测试环境完成验证。
