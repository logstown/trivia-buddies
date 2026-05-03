import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

export const getGroupById = query({
  args: {
    groupId: v.id("groups"),
  },
  returns: v.nullable(
    v.object({
      name: v.string(),
      hostName: v.string(),
    }),
  ),
  handler: async (ctx, { groupId }) => {
    const group = await ctx.db.get("groups", groupId);
    if (!group) return null;

    const host = await ctx.db.get("users", group.hostId);
    if (!host) return null;

    return {
      name: group.name,
      hostName: host.name,
    };
  },
});

export const getGroupByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    if (!user.groupId) return null;

    const group = await ctx.db.get("groups", user.groupId);
    if (!group) return null;

    const users = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", group._id))
      .collect();

    return {
      ...group,
      isUserHost: group.hostId === user._id,
      hostName: users.find((u) => u._id === group.hostId)?.name || "Unknown",
      users: users.map((u) => ({
        _id: u._id,
        name: u.name,
        imageUrl: u.imageUrl,
      })),
    };
  },
});

export const getReadyGroups = internalQuery({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").collect();
    return groups;
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("groups"),
  handler: async (ctx, { name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    const groupId = await ctx.db.insert("groups", {
      name,
      hostId: user._id,
    });

    await ctx.db.patch("users", user._id, {
      groupId,
    });

    return groupId;
  },
});

export const joinGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  returns: v.null(),
  handler: async (ctx, { groupId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const group = await ctx.db.get("groups", groupId);

    if (!group) throw new Error("Group not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch("users", user._id, {
      groupId,
    });

    return null;
  },
});
