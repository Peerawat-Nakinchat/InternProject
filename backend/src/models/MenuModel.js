import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/dbConnection.js';

// 1. Definition
export const Menu = sequelize.define('sys_iso_menus', {
    menu_ref_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    module_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    h_menu_id: {
        type: DataTypes.STRING(5),
        allowNull: false,
    },
    menu_id: { 
        type: DataTypes.STRING(10), 
        allowNull: false,
        unique: true
    },
    parent_menu_id: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    menu_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    web_route_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    web_icon_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'sys_iso_menus', // ชื่อตารางใน DB
    freezeTableName: true,
    timestamps: true,
    createdAt: 'create_date',
    updatedAt: 'update_date',
    schema: 'public',
});

// 2. Repository Functions (Wrapper)

const findByPermissionCode = async (permissionCode) => {
    return await MenuModel.findOne({
        where: { menu_id: permissionCode, is_active: true },
        attributes: ['menu_ref_id', 'menu_id']
    });
};

const getAllMasterModules = async () => {
    return await MenuModel.findAll({
        where: { menu_id: { [Op.like]: 'MOD_%_ACCESS' } }, // Logic หา Master Module
        attributes: ['menu_ref_id', 'menu_id', 'menu_label']
    });
};

export default { 
    Menu, 
    findByPermissionCode, 
    getAllMasterModules 
};