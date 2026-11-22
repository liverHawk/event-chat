import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const args = process.argv.slice(2)
const isRemote = args.includes('--remote')
const positional = args.filter((a) => a !== '--remote')
const [subcommand, id, name, roleIdArg, inviteArg] = positional
const targetFlag = isRemote ? '--remote' : '--local'

const runSql = (sql: string) => {
  execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'event-chat-db', targetFlag, '--command', sql],
    { stdio: 'inherit' },
  )
}

const esc = (v: string) => v.replaceAll("'", "''")

if (subcommand === 'list') {
  runSql(
    'SELECT id, name, is_global, invite_code, discord_role_id FROM rooms ORDER BY is_global DESC, id ASC;',
  )
} else if (subcommand === 'add') {
  if (!id || !name || !/^[a-zA-Z0-9_-]+$/.test(id) || id === 'global') {
    console.error(
      '使い方: pnpm room:add <ルームID(英数字)> <部屋名> [DiscordロールID] [招待コード] [--remote]',
    )
    process.exit(1)
  }
  const inviteCode = inviteArg || `inv-${randomUUID().slice(0, 8)}`
  const roleSql = roleIdArg ? `'${esc(roleIdArg)}'` : 'NULL'
  const sql = `INSERT INTO rooms (id, name, is_global, invite_code, discord_role_id)
VALUES ('${esc(id)}', '${esc(name)}', 0, '${esc(inviteCode)}', ${roleSql})
ON CONFLICT(id) DO UPDATE SET name = excluded.name, invite_code = excluded.invite_code, discord_role_id = excluded.discord_role_id;`
  runSql(sql)
  console.log(`\n✅ ルームを保存しました (${targetFlag})`)
  console.log(`   ルームID      : ${id}`)
  console.log(`   部屋名        : ${name}`)
  console.log(`   招待URL       : /join/${inviteCode}`)
  console.log(`   Discordロール : ${roleIdArg ?? '(なし)'}`)
} else if (subcommand === 'delete') {
  if (!id || id === 'global') {
    console.error('使い方: pnpm room:delete <ルームID> [--remote]')
    process.exit(1)
  }
  runSql(`DELETE FROM rooms WHERE id = '${esc(id)}' AND is_global = 0;`)
  console.log(`✅ ルーム '${id}' を削除しました (${targetFlag})`)
} else {
  console.error(
    'コマンド: pnpm room:list | pnpm room:add <id> <name> [role_id] | pnpm room:delete <id>',
  )
  process.exit(1)
}
