import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { NodeMarkRepository } from '../../src/infrastructure/storage/node-mark-repository'

describe('NodeMarkRepository', () => {
  it('persists marks per connection and clears subtrees recursively', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zkube-node-marks-'))
    const filePath = path.join(tempDir, 'node-marks.json')
    const repository = new NodeMarkRepository(filePath)

    await repository.set('cluster-a', '/services', 'red')
    await repository.set('cluster-a', '/services/api', 'green')
    await repository.set('cluster-b', '/services', 'yellow')

    expect(await repository.list('cluster-a')).toEqual({
      '/services': 'red',
      '/services/api': 'green',
    })

    await repository.clear('cluster-a', '/services', true)

    expect(await repository.list('cluster-a')).toEqual({})
    expect(await repository.list('cluster-b')).toEqual({
      '/services': 'yellow',
    })
  })
})
