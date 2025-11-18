import { generateAccessToken } from './AuthController.js';

export const createNewAccessToken = async (req, res) => {
    try {
        const userId = req.refreshUserId;

        const newAccessToken = generateAccessToken(userId);

        res.json({
            success: true,
            accessToken: newAccessToken
        });
    } catch (error) {
        console.error("Refresh token creation error:", error);
        res.status(500).json({
            success: false,
            error: "เกิดข้อผิดพลาดในการออก access token ใหม่"
        });
    }
};
