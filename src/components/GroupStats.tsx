import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { sortBy } from "lodash";
import { Stat } from "./Stat";

export function GroupStats({
  groupId,
  totalQuestions,
}: {
  groupId: Id<"groups">;
  totalQuestions: number;
}) {
  const playerStats = useQuery(api.stats.getPlayerStatsByGroup, { groupId });

  //   const playersWithSameAccuracy = chain(playerStats ?? [])
  //     .groupBy("accuracy")
  //     .map((players, accuracy) => ({
  //       accuracy: parseFloat(accuracy),
  //       players: players.map((stat) => ({
  //         id: stat.playerId,
  //         name: stat.playerName,
  //         avatarUrl: stat.playerAvatarUrl,
  //       })),
  //     }))
  //     .sortBy("accuracy")
  //     .reverse()
  //     .value();
  // .map((stats, accuracy) => {
  //     const sortedStats = sortBy(stats, stat => stat.answered).reverse();
  //     return sortedStats[0];
  // }

  if (!playerStats) {
    return null;
  }

  const playerAccuracies = sortBy(playerStats, "accuracy").reverse();

  console.log(totalQuestions);

  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow overflow-visible">
      {playerAccuracies.map((p) => (
        <Stat
          key={p._id}
          users={[
            {
              id: p.playerId,
              name: p.playerName,
              avatarUrl: p.playerAvatarUrl,
            },
          ]}
          statValue={p.accuracy * 100 + "%"}
          statTitle={`${p.correct} / ${p.answered} correct`}
          //   statDesc={`${stat.correct} / ${stat.answered} correct`}
        />
      ))}
    </div>
  );
}
