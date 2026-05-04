import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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
        numQuestionsPicked: 0,
        nextCategory: {
          id: 0,
          name: "Random",
        },
      });
    }
    return null;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      imageUrl: user.imageUrl,
      nextCategory: user.nextCategory,
    };
  },
});

export const getUsersInGroup = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    return users;
  },
});

export const updateNextCategory = mutation({
  args: {
    nextCategory: v.object({
      id: v.number(),
      name: v.string(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { nextCategory }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    console.log(nextCategory);
    await ctx.db.patch("users", user._id, {
      nextCategory,
    });
    return null;
  },
});

export const incrementNumQuestionsPicked = internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user) return null;

    await ctx.db.patch("users", user._id, {
      numQuestionsPicked: user.numQuestionsPicked + 1,
    });
    return null;
  },
});
