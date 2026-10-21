const prisma = require("../config/prismaClient");

// Add a family member
const createFamilyMember = async (req, res) => {
  try {
    const { name, relationship, dateOfBirth, gender } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof relationship !== "string" ||
      !relationship.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name and relationship are required",
      });
    }

    let parsedDate;

    if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== "") {
      parsedDate = new Date(dateOfBirth);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid dateOfBirth",
        });
      }
    }

    const familyMember = await prisma.familyMember.create({
      data: {
        name: name.trim(),
        relationship: relationship.trim(),
        dateOfBirth: parsedDate,
        gender:
          typeof gender === "string" && gender.trim()
            ? gender.trim()
            : null,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Family member added successfully",
      data: familyMember,
    });
  } catch (error) {
    console.error("Create family member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add family member",
    });
  }
};

// Get all family members belonging to the logged-in user
const getFamilyMembers = async (req, res) => {
  try {
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: familyMembers.length,
      data: familyMembers,
    });
  } catch (error) {
    console.error("Get family members error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch family members",
    });
  }
};

// Get one family member
const getFamilyMemberById = async (req, res) => {
  try {
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: familyMember,
    });
  } catch (error) {
    console.error("Get family member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch family member",
    });
  }
};

// Update a family member
const updateFamilyMember = async (req, res) => {
  try {
    const { name, relationship, dateOfBirth, gender } = req.body;

    const existing = await prisma.familyMember.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Family member not found",
      });
    }

    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }
      data.name = name.trim();
    }

    if (relationship !== undefined) {
      if (
        typeof relationship !== "string" ||
        !relationship.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Relationship cannot be empty",
        });
      }
      data.relationship = relationship.trim();
    }

    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        data.dateOfBirth = null;
      } else {
        const parsedDate = new Date(dateOfBirth);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid dateOfBirth",
          });
        }

        data.dateOfBirth = parsedDate;
      }
    }

    if (gender !== undefined) {
      if (gender !== null && typeof gender !== "string") {
        return res.status(400).json({
          success: false,
          message: "Gender must be a string or null",
        });
      }
      data.gender =
        typeof gender === "string" && gender.trim()
          ? gender.trim()
          : null;
    }

    const updated = await prisma.familyMember.update({
      where: { id: existing.id },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Family member updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update family member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update family member",
    });
  }
};

// Delete a family member
const deleteFamilyMember = async (req, res) => {
  try {
    const existing = await prisma.familyMember.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Family member not found",
      });
    }

    await prisma.familyMember.delete({
      where: { id: existing.id },
    });

    return res.status(200).json({
      success: true,
      message: "Family member deleted successfully",
    });
  } catch (error) {
    console.error("Delete family member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete family member",
    });
  }
};

module.exports = {
  createFamilyMember,
  getFamilyMembers,
  getFamilyMemberById,
  updateFamilyMember,
  deleteFamilyMember,
};