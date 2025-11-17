import * as userModel from '../models/UserModel.js';

// GET /api/users
export async function getUsers(req, res) {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}

// GET /api/users/:id
export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const user = await userModel.getUserById(id);

    if (!user) return res.status(404).json({ error: 'not_found' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}

// POST /api/users
export async function createUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name_email_password_required' });
    }

    const newUser = await userModel.createUser({ name, email, password });
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
