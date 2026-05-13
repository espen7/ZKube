import type { AclEntry, NodeSnapshot } from '../../shared/models/node'

export interface ZooKeeperClient {
  connect(): Promise<void>
  close(): Promise<void>
  getChildren(path: string): Promise<string[]>
  getNode(path: string): Promise<NodeSnapshot>
  search(query: string): Promise<string[]>
  createNode(path: string, data: Buffer): Promise<void>
  updateNode(path: string, data: Buffer, version?: number): Promise<void>
  deleteNode(path: string, version?: number): Promise<void>
  setAcl(path: string, acl: AclEntry[]): Promise<void>
}
