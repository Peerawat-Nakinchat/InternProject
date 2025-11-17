import { CompanyModel } from '../models/CompanyModel.js';
import { MemberModel } from '../models/MemberModel.js';

export const CompanyController = {
  async create(req, res) {
    try {
      const userId = req.user.user_id;
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });

      const company = await CompanyModel.create(name, userId);
      await MemberModel.addMember(company.id, userId, 'owner', userId);
      return res.status(201).json({ company });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async transferOwnership(req, res) {
    try {
      const { company_id, new_owner_id } = req.body;
      const userId = req.user.user_id;

      // only current owner can transfer
      const role = await MemberModel.getRole(company_id, userId);
      if (role !== 'owner') return res.status(403).json({ error: 'Only owner can transfer ownership' });

      // change roles
      await MemberModel.updateRole(company_id, userId, 'admin');
      await MemberModel.updateRole(company_id, new_owner_id, 'owner');
      await CompanyModel.updateOwner(company_id, new_owner_id);

      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
};
