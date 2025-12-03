// tests/services/InvitationService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createInvitationService } from '../../src/services/InvitationService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('InvitationService (100% Coverage)', () => {
    let service;
    let mockUser, mockMember, mockOrg, mockInvitation;
    let mockDb, mockMailer, mockJwt;
    let mockTransaction;

    beforeEach(() => {
        mockTransaction = {
            commit: jest.fn(),
            rollback: jest.fn(),
            finished: false
        };
        mockDb = {
            transaction: jest.fn().mockResolvedValue(mockTransaction)
        };

        mockUser = { findByEmail: jest.fn() };
        mockMember = { exists: jest.fn(), findByUser: jest.fn(), create: jest.fn() };
        mockOrg = { findById: jest.fn(), isOwner: jest.fn() };
        mockInvitation = {
            findByEmail: jest.fn(),
            updateStatus: jest.fn(),
            create: jest.fn(),
            findByToken: jest.fn(),
            findPendingByOrg: jest.fn(),
            expireOldInvitations: jest.fn()
        };

        mockMailer = jest.fn().mockResolvedValue(true);
        mockJwt = {
            sign: jest.fn().mockReturnValue('jwt-token'),
            verify: jest.fn().mockReturnValue({ email: 'test@mail.com', org_id: 'o1', role_id: 3 })
        };

        service = createInvitationService({
            UserModel: mockUser,
            MemberModel: mockMember,
            OrganizationModel: mockOrg,
            InvitationModel: mockInvitation,
            sequelize: mockDb,
            sendEmail: mockMailer,
            jwt: mockJwt,
            env: { FRONTEND_URL: 'http://fe' },
            INVITE_SECRET: 'secret'
        });
    });

    afterEach(() => { jest.clearAllMocks(); });

    describe('sendInvitation', () => {
        const validData = ['a@b.com', 'o1', '3', 'u1']; // role 3

        it('should throw BadRequest (400) if missing data', async () => {
            await expect(service.sendInvitation()).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw Conflict (409) if user already member of THIS org', async () => {
            mockUser.findByEmail.mockResolvedValue({ user_id: 'u2' });
            mockMember.exists.mockResolvedValue(true);
            await expect(service.sendInvitation(...validData)).rejects.toMatchObject({
                 statusCode: 409, message: expect.stringMatching(/สมาชิกบริษัทของท่าน/) 
            });
        });

        it('should throw Conflict if user is member of OTHER org and role is not OWNER (1)', async () => {
            mockUser.findByEmail.mockResolvedValue({ user_id: 'u2' });
            mockMember.exists.mockResolvedValue(false); // Not member of this org
            // Member of other org
            mockMember.findByUser.mockResolvedValue([{ org_id: 'other', role_id: 3 }]);
            
            await expect(service.sendInvitation('a@b.com', 'o1', '3', 'u1')).rejects.toMatchObject({ 
                statusCode: 409, message: expect.stringMatching(/สมาชิกอยู่แล้วในบริษัทอื่น/) 
            });
        });

        it('should send invitation successfully', async () => {
            mockUser.findByEmail.mockResolvedValue(null);
            mockInvitation.findByEmail.mockResolvedValue([]);
            mockInvitation.create.mockResolvedValue({ invitation_id: 'iv1' });
            mockOrg.findById.mockResolvedValue({ org_name: 'Test Co' });

            const res = await service.sendInvitation(...validData);

            expect(mockDb.transaction).toHaveBeenCalled();
            expect(mockMailer).toHaveBeenCalled();
            expect(mockInvitation.create).toHaveBeenCalled();
            expect(res.success).toBe(true);
        });

        it('should rollback on error', async () => {
            mockUser.findByEmail.mockResolvedValue(null);
            mockInvitation.findByEmail.mockRejectedValue(new Error('DB Fail'));
            await expect(service.sendInvitation(...validData)).rejects.toThrow('DB Fail');
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('getInvitationInfo', () => {
        it('should throw NotFound (404) if invalid token', async () => {
            mockInvitation.findByToken.mockResolvedValue(null);
            await expect(service.getInvitationInfo('t')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw BadRequest if status not pending', async () => {
            mockInvitation.findByToken.mockResolvedValue({ status: 'accepted' });
            await expect(service.getInvitationInfo('t')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw BadRequest if expired', async () => {
            const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 1);
            mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: pastDate, invitation_id: 'iv1' });
            
            await expect(service.getInvitationInfo('t')).rejects.toMatchObject({ statusCode: 400, message: 'Invitation has expired' });
            expect(mockInvitation.updateStatus).toHaveBeenCalledWith('iv1', 'expired');
        });

        it('should throw BadRequest if token verify fails', async () => {
            const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 1);
            mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: futureDate });
            mockJwt.verify.mockImplementation(() => { throw new Error(); }); // Simulate verify fail return null handled in verifyInviteToken wrapper

            await expect(service.getInvitationInfo('t')).rejects.toMatchObject({ statusCode: 400, message: 'Invalid invitation token signature' });
        });

        it('should return info successfully', async () => {
            const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 1);
            mockInvitation.findByToken.mockResolvedValue({ 
                status: 'pending', expires_at: futureDate, 
                email: 'test@mail.com', org_id: 'o1' 
            });
            mockUser.findByEmail.mockResolvedValue(null);
            mockOrg.findById.mockResolvedValue({ org_name: 'Co' });

            const res = await service.getInvitationInfo('valid-token');
            expect(res.email).toBe('test@mail.com');
            expect(res.isExistingUser).toBe(false);
        });
    });

    describe('acceptInvitation', () => {
        const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 1);

        it('should throw NotFound if token invalid', async () => {
             mockInvitation.findByToken.mockResolvedValue(null);
             await expect(service.acceptInvitation('t', 'u1')).rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw BadRequest if not pending', async () => {
             mockInvitation.findByToken.mockResolvedValue({ status: 'cancelled' });
             await expect(service.acceptInvitation('t', 'u1')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw BadRequest if expired', async () => {
             const past = new Date(); past.setDate(past.getDate() -1);
             mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: past });
             await expect(service.acceptInvitation('t', 'u1')).rejects.toMatchObject({ message: 'Invitation has expired' });
        });

        it('should throw BadRequest if jwt invalid', async () => {
             mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: futureDate });
             mockJwt.verify.mockImplementation(() => { throw new Error(); });
             await expect(service.acceptInvitation('t', 'u1')).rejects.toMatchObject({ message: 'Invalid token signature' });
        });

        it('should throw Conflict if user works elsewhere (role != 1 check)', async () => {
             mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: futureDate, role_id: 3, org_id: 'o1' });
             mockMember.findByUser.mockResolvedValue([{ org_id: 'o2', role_id: 3 }]);
             
             await expect(service.acceptInvitation('t', 'u1')).rejects.toMatchObject({ statusCode: 409 });
        });

        it('should accept successfully', async () => {
             mockInvitation.findByToken.mockResolvedValue({ 
                 status: 'pending', expires_at: futureDate, role_id: 3, org_id: 'o1', invitation_id: 'iv1' 
             });
             mockMember.findByUser.mockResolvedValue([]);
             
             const res = await service.acceptInvitation('t', 'u1');
             
             expect(mockMember.create).toHaveBeenCalled();
             expect(mockInvitation.updateStatus).toHaveBeenCalledWith('iv1', 'accepted', mockTransaction);
             expect(mockTransaction.commit).toHaveBeenCalled();
             expect(res.success).toBe(true);
        });

        it('should rollback on error', async () => {
             mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: futureDate, role_id: 3 });
             mockMember.create.mockRejectedValue(new Error('Fail'));
             
             await expect(service.acceptInvitation('t', 'u1')).rejects.toThrow('Fail');
             expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('cancelInvitation', () => {
        it('should throw Forbidden if not inviter or owner', async () => {
            mockInvitation.findByToken.mockResolvedValue({ status: 'pending', invited_by: 'u_other', org_id: 'o1' });
            mockOrg.isOwner.mockResolvedValue(false);
            
            await expect(service.cancelInvitation('t', 'u_hacker')).rejects.toMatchObject({ statusCode: 403 });
        });

        it('should cancel successfully if inviter', async () => {
            mockInvitation.findByToken.mockResolvedValue({ status: 'pending', invited_by: 'u_me', invitation_id: 'iv1' });
            
            const res = await service.cancelInvitation('t', 'u_me');
            expect(mockInvitation.updateStatus).toHaveBeenCalledWith('iv1', 'cancelled');
            expect(res.success).toBe(true);
        });
    });

    describe('verifyInviteToken (Direct)', () => {
        it('should return null if verify throws', () => {
             mockJwt.verify.mockImplementation(() => { throw new Error(); });
             const token = service.verifyInviteToken('bad');
             expect(token).toBeNull();
        });
    });
});