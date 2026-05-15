import type {
  AclEntry,
  NodeSnapshot,
  TreeNodeRow,
  ZooKeeperOverview,
} from '../../shared/models/node'

export interface ZooKeeperClient {
  connect(): Promise<void>
  close(): Promise<void>
  watchConnectionLoss(cb: () => void): () => void
  getOverview(): Promise<ZooKeeperOverview>
  getChildren(path: string): Promise<TreeNodeRow[]>
  getNode(path: string): Promise<NodeSnapshot>
  search(query: string): Promise<string[]>
  createNode(path: string, data: Buffer): Promise<void>
  updateNode(path: string, data: Buffer, version?: number): Promise<void>
  deleteNode(
    path: string,
    options?: { version?: number; recursive?: boolean },
  ): Promise<void>
  setAcl(path: string, acl: AclEntry[]): Promise<void>
}
