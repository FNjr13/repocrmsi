import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: dbUrl,
  },
  migrate: {
    adapter: () => new PrismaBetterSqlite3({ url: dbUrl }),
  },
})
