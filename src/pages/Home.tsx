import { TodaysQuestion } from "@/components/TodaysQuestion";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CreateGroup from "@/components/CreateGroup";

export function HomePage() {
  const [createdGroupJoinUrl, setCreatedGroupJoinUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const user = useQuery(api.users.getCurrentUser);
  const group = useQuery(api.group.getGroupByUser, user ? {} : "skip");

  const handleGroupCreated = (joinUrl: string) => {
    setCreatedGroupJoinUrl(joinUrl);
    setCopyStatus("idle");
  };

  const handleCloseModal = () => {
    setCreatedGroupJoinUrl("");
    setCopyStatus("idle");
  };

  const handleCopyJoinUrl = async () => {
    try {
      await navigator.clipboard.writeText(createdGroupJoinUrl);
      setCopyStatus("copied");
    } catch (error) {
      console.error("Error copying join URL:", error);
      setCopyStatus("failed");
    }
  };

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
    <>
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        {group ? (
          <TodaysQuestion />
        ) : (
          <CreateGroup onGroupCreated={handleGroupCreated} />
        )}
      </section>

      {createdGroupJoinUrl && (
        <dialog className="modal" open>
          <div className="modal-box">
            <h3 className="text-lg font-bold">Invite friends to your group</h3>
            <p className="py-4">
              Share this link with friends so they can join your group.
            </p>
            <div className="join w-full">
              <input
                className="input join-item w-full font-mono text-sm"
                value={createdGroupJoinUrl}
                readOnly
              />
              <button
                className="btn btn-primary join-item"
                onClick={() => void handleCopyJoinUrl()}
              >
                {copyStatus === "copied" ? "Copied" : "Copy"}
              </button>
            </div>
            {copyStatus === "failed" && (
              <p className="mt-2 text-sm text-error">
                Copy failed. You can select the link and copy it manually.
              </p>
            )}
            <div className="modal-action">
              <button className="btn" onClick={handleCloseModal}>
                Done
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseModal}>close</button>
          </form>
        </dialog>
      )}
    </>
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
