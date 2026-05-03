import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "get daily question",
  { hourUTC: 8, minuteUTC: 0 }, // 3am Eastern Time
  internal.questions.addNewGroupQuestion,
  {},
);

export default crons;
