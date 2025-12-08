import axiosInstance from '@/utils/axios';

// ✅ ใช้ axiosInstance ที่มี refresh token interceptor
export const sendInvitation = async (email: string, org_id: string, role_id: number) => {
  const response = await axiosInstance.post(
    '/invitations/send',
    { email, org_id, role_id }
  );
  return response;
};

export const getInvitationInfo = async (token: string) => {
  const response = await axiosInstance.get(`/invitations/${token}`);
  return response.data || response;
};

export const acceptInvitation = async (token: string) => {
  const response = await axiosInstance.post(
    '/invitations/accept',
    { token }
  );
  return response;
};
