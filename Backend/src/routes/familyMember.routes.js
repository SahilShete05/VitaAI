
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
} = require("../validations/familyMember.validation");

const {
  createFamilyMember,
  getFamilyMembers,
  getFamilyMemberById,
  updateFamilyMember,
  deleteFamilyMember,
} = require("../controllers/familyMember.controller");

router.use(authMiddleware);

router.post(
  "/",
  validate(createFamilyMemberSchema),
  createFamilyMember
);

router.get("/", getFamilyMembers);

router.get("/:id", getFamilyMemberById);

router.put(
  "/:id",
  validate(updateFamilyMemberSchema),
  updateFamilyMember
);

router.delete("/:id", deleteFamilyMember);

module.exports = router;
