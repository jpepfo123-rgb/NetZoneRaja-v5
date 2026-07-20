/**
 * MySQL Database Connection
 *
 * Set the DATABASE_URL environment variable to connect to a real MySQL database:
 *   DATABASE_URL=mysql://user:password@host:3306/netzone_crm
 *
 * When DATABASE_URL is not set, the API uses the in-memory store (store.ts).
 * This lets you develop and test without a database.
 *
 * MySQL Schema (run these CREATE TABLE statements once on your MySQL server):
 *
 * CREATE TABLE users (
 *   id VARCHAR(36) PRIMARY KEY,
 *   name VARCHAR(255) NOT NULL,
 *   username VARCHAR(100) UNIQUE NOT NULL,
 *   password_hash VARCHAR(255) NOT NULL,
 *   role ENUM('admin','agent') DEFAULT 'agent',
 *   is_active TINYINT(1) DEFAULT 1,
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE TABLE customers (
 *   id VARCHAR(36) PRIMARY KEY,
 *   name VARCHAR(255) NOT NULL,
 *   mobile VARCHAR(20) NOT NULL,
 *   email VARCHAR(255),
 *   address TEXT,
 *   category ENUM('New Lead','Interested','Follow-up','Customer','Payment Pending','Closed') DEFAULT 'New Lead',
 *   priority ENUM('High','Medium','Low') DEFAULT 'Medium',
 *   notes TEXT,
 *   agent_id VARCHAR(36),
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *   INDEX idx_agent (agent_id),
 *   INDEX idx_category (category)
 * );
 *
 * CREATE TABLE call_records (
 *   id VARCHAR(36) PRIMARY KEY,
 *   customer_id VARCHAR(36) NOT NULL,
 *   customer_name VARCHAR(255),
 *   customer_mobile VARCHAR(20),
 *   type ENUM('Incoming','Outgoing','Missed') NOT NULL,
 *   duration VARCHAR(20) DEFAULT '0:00',
 *   duration_seconds INT DEFAULT 0,
 *   agent_name VARCHAR(255),
 *   agent_id VARCHAR(36),
 *   remarks TEXT,
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *   INDEX idx_customer (customer_id),
 *   INDEX idx_type (type),
 *   INDEX idx_created (created_at)
 * );
 *
 * CREATE TABLE remarks (
 *   id VARCHAR(36) PRIMARY KEY,
 *   customer_id VARCHAR(36) NOT NULL,
 *   text TEXT NOT NULL,
 *   agent_name VARCHAR(255),
 *   is_call_note TINYINT(1) DEFAULT 0,
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *   INDEX idx_customer (customer_id)
 * );
 *
 * CREATE TABLE reminders (
 *   id VARCHAR(36) PRIMARY KEY,
 *   customer_id VARCHAR(36) NOT NULL,
 *   customer_name VARCHAR(255),
 *   customer_mobile VARCHAR(20),
 *   date_time DATETIME NOT NULL,
 *   notes TEXT,
 *   status ENUM('pending','completed','overdue') DEFAULT 'pending',
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *   INDEX idx_customer (customer_id),
 *   INDEX idx_status (status),
 *   INDEX idx_date (date_time)
 * );
 */

import { logger } from './logger';

export interface DbPool {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<T[]>;
  execute(sql: string, values?: unknown[]): Promise<{ insertId: number; affectedRows: number }>;
}

let _pool: DbPool | null = null;

/**
 * Returns the MySQL pool if DATABASE_URL is set, otherwise null.
 * When null, routes fall back to the in-memory store.
 */
export async function getDb(): Promise<DbPool | null> {
  if (_pool) return _pool;

  const url = process.env['DATABASE_URL'];
  if (!url) {
    logger.info('DATABASE_URL not set — using in-memory store');
    return null;
  }

  try {
    // Dynamically import mysql2 so the server starts without it when not needed
    const mysql = await import('mysql2/promise');
    const pool = mysql.createPool(url);
    // Test the connection
    await pool.query('SELECT 1');
    logger.info('MySQL connected successfully');
    _pool = pool as unknown as DbPool;
    return _pool;
  } catch (err) {
    logger.warn({ err }, 'MySQL connection failed — falling back to in-memory store');
    return null;
  }
}
