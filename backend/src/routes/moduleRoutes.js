// src/routes/moduleRoutes.js
import express from "express";
import ModuleController from "../controllers/ModuleController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Get all modules
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of modules
 */
router.get("/", protect, ModuleController.getAllModules);

/**
 * @swagger
 * /api/modules/active:
 *   get:
 *     summary: Get active modules only
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active modules
 */
router.get("/active", protect, ModuleController.getActiveModules);

/**
 * @swagger
 * /api/modules/search:
 *   get:
 *     summary: Search modules
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", protect, ModuleController.searchModules);

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Get module by ID
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Module UUID
 *     responses:
 *       200:
 *         description: Module details
 */
router.get("/:id", protect, ModuleController.getModuleById);

/**
 * @swagger
 * /api/modules/code/{code}:
 *   get:
 *     summary: Get module by code
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Module code
 *     responses:
 *       200:
 *         description: Module details
 */
router.get("/code/:code", protect, ModuleController.getModuleByCode);

/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Create new module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - module_code
 *               - module_name
 *             properties:
 *               module_code:
 *                 type: string
 *               module_name:
 *                 type: string
 *               standard_version:
 *                 type: string
 *               description:
 *                 type: string
 *               module_point:
 *                 type: string
 *               is_active:
 *                 type: string
 *     responses:
 *       201:
 *         description: Module created
 */
router.post("/", protect, ModuleController.createModule);

/**
 * @swagger
 * /api/modules/{id}:
 *   put:
 *     summary: Update module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Module updated
 */
router.put("/:id", protect, ModuleController.updateModule);

/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module deleted
 */
router.delete("/:id", protect, ModuleController.deleteModule);

export default router;
