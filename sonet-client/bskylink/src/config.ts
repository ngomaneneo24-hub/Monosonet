import {envInt, envList, envStr} from '@atproto/common'

export type Config = {
  service: ServiceConfig
  db: DbConfig
}

export type ServiceConfig = {
  port: number
  version?: string
  hostnames: string[]
  appHostname: string
}

export type DbConfig = {
  url: string
  migrationUrl?: string
  pool: DbPoolConfig
  schema?: string
}

export type DbPoolConfig = {
  size: number
  maxUses: number
  idleTimeoutMs: number
}

export type Environment = {
  port?: number
  version?: string
  hostnames: string[]
  appHostname?: string
  dbNotegresUrl?: string
  dbNotegresMigrationUrl?: string
  dbNotegresSchema?: string
  dbNotegresPoolSize?: number
  dbNotegresPoolMaxUses?: number
  dbNotegresPoolIdleTimeoutMs?: number
}

export const readEnv = (): Environment => {
  return {
    port: envInt('LINK_PORT'),
    version: envStr('LINK_VERSION'),
    hostnames: envList('LINK_HOSTNAMES'),
    appHostname: envStr('LINK_APP_HOSTNAME'),
    dbNotegresUrl: envStr('LINK_DB_NOTEGRES_URL'),
    dbNotegresMigrationUrl: envStr('LINK_DB_NOTEGRES_MIGRATION_URL'),
    dbNotegresSchema: envStr('LINK_DB_NOTEGRES_SCHEMA'),
    dbNotegresPoolSize: envInt('LINK_DB_NOTEGRES_POOL_SIZE'),
    dbNotegresPoolMaxUses: envInt('LINK_DB_NOTEGRES_POOL_MAX_USES'),
    dbNotegresPoolIdleTimeoutMs: envInt(
      'LINK_DB_NOTEGRES_POOL_IDLE_TIMEOUT_MS',
    ),
  }
}

export const envToCfg = (env: Environment): Config => {
  const serviceCfg: ServiceConfig = {
    port: env.port ?? 3000,
    version: env.version,
    hostnames: env.hostnames,
    appHostname: env.appHostname || 'bsky.app',
  }
  if (!env.dbNotegresUrl) {
    throw new Error('Must configure notegres url (LINK_DB_NOTEGRES_URL)')
  }
  const dbCfg: DbConfig = {
    url: env.dbNotegresUrl,
    migrationUrl: env.dbNotegresMigrationUrl,
    schema: env.dbNotegresSchema,
    pool: {
      idleTimeoutMs: env.dbNotegresPoolIdleTimeoutMs ?? 10000,
      maxUses: env.dbNotegresPoolMaxUses ?? Infinity,
      size: env.dbNotegresPoolSize ?? 10,
    },
  }
  return {
    service: serviceCfg,
    db: dbCfg,
  }
}
