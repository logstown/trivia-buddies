import { TodaysQuestion } from "@/components/TodaysQuestion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import CreateGroup from "@/components/CreateGroup";
import { Avatar } from "@/components/Avatar";

export function HomePage() {
  const user = useQuery(api.users.getCurrentUser);
  const group = useQuery(api.group.getGroupByUser, user ? {} : "skip");

  if (group === undefined) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        <h1 className="text-3xl font-bold">
          Loading your group information...
        </h1>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
      {group ? <TodaysQuestion /> : <CreateGroup />}
    </section>
  );
}

//   <>
//     {group.isUserHost && (
//       <>
//         <p className="">
//           Share this link with your friends to join the group:
//         </p>
//         <code className="rounded px-2 py-1">
//           {window.location.origin}/join-group/{group._id}
//         </code>
//       </>
//     )}
//     <ul className="list bg-base-100 rounded-box shadow-md">
//       <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">
//         Members
//       </li>
//       {group.users.map((user) => (
//         <li key={user._id} className="list-row">
//           <Avatar imageUrl={user.imageUrl} name={user.name} isLarge />
//           <div className="flex items-center">
//             <div>{user.name}</div>
//           </div>
//         </li>
//       ))}
//     </ul>
//   </>
