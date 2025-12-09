// src/utils/emailGenerator.js

/**
 * Generate Invitation HTML
 */
const generateInvitationHtml = (data) => {
  const { companyName, inviterImageUrl, inviteLink, email, year, role_name } = data;

  return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>คำเชิญเข้าร่วมบริษัท ${companyName}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; }
        .body-bg { background-color: #f4f7fa; }
        .card-bg { background-color: #ffffff; }
        .text-primary { color: #1a202c; }
        .text-secondary { color: #4a5568; }
        a { color: #667eea; text-decoration: none; }
        
        @media (prefers-color-scheme: dark) {
            .body-bg { background-color: #1a202c !important; }
            .card-bg { background-color: #2d3748 !important; }
            .text-primary { color: #e2e8f0 !important; }
            .text-secondary { color: #a0aec0 !important; }
            .box-bg { background-color: #4a5568 !important; }
        }
    </style>
</head>
<body class="body-bg">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0;"></td>
        </tr>
        <tr>
            <td align="center">
                <table role="presentation" class="card-bg" style="width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 30px; background-color: #667eea; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                                คำเชิญเข้าร่วมบริษัท { ${companyName} }
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px 20px 30px;">
                            <table role="presentation" style="width: 100%;">
                                <tr>
                                    <td align="center">
                                        <p class="text-primary" style="margin: 0; font-size: 24px; font-weight: 800; color: #1a202c;">
                                            คุณได้รับคำเชิญจาก
                                        </p>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td align="center" style="padding: 10px 0;">
                                        <div class="box-bg" style="background-color: #c4e2ffff; padding: 15px; border-radius: 6px; font-weight: bold; color: #2d3748; font-size: 18px; display: inline-block;">
                                           บริษัท ${companyName} <br> ในตำแหน่ง { ${role_name} }
                                        </div>
                                    </td>
                                </tr>

                                ${
                                    inviterImageUrl
                                    ? `
                                        <tr>
                                            <td align="center" style="padding-top: 15px;">
                                                <img src="${inviterImageUrl}" alt="รูปผู้เชิญ" style="width: 120px; height: 120px; border-radius: 40%; border: 2px solid #e6f1ffff; object-fit: cover;">
                                            </td>
                                        </tr>
                                    `
                                    : ""
                                }
                                
                                <tr>
                                    <td align="center" style="padding-top: 20px;">
                                        <p class="text-secondary" style="margin: 0; font-size: 16px; line-height: 24px; color: #4a5568;">
                                            ยินดีต้อนรับ! เรามีความยินดีที่จะเรียนเชิญคุณเข้าร่วมเป็นส่วนหนึ่งของทีม<br>
                                            กรุณากดตอบรับคำเชิญเพื่อเริ่มต้นใช้งาน
                                        </p>
                                    </td>
                                </tr>

                                
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="${inviteLink}" style="display: inline-block; background-color: #3e5ce5ff; color: #ffffff; padding: 12px 30px; border-radius: 4px; font-weight: bold; font-size: 16px; text-decoration: none;">
                                            👉 ตอบรับคำเชิญ 👈
                                        </a>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 10px 0; border-top: 1px solid #e2e8f0;"></td>
                                </tr>
                                
                                <tr>
                                    <td align="center">
                                        <p class="text-secondary" style="margin: 0 0 10px; font-size: 14px; color: #718096;">
                                            หรือคัดลอกลิงก์ด้านล่าง:
                                        </p>
                                        <div class="box-bg" style="background-color: #f7fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; word-break: break-all; text-align: center; font-size: 13px;">
                                            <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
                                        </div>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td align="center" style="padding-top: 20px;">
                                        <div style="background-color: #fffbeb; color: #744210; padding: 12px; border-radius: 6px; font-size: 13px; text-align: center; border: 1px solid #fcd34d;">
                                            ⏳ ลิงก์นี้จะหมดอายุใน <strong>2 วัน</strong>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; background-color: #f7fafc; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                                © ${year} ${companyName}. All rights reserved.
                            </p>
                            <p style="margin: 5px 0 0; font-size: 12px; color: #a0aec0;">
                                ส่งถึง: ${email}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 0;"></td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

const templates = {
  invitation: generateInvitationHtml,
};

/**
 * Render Email Template (No MJML Dependency)
 * @param {string} templateName
 * @param {object} data
 */
export const renderEmail = async (templateName, data) => {
  const generator = templates[templateName];
  if (!generator) {
    throw new Error(`Template "${templateName}" not found`);
  }
  return generator(data);
};
