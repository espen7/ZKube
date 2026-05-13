export type NodeStat = {
  version: number
  numChildren: number
}

export type AclEntry = {
  scheme: string
  id: string
  permissions: Array<'read' | 'write' | 'create' | 'delete' | 'admin'>
}

export type NodeSnapshot = {
  path: string
  data: Buffer
  stat: NodeStat
  acl: AclEntry[]
}

export type RuntimeEvent =
  | { type: 'nodeDataChanged'; path: string }
  | { type: 'nodeChildrenChanged'; path: string }
  | { type: 'nodeDeleted'; path: string }
  | {
      type: 'connectionStateChanged'
      state: 'connected' | 'disconnected' | 'reconnecting'
    }
