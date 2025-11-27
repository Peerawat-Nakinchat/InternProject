import { User, Role } from './dbModels.js';
// import Sequelize from 'sequelize';
// const { Op } = Sequelize;

const findById = async (userId) => {
    try {
        console.log('🔍 Finding user by ID:', userId);

        const user = await User.findByPk(userId, {
            attributes: {
                exclude: ['password_hash', 'reset_token', 'reset_token_expire'],
                // ✅ เพิ่ม include ฟิลด์ที่ต้องการ
                include: [
                    'sex',
                    'user_address_1',
                    'user_address_2',
                    'user_address_3',
                    'profile_image_url',
                    'auth_provider',
                    'provider_id'
                ]
            },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['role_id', 'role_name']
            }]
        });

        if (user) {
            console.log('✅ User found:', user.user_id);
        } else {
            console.log('⚠️ User not found');
        }

        return user;
    } catch (error) {
        console.error('❌ Error finding user by ID:', error);
        throw error;
    }
};

const findByEmail = async (emailInput) => {
    try {
        console.log('🔍 Finding user by email:', emailInput);

        // รองรับทั้ง string และ object
        const email =
            typeof emailInput === "string"
                ? emailInput
                : emailInput?.where?.email;

        if (!email || typeof email !== "string") {
            throw new Error("Invalid email format received");
        }

        const user = await User.findOne({
            where: { email: email.toLowerCase().trim() },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['role_id', 'role_name']
            }]
        });

        return user;

    } catch (error) {
        console.error('❌ Error finding user by email:', error);
        throw error;
    }
};


const createUser = async ({
    email,
    passwordHash,
    name,
    surname,
    sex,
    user_address_1,
    user_address_2,
    user_address_3
}) => {
    try {
        // Sequelize validations จะทำงานอัตโนมัติ
        const user = await User.create({
            email: email.toLowerCase().trim(),
            password_hash: passwordHash,
            name: name.trim(),
            surname: surname.trim(),
            sex: sex || 'O',
            user_address_1: user_address_1 || '',
            user_address_2: user_address_2 || '',
            user_address_3: user_address_3 || '',
            role_id: 3, // Default USER role
            is_active: true
        });

        // Return without sensitive data
        const userJson = user.toJSON();
        delete userJson.password_hash;
        delete userJson.reset_token;
        delete userJson.reset_token_expire;

        return userJson;
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const customError = new Error('Email already exists');
            customError.code = 'USER_EXISTS';
            throw customError;
        }
        throw error;
    }
};

const setResetToken = async (userId, token, expire) => {
    try {
        console.log('💾 Setting reset token:', {
            userId,
            expire: expire.toISOString()
        });

        const [rowsUpdated, [updatedUser]] = await User.update(
            {
                reset_token: token,
                reset_token_expire: expire
            },
            {
                where: { user_id: userId },
                returning: true
            }
        );

        if (rowsUpdated === 0) {
            throw new Error(`User not found: ${userId}`);
        }

        console.log('✅ Reset token saved successfully');
        return updatedUser;
    } catch (error) {
        console.error('❌ Error setting reset token:', error);
        throw error;
    }
};

const findByResetToken = async (token) => {
    try {
        console.log('🔍 Finding user by reset token:', token);

        // 1. ค้นหา User ด้วย Token อย่างเดียวก่อน (ไม่ต้องใช้ Op)
        const user = await User.findOne({
            where: {
                reset_token: token
            },
            attributes: ['user_id', 'email', 'reset_token', 'reset_token_expire']
        });

        if (!user) {
            console.log('⚠️ Token not found in DB');
            return null;
        }
        const now = new Date();
        const expireDate = new Date(user.reset_token_expire);

        if (now > expireDate) {
            console.log('⏳ Token expired at:', expireDate);
            return null; // ถือว่าหาไม่เจอเพราะหมดอายุ
        }

        console.log('✅ Valid token found for user:', user.user_id);
        return user;

    } catch (error) {
        console.error('❌ Error finding user by reset token:', error);
        throw error;
    }
};

const updatePassword = async (userId, hash) => {
    try {
        console.log('🔑 Updating password for user:', userId);

        const [rowsUpdated, [updatedUser]] = await User.update(
            {
                password_hash: hash,
                reset_token: null,
                reset_token_expire: null
            },
            {
                where: { user_id: userId },
                returning: true
            }
        );

        if (rowsUpdated === 0) {
            throw new Error('User not found for password update');
        }

        console.log('✅ Password updated successfully');
        return updatedUser;
    } catch (error) {
        console.error('❌ Error updating password:', error);
        throw error;
    }
};

const updateEmail = async (userId, newEmail) => {
    try {
        console.log('📧 Updating email for user:', userId, 'to:', newEmail);

        const [rowsUpdated, [updatedUser]] = await User.update(
            {
                email: newEmail.toLowerCase().trim()
            },
            {
                where: { user_id: userId },
                returning: true
            }
        );

        if (rowsUpdated === 0) {
            throw new Error('User not found for email update');
        }

        console.log('✅ Email updated successfully');

        // Return without sensitive data
        const userJson = updatedUser.toJSON();
        delete userJson.password_hash;
        delete userJson.reset_token;
        delete userJson.reset_token_expire;
        
        return userJson;
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new Error('Email already in use');
        }
        console.error('❌ Error updating email:', error);
        throw error;
    }
};

const updateProfile = async (userId, data) => {
    try {
        console.log('✏️ Updating profile for user:', userId);

        // Whitelist allowed fields
        const allowedFields = [
            'name',
            'surname',
            'full_name',
            'sex',
            'user_address_1',
            'user_address_2',
            'user_address_3',
            'profile_image_url'
        ];

        // Filter data to only include allowed fields
        const updateData = {};
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                // ✅ เพิ่ม: ถ้าเป็น profile_image_url และเป็นค่าว่าง ให้ใส่ null แทน
                if (field === 'profile_image_url' && data[field] === '') {
                    updateData[field] = null;
                } else {
                    updateData[field] = data[field];
                }
            }
        }

        const [rowsUpdated, [updatedUser]] = await User.update(
            updateData,
            {
                where: { user_id: userId },
                returning: true,
                validate: true
            }
        );

        if (rowsUpdated === 0) {
            throw new Error('User not found for profile update');
        }

        console.log('✅ Profile updated successfully');

        // Return without sensitive data
        const userJson = updatedUser.toJSON();
        delete userJson.password_hash;
        delete userJson.reset_token;
        delete userJson.reset_token_expire;

        return userJson;
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        throw error;
    }
};

// Soft delete (deactivate) user
const deactivateUser = async (userId) => {
    try {
        const [rowsUpdated] = await User.update(
            { is_active: false },
            { where: { user_id: userId } }
        );

        return rowsUpdated > 0;
    } catch (error) {
        console.error('❌ Error deactivating user:', error);
        throw error;
    }
};

// Reactivate user
const activateUser = async (userId) => {
    try {
        const [rowsUpdated] = await User.update(
            { is_active: true },
            { where: { user_id: userId } }
        );

        return rowsUpdated > 0;
    } catch (error) {
        console.error('❌ Error activating user:', error);
        throw error;
    }
};

// Search users with pagination and filters
const searchUsers = async (filters = {}, options = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;

        const where = {};

        if (filters.email) {
            where.email = { [Op.iLike]: `%${filters.email}%` };
        }

        if (filters.name) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${filters.name}%` } },
                { surname: { [Op.iLike]: `%${filters.name}%` } },
                { full_name: { [Op.iLike]: `%${filters.name}%` } }
            ];
        }

        if (filters.role_id) {
            where.role_id = filters.role_id;
        }

        if (filters.is_active !== undefined) {
            where.is_active = filters.is_active;
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expire'] },
            include: [{
                model: Role,
                as: 'role',
                attributes: ['role_id', 'role_name']
            }],
            limit,
            offset: (page - 1) * limit,
            order: [[sortBy, sortOrder]]
        });

        return {
            users: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    } catch (error) {
        console.error('❌ Error searching users:', error);
        throw error;
    }
};

export const UserModel = {
    findByEmail,
    findById,
    createUser,
    setResetToken,
    findByResetToken,
    updatePassword,
    updateEmail,
    updateProfile,
    deactivateUser,
    activateUser,
    searchUsers
};