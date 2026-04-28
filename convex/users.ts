import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const upsertCurrentUser = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (existing) {
      await ctx.db.patch("users", existing._id, {
        name: identity.name,
        imageUrl: identity.pictureUrl,
      });
    } else {
      await ctx.db.insert("users", {
        clerkId: identity.tokenIdentifier,
        name: identity.name || "Anonymous",
        imageUrl: identity.pictureUrl,
      });
    }
    return null;
  },
});
