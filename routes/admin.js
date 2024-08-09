const express = require('express');
const { getAllUsers, getAllTransactions, managePackages, activateUserAndAssignPackage } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/auth');

const router = express.Router();

router.get('/users', adminProtect, getAllUsers);
router.get('/transactions', adminProtect, getAllTransactions);
router.post('/packages', adminProtect, managePackages);
router.post('/activate-user-and-assign-package', activateUserAndAssignPackage);

module.exports = router;
