import { v } from "convex/values";
import { query } from "./_generated/server";

export const getPlayerStatsByGroup = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await ctx.db
          .query("playerStats")
          .withIndex("by_player", (q) => q.eq("playerId", user._id))
          .unique();

        if (!stats) {
          throw new Error("Can't find stats for this player");
        }
        return {
          ...stats,
          playerId: user._id,
          playerName: user.name,
          playerAvatarUrl: user.imageUrl,
          accuracy: stats ? (stats.correct ?? 0) / (stats.answered ?? 1) : 0,
        };
      }),
    );

    return usersWithStats;
  },
});
