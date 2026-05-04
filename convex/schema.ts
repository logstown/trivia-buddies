import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    groupId: v.optional(v.id("groups")),
    nextCategory: v.object({
      id: v.number(),
      name: v.string(),
    }),
    numQuestionsPicked: v.number(),
  })
    .index("by_clerkId", ["clerkId"]) // Get a user by their Clerk ID
    .index("by_groupId", ["groupId"]), // Get users in a group

  groups: defineTable({
    name: v.string(),
    hostId: v.id("users"),
  }),

  questions: defineTable({
    groupId: v.id("groups"),
    type: v.union(v.literal("multiple"), v.literal("boolean")),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    category: v.string(),
    question: v.string(),
    correctAnswer: v.string(),
    answers: v.array(v.string()),
  }).index("by_groupId", ["groupId"]), // Get questions for a group

  playerAnswers: defineTable({
    playerId: v.id("users"),
    questionId: v.id("questions"),
    answer: v.string(),
  })
    .index("playerId", ["playerId"]) // Get questions for a player
    .index("questionId", ["questionId"]), // Get users for a question
});
