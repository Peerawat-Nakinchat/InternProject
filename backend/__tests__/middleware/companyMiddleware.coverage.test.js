/**
 * CompanyMiddleware Coverage Tests (Refactored for createError/asyncHandler)
 * FIX: Using Absolute Path Mocking and fixing the asyncHandler implementation
 * to correctly capture next(error) and next() in Jest environment.
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ----------------------------------------------------
// ✅ 1. SETUP ABSOLUTE PATHS
// ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');


// ----------------------------------------------------
// ✅ 2. MOCK ERROR HANDLER AND ASYNCHANDLER (Using Absolute Path)
// Mock asyncHandler ให้เป็นฟังก์ชันที่รับ fn แล้วคืนค่าฟังก์ชัน async ที่ใช้ try/catch 
// เพื่อให้ Jest สามารถ await การทำงานภายในได้ และจับ throw error ส่งไป next
// ----------------------------------------------------
jest.mock(errorHandlerPath, () => ({
    asyncHandler: (fn) => async (req, res, next) => {
        try {
            // รัน Middleware Function ภายใต้ try
            await fn(req, res, next);
        } catch (error) {
            // ถ้าเกิด throw error ให้ส่งไป next(error)
            next(error);
        }
    }, 
    
    // Mock createError ให้คืนค่าเป็น object ที่มี statusCode เพื่อให้ next(error) ถูกตรวจสอบได้
    createError: {
        badRequest: (msg) => ({ message: msg, statusCode: 400 }),
        forbidden: (msg) => ({ message: msg, statusCode: 403 }),
        notFound: (msg) => ({ message: msg, statusCode: 404 }),
        unauthorized: (msg) => ({ message: msg, statusCode: 401 }),
        internal: (msg) => ({ message: msg, statusCode: 500 }),
    }
}));


// นำเข้าตัว Middleware (ต้องอยู่หลัง Mock)
import { createCompanyMiddleware } from '../../src/middleware/companyMiddleware.js'; 


describe('CompanyMiddleware (Refactored Coverage)', () => {
    let middleware;
    let mockMember, mockOrg, mockLogger;
    let req, res, next;

    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
        mockMember = { findOne: jest.fn() };
        mockOrg = { findById: jest.fn(), isOwner: jest.fn() };
        mockLogger = { suspiciousActivity: jest.fn() };

        middleware = createCompanyMiddleware({
            MemberModel: mockMember,
            OrganizationModel: mockOrg,
            securityLogger: mockLogger
        });

        // ตั้งค่า req object ที่ใช้บ่อยและกำหนด orgId ผ่าน header
        req = {
            // ตั้งค่า orgId ผ่าน header (Middleware เช็ค header ก่อน)
            headers: { 'x-org-id': validUUID, 'user-agent': 'TestAgent/1.0' }, 
            body: {},
            params: {},
            query: {},
            ip: '127.0.0.1',
            // user object ที่จะถูก Middleware เขียนทับ property ใหม่ (current_org_id, org_role_id)
            user: { user_id: 'user-1' } 
        };
        
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        next = jest.fn();
    });

    afterEach(() => { jest.clearAllMocks(); });

    describe('requireOrganization', () => {
        
        it('should call next(BadRequest) if orgId is missing', async () => {
            req.headers['x-org-id'] = undefined; // ล้างค่า orgId เพื่อทดสอบ missing
            await middleware.requireOrganization(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it('should call next(BadRequest) if orgId is invalid UUID', async () => {
            req.headers['x-org-id'] = 'invalid-uuid'; // ทดสอบ invalid uuid
            await middleware.requireOrganization(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });

        it('should call next(NotFound) if organization not found', async () => {
            mockOrg.findById.mockResolvedValue(null); // Org not found

            await middleware.requireOrganization(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 })); 
        });

        it('should call next(Forbidden) if user is not a member', async () => {
            mockOrg.findById.mockResolvedValue({ org_id: validUUID });
            mockMember.findOne.mockResolvedValue(null); // Not a member -> Forbidden

            await middleware.requireOrganization(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 })); 
        });

        it('should pass and set context if valid', async () => {
            const mockOrgData = { org_id: validUUID };
            const mockMemberData = { role_id: 'ADMIN' };

            mockOrg.findById.mockResolvedValue(mockOrgData);
            mockMember.findOne.mockResolvedValue(mockMemberData); // Is a member

            await middleware.requireOrganization(req, res, next);

            // ตรวจสอบการตั้งค่า context ใน req.user
            expect(req.user.current_org_id).toBe(validUUID); 
            expect(req.user.org_role_id).toBe('ADMIN'); 
            expect(next).toHaveBeenCalledWith(); // next() without arguments
        });
    });

    describe('requireOwnership', () => {
        // ต้องมั่นใจว่า current_org_id ถูกตั้งค่าก่อนรัน requireOwnership
        beforeEach(() => { 
            req.user.user_id = 'user-1'; 
            req.user.current_org_id = validUUID; 
        });

        it('should call next(Forbidden) if user is not owner', async () => {
            mockOrg.isOwner.mockResolvedValue(false);
            await middleware.requireOwnership(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 })); 
        });

        it('should pass if user is owner', async () => {
            mockOrg.isOwner.mockResolvedValue(true);
            await middleware.requireOwnership(req, res, next);
            expect(next).toHaveBeenCalledWith();
        });
    });

    describe('requireOrgRole', () => {
        beforeEach(() => { 
            req.user.current_org_id = validUUID; 
            req.user.org_role_id = undefined;
        });

        it('should call next(Forbidden) if role not found', () => {
            // req.user.org_role_id เป็น undefined (จาก beforeEach)
            const mw = middleware.requireOrgRole(['ADMIN']);
            mw(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 })); 
        });

        it('should call next(Forbidden) if role insufficient', () => {
            req.user.org_role_id = 'MEMBER';
            const mw = middleware.requireOrgRole(['ADMIN']);
            mw(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
        });

        it('should pass if role matches', () => {
            req.user.org_role_id = 'ADMIN';
            const mw = middleware.requireOrgRole(['ADMIN']);
            mw(req, res, next);
            expect(next).toHaveBeenCalledWith();
        });
    });
});