import { Router } from 'express';
import { FolderController } from '../controllers/folder.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createFolderSchema,
  updateFolderSchema,
  moveToFolderSchema
} from '../validators/folder.validator';

const router = Router();
const folderController = new FolderController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all folders
router.get('/', folderController.getFolders);

// Get folder statistics
router.get('/stats', folderController.getFolderStats);

// Get specific folder
router.get('/:id', folderController.getFolder);

// Create new folder
router.post('/', validateRequest(createFolderSchema), folderController.createFolder);

// Update folder
router.put('/:id', validateRequest(updateFolderSchema), folderController.updateFolder);

// Delete folder
router.delete('/:id', folderController.deleteFolder);

// Move emails to folder
router.post('/:id/move', validateRequest(moveToFolderSchema), folderController.moveToFolder);

// Define folder routes here

export default router; 