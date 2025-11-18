import { TokenModel } from "../models/TokenModel.js";

const logout = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token ไม่ถูกต้อง' });
    }

    await TokenModel.deleteRefreshToken(refreshToken);

    res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
};

export { logout };
