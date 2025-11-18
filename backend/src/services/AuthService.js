import * as UserModel from '../models/UserModel.js';
import * as TokenModel from '../models/TokenModel.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';

/**
 * Registers a new user.
 */
const register = async (userData) => {
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
        throw new Error('User with this email already exists.');
    }
    const passwordHash = await hashPassword(userData.password);
    const newUser = await UserModel.createUser({
        ...userData,
        passwordHash
    });
    return newUser;
};

/**
 * Logs in a user.
 */
const login = async (email, password) => {
    const user = await UserModel.findByEmail(email);
    if (!user || !(await comparePassword(password, user.password_hash))) {
        throw new Error('Invalid email or password.');
    }

    const payload = { 
        user_id: user.user_id, 
        email: user.email, 
        role_id: user.role_id 
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ user_id: user.user_id, role_id: user.role_id });
    
    await TokenModel.saveRefreshToken(user.user_id, refreshToken);

    const safeUser = {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
    };

    return { accessToken, refreshToken, user: safeUser };
};

const logout = async (refreshToken) => {
    await TokenModel.deleteRefreshToken(refreshToken);
};

const logoutAll = async (userId) => {
    await TokenModel.deleteAllTokensForUser(userId);
};


export {
    register,
    login,
    logout,
};