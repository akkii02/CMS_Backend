const express = require('express');
const router = express.Router();
const {
    getClients,
    updateClientTier,
    getMetrics,
    getUsers,
    suspendUser,
    addCredits,
    updateUserPlan
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes here should be protected and admin only
router.use(protect);
router.use(admin);

router.get('/clients', getClients);
router.put('/clients/:id/tier', updateClientTier);
router.get('/metrics', getMetrics);
router.get('/users', getUsers);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/add-credits', addCredits);
router.put('/users/:id/plan', updateUserPlan);

module.exports = router;
