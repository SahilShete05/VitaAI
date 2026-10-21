
const prisma = require("../config/prismaClient");

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      assessmentCount,
      familyMemberCount,
      reminderCount,
      completedReminderCount,
      upcomingReminders,
      latestAssessment,
      recentAssessments,
      riskLevelGroups,
      assessmentsLast7Days,
      unreadNotificationCount,
    ] = await Promise.all([
      prisma.assessment.count({
        where: { userId },
      }),

      prisma.familyMember.count({
        where: { userId },
      }),

      prisma.reminder.count({
        where: { userId },
      }),

      prisma.reminder.count({
        where: { userId, isCompleted: true },
      }),

      prisma.reminder.findMany({
        where: {
          userId,
          isCompleted: false,
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),

      prisma.assessment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),

      prisma.assessment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          symptoms: true,
          severity: true,
          riskLevel: true,
          aiSummary: true,
          createdAt: true,
          familyMemberId: true,
        },
      }),

      prisma.assessment.groupBy({
        by: ["riskLevel"],
        where: { userId },
        _count: { _all: true },
      }),

      prisma.assessment.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          id: true,
          createdAt: true,
          riskLevel: true,
          severity: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      prisma.reminder.count({
        where: {
          userId,
          notificationReady: true,
          notificationReadAt: null,
          isCompleted: false,
        },
      }),
    ]);

    const riskDistribution = {
      low: 0,
      moderate: 0,
      high: 0,
      emergency: 0,
      unknown: 0,
    };

    for (const group of riskLevelGroups) {
      const key = String(group.riskLevel || "unknown")
        .trim()
        .toLowerCase();

      const count = group._count._all;

      if (Object.prototype.hasOwnProperty.call(riskDistribution, key)) {
        riskDistribution[key] += count;
      } else {
        riskDistribution.unknown += count;
      }
    }

    const dailyAssessmentCounts = {};

    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(sevenDaysAgo.getDate() + i);

      const dateKey = day.toISOString().slice(0, 10);
      dailyAssessmentCounts[dateKey] = 0;
    }

    for (const assessment of assessmentsLast7Days) {
      const dateKey = new Date(assessment.createdAt)
        .toISOString()
        .slice(0, 10);

      if (dailyAssessmentCounts[dateKey] !== undefined) {
        dailyAssessmentCounts[dateKey]++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        // Existing dashboard fields
        assessmentCount,
        familyMemberCount,
        reminderCount,
        completedReminderCount,
        pendingReminderCount:
          reminderCount - completedReminderCount,
        upcomingReminders,
        latestAssessment,

        // New dashboard statistics
        riskDistribution,
        dailyAssessmentCounts,
        recentAssessments,
        unreadNotificationCount,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
};

module.exports = { getDashboard };
