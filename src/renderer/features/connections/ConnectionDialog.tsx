import { useConnectionsStore } from './useConnectionsStore'

export function ConnectionDialog() {
  const { dialogOpen, closeDialog } = useConnectionsStore()

  if (!dialogOpen) {
    return null
  }

  return (
    <div className="dialog-backdrop">
      <div aria-label="新建连接" aria-modal="true" className="dialog" role="dialog">
        <h3>新建连接</h3>
        <p>这一版先搭起连接工作区骨架，表单提交会在后续任务中接入保存流程。</p>
        <label className="dialog__field">
          <span>连接名称</span>
          <input name="name" placeholder="例如：本地开发 ZooKeeper" type="text" />
        </label>
        <label className="dialog__field">
          <span>地址</span>
          <input name="hosts" placeholder="127.0.0.1:2181" type="text" />
        </label>
        <div className="dialog__actions">
          <button type="button" onClick={closeDialog}>
            关闭
          </button>
          <button className="button-primary" type="button">
            稍后实现保存
          </button>
        </div>
      </div>
    </div>
  )
}
