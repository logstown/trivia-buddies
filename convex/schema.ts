import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
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
    totalQuestions: v.number(),
    totalCategoryQuestions: v.record(v.string(), v.number()), // category name -> number of questions in that category
    totalDifficultyQuestions: v.object({
      easy: v.number(),
      medium: v.number(),
      hard: v.number(),
    }), // difficulty -> number of questions in that difficulty
  }),

  questions: defineTable({
    groupId: v.id("groups"),
    stringDate: v.string(),
    user: v.optional(
      v.object({
        id: v.id("users"),
        name: v.string(),
      }),
    ),
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
  })
    .index("by_groupId", ["groupId"])
    .index("by_groupId_stringDate", ["groupId", "stringDate"]), // Get questions for a group

  playerAnswers: defineTable({
    playerId: v.id("users"),
    questionId: v.id("questions"),
    answer: v.string(),
  })
    .index("playerId", ["playerId"]) // Get questions for a player
    .index("questionId", ["questionId"]), // Get users for a question

  playerStats: defineTable({
    playerId: v.id("users"),
    groupId: v.id("groups"),

    answered: v.number(),
    correct: v.number(),

    currentParticipationStreak: v.number(),
    longestParticipationStreak: v.number(),
    currentCorrectStreak: v.number(),
    longestCorrectStreak: v.number(),

    lastAnsweredAt: v.optional(v.number()),
  })
    .index("by_player", ["playerId"])
    .index("by_group", ["groupId"]),

  playerCategoryStats: defineTable({
    playerId: v.id("users"),
    category: v.string(),
    groupId: v.id("groups"),

    answered: v.number(),
    correct: v.number(),
  })
    .index("by_player", ["playerId"])
    .index("by_player_category", ["playerId", "category"])
    .index("by_group", ["groupId"]), // Get category stats for a group

  playerDifficultyStats: defineTable({
    playerId: v.id("users"),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
    ),
    groupId: v.id("groups"),

    answered: v.number(),
    correct: v.number(),
  })
    .index("by_player", ["playerId"])
    .index("by_player_difficulty", ["playerId", "difficulty"])
    .index("by_group", ["groupId"]), // Get difficulty stats for a group
});
