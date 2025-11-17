import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

import userRoutes from './src/routes/memberRoutes.js';

app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('API server is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
