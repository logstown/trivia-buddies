import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { find, groupBy, minBy } from "lodash";

export const getGroupQuestions = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .collect();
    return questions;
  },
});

export const addQuestionUponCreateGroup = internalAction({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const question = await ctx.runAction(internal.opentdb.fetchQuestion, {
      categoryId: undefined,
    });
    await ctx.runMutation(internal.questions.addGroupQuestion, {
      groupId,
      type: question.type,
      difficulty: question.difficulty,
      category: question.category,
      question: question.question,
      correctAnswer: question.correct_answer,
      incorrectAnswers: question.incorrect_answers,
    });
  },
});

export const addNewGroupQuestion = internalAction({
  args: {},
  handler: async (ctx) => {
    const allGroups = await ctx.runQuery(internal.group.getReadyGroups);

    for (const group of allGroups) {
      const groupQuestions = await ctx.runQuery(
        internal.questions.getGroupQuestions,
        { groupId: group._id },
      );

      const groupUsers = await ctx.runQuery(api.users.getUsersInGroup, {
        groupId: group._id,
      });
      const nextCategoryUser = minBy(
        groupUsers,
        (user) => user.numQuestionsPicked ?? 0,
      );

      let question: Awaited<
        ReturnType<typeof ctx.runAction<typeof internal.opentdb.fetchQuestion>>
      >;

      let alreadyUsed: boolean;
      do {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // Avoid hammering the API in case of many duplicates
        question = await ctx.runAction(internal.opentdb.fetchQuestion, {
          categoryId: nextCategoryUser?.nextCategory.id,
        });

        alreadyUsed = groupQuestions.some(
          (q) => q.question === question.question,
        );
      } while (alreadyUsed);

      await ctx.runMutation(internal.questions.addGroupQuestion, {
        groupId: group._id,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
        question: question.question,
        correctAnswer: question.correct_answer,
        incorrectAnswers: question.incorrect_answers,
      });

      if (nextCategoryUser) {
        await ctx.runMutation(internal.users.incrementNumQuestionsPicked, {
          userId: nextCategoryUser._id,
        });
      }
    }
  },
});

export const addGroupQuestion = internalMutation({
  args: {
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
    incorrectAnswers: v.array(v.string()),
  },
  handler: async (
    ctx,
    {
      groupId,
      type,
      difficulty,
      category,
      question,
      correctAnswer,
      incorrectAnswers,
    },
  ) => {
    const answers =
      type === "multiple"
        ? [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5)
        : ["True", "False"];

    await ctx.db.insert("questions", {
      groupId,
      type,
      difficulty,
      category,
      question,
      correctAnswer,
      answers,
    });
  },
});

export const getTodaysQuestion = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const groupId = user.groupId;
    if (!groupId) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_groupId", (q) => q.eq("groupId", groupId))
      .order("desc")
      .take(1);

    if (questions.length === 0) return null;

    const question = questions[0]; // Assuming the first question is today's question

    return question;
  },
});

export const getQuestionAnswers = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, { questionId }) => {
    const answers = await ctx.db
      .query("playerAnswers")
      .withIndex("questionId", (q) => q.eq("questionId", questionId))
      .collect();

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const userAnswer = answers.find((a) => a.playerId === user._id);

    const groupUsers = await ctx.db
      .query("users")
      .withIndex("by_groupId", (q) => q.eq("groupId", user.groupId!))
      .collect();

    const usersWithAnswer = groupUsers
      //   .filter((u) => u._id !== user._id)
      .map((u) => {
        const userAnswer = find(answers, { playerId: u._id });

        return {
          playerName: u?.name ?? "Unknown Player",
          playerImageUrl: u?.imageUrl,
          answer: userAnswer?.answer,
        };
      });

    const answerUsers = groupBy(usersWithAnswer, (u) => {
      return u.answer || "hasntAnswered";
    });

    return {
      userAnswer: userAnswer?.answer,
      answerUsers,
    };
  },
});

export const submitAnswer = mutation({
  args: {
    answer: v.string(),
  },
  handler: async (ctx, { answer }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) return null;

    const todaysQuestion = await ctx.runQuery(api.questions.getTodaysQuestion);

    if (!todaysQuestion) {
      throw new Error("No question available to answer");
    }

    await ctx.db.insert("playerAnswers", {
      playerId: user._id,
      questionId: todaysQuestion._id,
      answer,
    });
  },
});
