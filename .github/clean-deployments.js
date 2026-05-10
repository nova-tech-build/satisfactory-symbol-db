#!/usr/bin/env node

import fs from 'node:fs'
import { createInterface } from 'node:readline/promises'

const token = fs.readFileSync('token.txt', 'utf8').trim()
const api = 'https://api.github.com/repos/nova-tech-build/satisfactory-symbol-db'
const rl = createInterface({ input: process.stdin, output: process.stdout })

const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
}

const gh = (u, o) => fetch(api + u, { headers, ...o }).then(r => r.json())

for (const d of await gh('/deployments?per_page=100')) {
    const state = (await gh(`/deployments/${d.id}/statuses?per_page=1`))[0]?.state ?? 'unknown'

    if (state === 'success') {
        continue
    }

    if ((await rl.question(`${d.id} ${state} delete? (y/N) `)).toLowerCase() !== 'y') {
        continue
    }

    await gh(`/deployments/${d.id}/statuses`, {
        method: 'POST',
        body: JSON.stringify({ state: 'inactive' }),
    })

    await fetch(`${api}/deployments/${d.id}`, {
        method: 'DELETE',
        headers,
    })

    console.log(`${d.id} deleted`)
}

rl.close()
