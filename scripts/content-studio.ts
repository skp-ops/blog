import { spawn } from 'node:child_process'
import process from 'node:process'

const [nodeMajor = 0, nodeMinor = 0, nodePatch = 0] = process.versions.node
  .split('.')
  .map(Number)
const nodeTooOld = nodeMajor < 18
  || (nodeMajor === 18 && (nodeMinor < 20 || (nodeMinor === 20 && nodePatch < 8)))

if (nodeTooOld) {
  console.error(`Content Studio 需要 Node.js 18.20.8 或更高版本，当前为 ${process.versions.node}。`)
  process.exit(1)
}

const astroCommand = process.platform === 'win32' ? 'astro.cmd' : 'astro'
const child = spawn(
  astroCommand,
  ['dev', '--host', '127.0.0.1', '--port', '4322', '--open', '/admin/'],
  {
    env: {
      ...process.env,
      CONTENT_STUDIO: '1',
    },
    stdio: 'inherit',
  },
)

function shutdown(signal: NodeJS.Signals) {
  if (!child.killed)
    child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

child.on('exit', (code, signal) => {
  if (signal)
    process.kill(process.pid, signal)
  else
    process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error(`无法启动 Content Studio：${error.message}`)
  process.exit(1)
})
