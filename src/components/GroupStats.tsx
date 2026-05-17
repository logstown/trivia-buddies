import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { chain } from "lodash";
import { Stat } from "./Stat";
import { InfoIcon } from "lucide-react";

export function GroupStats({
  groupId,
  totalQuestions,
}: {
  groupId: Id<"groups">;
  totalQuestions: number;
}) {
  const playerStats = useQuery(api.stats.getPlayerStatsByGroup, { groupId });

  if (!playerStats) {
    return null;
  }

  //   const playerAccuracies = sortBy(playerStats, "accuracy").reverse();

  const playerPoints = chain(playerStats)
    .map((p) => ({
      ...p,
      points: p.answered * 2 + p.correct * 10,
    }))
    .sortBy("points")
    .value()
    .reverse();

  console.log(totalQuestions);

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 flex gap-2">
        Leaderboard (points)
        <span
          className="tooltip"
          data-tip={`Points are calculated as 2 points per question answered and an additional 10 points for each correct answer.`}
        >
          <InfoIcon className="inline-block ml-1 w-4 h-4 text-base-content/70" />
        </span>
      </h3>
      <div className="stats stats-vertical lg:stats-horizontal shadow overflow-visible">
        {playerPoints.map((p) => (
          <Stat
            key={p._id}
            users={[
              {
                id: p.playerId,
                name: p.playerName,
                avatarUrl: p.playerAvatarUrl,
              },
            ]}
            statValue={p.points.toString()}
            statTitle={`${p.correct} / ${p.answered} correct`}
            statDesc={p.accuracy * 100 + "%"}
          />
        ))}
      </div>
    </div>
  );
}
