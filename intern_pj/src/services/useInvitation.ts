import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ✅ ไม่ต้องใช้ getAuthHeader อีกต่อไป - ใช้ cookies แทน
// const getAuthHeader = () => {
//   const token = localStorage.getItem('accessToken');
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };

export const sendInvitation = async (email: string, org_id: string, role_id: number) => {
  const response = await axios.post(
    `${API_URL}/invitations/send`,
    { email, org_id, role_id },
    { withCredentials: true } // ✅ ใช้ cookies แทน Authorization header
  );
  return response.data;
};

export const getInvitationInfo = async (token: string) => {
  const response = await axios.get(`${API_URL}/invitations/${token}`);
  // ✅ API returns { success: true, data: {...} } so we extract .data
  return response.data.data || response.data;
};

export const acceptInvitation = async (token: string) => {
  const response = await axios.post(
    `${API_URL}/invitations/accept`,
    { token },
    { withCredentials: true } // ✅ ใช้ cookies แทน Authorization header
  );
  return response.data;
};
