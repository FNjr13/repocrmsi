import path from 'node:path'
import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

const dbUrl = process.env.DATABASE_URL as string

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: dbUrl,
  },
  migrate: {
    adapter: () => new PrismaPg({ connectionString: dbUrl }),
  },
})
