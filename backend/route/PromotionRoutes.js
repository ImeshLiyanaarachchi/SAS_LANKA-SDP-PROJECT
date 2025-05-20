const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/AuthMiddleware");
const {
    createPromotion,
    getAllPromotions,
    getPromotionsByServiceId,
    updatePromotion,
    deletePromotion
} = require("../controller/PromotionController");

// Promotion routes
router.post("/", authenticateUser, createPromotion);
router.get("/", authenticateUser, getAllPromotions);
router.get("/service/:serviceId", authenticateUser, getPromotionsByServiceId);
router.put("/:promotionId", authenticateUser, updatePromotion);
router.delete("/:promotionId", authenticateUser, deletePromotion);

module.exports = router; 