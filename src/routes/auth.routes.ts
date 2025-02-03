import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginValidation, registerValidation, validateResult } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Login route with validation
router.post('/login', loginValidation, validateResult, authController.login);

// Register route with validation
router.post('/register', registerValidation, validateResult, authController.register);

export default router; 