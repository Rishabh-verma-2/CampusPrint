"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
router.post('/student-session', authController_1.studentQuickAccess);
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', authenticate_1.authenticate, authController_1.logout);
router.get('/me', authenticate_1.authenticate, authController_1.getMe);
router.post('/refresh', authController_1.refresh);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map