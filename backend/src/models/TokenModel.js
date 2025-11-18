import { query as dbQuery } from '../config/db.js';

const saveRefreshToken = async (userId, refreshToken) => {
    const sql = `
        INSERT INTO sys_refresh_tokens (user_id, refresh_token)
        VALUES ($1, $2)
        RETURNING token_id;
    `;
    const result = await dbQuery(sql, [userId, refreshToken]);
    return result.rows[0];
};

const findRefreshToken = async (refreshToken) => {
    const sql = `
        SELECT * FROM sys_refresh_tokens
        WHERE refresh_token = $1
        LIMIT 1;
    `;
    const result = await dbQuery(sql, [refreshToken]);
    return result.rows[0] || null;
};

const deleteRefreshToken = async (refreshToken) => {
    const sql = `
        DELETE FROM sys_refresh_tokens
        WHERE refresh_token = $1;
    `;
    await dbQuery(sql, [refreshToken]);
};

const deleteAllTokensForUser = async (userId) => {
    const sql = `
        DELETE FROM sys_refresh_tokens
        WHERE user_id = $1;
    `;
    await dbQuery(sql, [userId]);
};

export const TokenModel = {
    saveRefreshToken,
    findRefreshToken,
    deleteRefreshToken,
    deleteAllTokensForUser
};
