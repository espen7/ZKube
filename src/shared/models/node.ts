export type NodeStat = {
  version: number
  numChildren: number
  mtime: number | null
  dataLength: number | null
}

export type TreeNodeRow = {
  path: string
  name: string
  hasChildren: boolean
  dataLength: number | null
  mtime: number | null
}

export type ZooKeeperServerState =
  | 'leader'
  | 'follower'
  | 'standalone'
  | 'observer'
  | 'unknown'

export type ZooKeeperOverviewSourceCommand =
  | 'mntr'
  | 'srvr'
  | 'stat'
  | null

export type ZooKeeperOverview = {
  sourceHost: string | null
  sourceCommand: ZooKeeperOverviewSourceCommand
  serverState: ZooKeeperServerState
  avgLatency: number | null
  packetsReceived: number | null
  packetsSent: number | null
  numAliveConnections: number | null
  znodeCount: number | null
  watchCount: number | null
  approximateDataSize: number | null
  collectedAt: number | null
  available: boolean
  reason?: string | null
}

export type NodeMarkColor = 'red' | 'orange' | 'yellow' | 'green'

export type NodeMarkRecord = {
  connectionId: string
  path: string
  color: NodeMarkColor
}

export type AclEntry = {
  scheme: string
  id: string
  permissions: Array<'read' | 'write' | 'create' | 'delete' | 'admin'>
}

export type NodeSnapshot = {
  path: string
  data: Uint8Array
  stat: NodeStat
  acl: AclEntry[]
}

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'

export type RuntimeEvent =
  | { type: 'nodeDataChanged'; path: string }
  | { type: 'nodeChildrenChanged'; path: string }
  | { type: 'nodeDeleted'; path: string }
  | {
      type: 'connectionStateChanged'
      state: ConnectionState
    }
