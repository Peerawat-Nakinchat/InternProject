export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRoleId = req.user.role_id;

        if (!userRoleId) {
            return res.status(403).json({
                success: false,
                message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'
            });
        }

        if (allowedRoles.includes(userRoleId)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'ไม่ได้รับอนุญาต'
        });
    };
};
