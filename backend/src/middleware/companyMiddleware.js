import { MemberModel } from '../models/MemberModel.js';

export const requireCompany = async (req, res, next) => {
  try {
    const headerCompany = req.headers['x-company-id'];
    const companyId = headerCompany || req.body.company_id || req.query.company_id || req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'company_id required' });

    const role = await MemberModel.getRole(companyId, req.user.user_id);
    if (!role) return res.status(403).json({ error: 'Not a member of company' });

    req.user.company_id = Number(companyId);
    req.user.role = role;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
