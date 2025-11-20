import { query as dbQuery } from '../config/db.js';
import crypto from 'crypto';

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const saveRefreshToken = async (userId, refreshToken) => {
  const hashed = hashToken(refreshToken);

  const sql = `
      INSERT INTO sys_refresh_tokens (user_id, refresh_token_hash)
      VALUES ($1, $2)
      RETURNING token_id;
  `;

  const result = await dbQuery(sql, [userId, hashed]);
  return result.rows[0];
};

const findRefreshToken = async (refreshToken) => {
  const hashed = hashToken(refreshToken);

  const sql = `
      SELECT *
      FROM sys_refresh_tokens
      WHERE refresh_token_hash = $1
      LIMIT 1;
  `;
  const result = await dbQuery(sql, [hashed]);
  return result.rows[0] || null;
};

const deleteRefreshToken = async (refreshToken) => {
  const hashed = hashToken(refreshToken);

  const sql = `
      DELETE FROM sys_refresh_tokens
      WHERE refresh_token_hash = $1
      RETURNING token_id;
  `;
  const result = await dbQuery(sql, [hashed]);
  return result.rows[0] || null;
};

const deleteAllTokensForUser = async (userId) => {
  const sql = `
      DELETE FROM sys_refresh_tokens
      WHERE user_id = $1
      RETURNING token_id;
  `;
  const result = await dbQuery(sql, [userId]);
  return result.rowCount;
};

export const TokenModel = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllTokensForUser
};
