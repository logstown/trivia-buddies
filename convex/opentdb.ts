import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";

export interface OpenTDBCategory {
  id: number;
  name: string;
}

export interface OpenTDBQuestion {
  category: string;
  type: "multiple" | "boolean";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface OpenTDBQuestionResponse {
  response_code: number;
  results?: OpenTDBQuestion[];
}

const fetchCategoriesTDB = async (): Promise<OpenTDBCategory[]> => {
  const response = await fetch("https://opentdb.com/api_category.php");
  const data = (await response.json()) as {
    trivia_categories: OpenTDBCategory[];
  };
  return data.trivia_categories.sort((a, b) => a.name.localeCompare(b.name));
};

const fetchQuestionTDB = async (
  categoryId?: number,
): Promise<OpenTDBQuestion> => {
  const url = categoryId
    ? `https://opentdb.com/api.php?amount=1&category=${encodeURIComponent(
        categoryId,
      )}`
    : `https://opentdb.com/api.php?amount=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenTDB request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenTDBQuestionResponse;
  const question = data.results?.[0];

  if (question) {
    return question;
  }

  // Some categories can temporarily return no questions; retry without a category.
  if (categoryId !== undefined) {
    return fetchQuestionTDB();
  }

  throw new Error(
    `OpenTDB returned no questions (response_code=${data.response_code ?? "unknown"})`,
  );
};

export const fetchCategories = action({
  args: {},
  handler: async () => {
    return await fetchCategoriesTDB();
  },
});

export const fetchQuestion = internalAction({
  args: {
    categoryId: v.optional(v.number()),
  },
  handler: async (_, { categoryId }) => {
    return await fetchQuestionTDB(categoryId);
  },
});
