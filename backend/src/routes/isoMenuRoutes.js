// src/routes/isoMenuRoutes.js
import express from "express";
import IsoMenuController from "../controllers/IsoMenuController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/iso-menus/{moduleCode}:
 *   get:
 *     summary: Get all menus for a module
 *     tags: [ISO Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Module code (e.g. ISO27001)
 *     responses:
 *       200:
 *         description: List of menus
 */
router.get("/:moduleCode", protect, IsoMenuController.getMenusByModule);

/**
 * @swagger
 * /api/iso-menus/{moduleCode}/{menuType}:
 *   get:
 *     summary: Get hierarchical menus by module and type
 *     tags: [ISO Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Module code (e.g. ISO27001)
 *       - in: path
 *         name: menuType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [M, T, R]
 *         description: Menu type (M=Master, T=Transaction, R=Report)
 *     responses:
 *       200:
 *         description: Hierarchical menu structure
 */
router.get("/:moduleCode/:menuType", protect, IsoMenuController.getMenusByType);

/**
 * @swagger
 * /api/iso-menus/detail/{menuRefId}:
 *   get:
 *     summary: Get menu by ID
 *     tags: [ISO Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuRefId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu details
 */
router.get("/detail/:menuRefId", protect, IsoMenuController.getMenuById);

/**
 * @swagger
 * /api/iso-menus:
 *   post:
 *     summary: Create new menu
 *     tags: [ISO Menus]
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
 *               - h_menu_id
 *               - menu_id
 *               - menu_label
 *     responses:
 *       201:
 *         description: Menu created
 */
router.post("/", protect, IsoMenuController.createMenu);

/**
 * @swagger
 * /api/iso-menus/{menuRefId}:
 *   put:
 *     summary: Update menu
 *     tags: [ISO Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuRefId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu updated
 */
router.put("/:menuRefId", protect, IsoMenuController.updateMenu);

/**
 * @swagger
 * /api/iso-menus/{menuRefId}:
 *   delete:
 *     summary: Delete menu
 *     tags: [ISO Menus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: menuRefId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu deleted
 */
router.delete("/:menuRefId", protect, IsoMenuController.deleteMenu);

export default router;
