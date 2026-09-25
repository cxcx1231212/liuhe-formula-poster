import { DurableObject } from 'cloudflare:workers';

export class EntrySession extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS credentials (digest TEXT PRIMARY KEY, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK(id=1), activated INTEGER NOT NULL, expires_at INTEGER NOT NULL); INSERT OR IGNORE INTO session(id,activated,expires_at) VALUES (1,0,0)');
    });
  }

  async issue(digest, expiresAt) {
    this.ctx.storage.sql.exec('INSERT INTO credentials(digest,expires_at) VALUES (?,?)', digest, expiresAt);
    const sessionExpiresAt = this.ctx.storage.sql.exec('SELECT expires_at FROM session WHERE id=1').one().expires_at;
    await this.ctx.storage.setAlarm(Math.max(expiresAt, sessionExpiresAt));
  }

  async consume(digest, now, sessionExpiresAt) {
    const consumed = this.ctx.storage.transactionSync(() => {
      const match = this.ctx.storage.sql.exec('DELETE FROM credentials WHERE digest=? AND expires_at>? RETURNING digest', digest, now).toArray()[0];
      if (!match) return false;
      this.ctx.storage.sql.exec('UPDATE session SET activated=1,expires_at=? WHERE id=1', sessionExpiresAt);
      return true;
    });
    if (consumed) await this.ctx.storage.setAlarm(sessionExpiresAt);
    return consumed;
  }

  async active(now) {
    const row = this.ctx.storage.sql.exec('SELECT activated,expires_at FROM session WHERE id=1').one();
    return row?.activated === 1 && row.expires_at > now;
  }

  async activate(sessionExpiresAt) {
    this.ctx.storage.sql.exec('UPDATE session SET activated=1,expires_at=? WHERE id=1', sessionExpiresAt);
    await this.ctx.storage.setAlarm(sessionExpiresAt);
  }

  async alarm() {
    this.ctx.storage.sql.exec('DELETE FROM credentials; UPDATE session SET activated=0,expires_at=0 WHERE id=1');
  }
}

export class EntryTicket extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS tickets (digest TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)');
    });
  }

  async consume(digest, expiresAt) {
    const first = this.ctx.storage.transactionSync(() => {
      if (this.ctx.storage.sql.exec('SELECT digest FROM tickets WHERE digest=?', digest).toArray().length) return false;
      this.ctx.storage.sql.exec('INSERT INTO tickets(digest,expires_at) VALUES (?,?)', digest, expiresAt);
      return true;
    });
    if (first) await this.ctx.storage.setAlarm(expiresAt);
    return first;
  }

  async alarm() {
    this.ctx.storage.sql.exec('DELETE FROM tickets');
  }
}
