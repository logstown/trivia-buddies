import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";

type CreateGroupProps = {
  onGroupCreated: (joinUrl: string) => void;
};

export default function CreateGroup({ onGroupCreated }: CreateGroupProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const createGroup = useMutation(api.group.createGroup);

  const handleCreateGroup = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Enter a group name to continue.");
      return;
    }

    setIsCreating(true);
    setErrorMessage("");

    try {
      const groupId = await createGroup({ name: trimmedName });
      const joinUrl = `${window.location.origin}/join-group/${groupId}`;

      setNewGroupName("");
      onGroupCreated(joinUrl);
    } catch (error) {
      console.error("Error creating group:", error);
      setErrorMessage("Could not create the group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <h3 className="text-2xl"> You are not part of a group yet.</h3>
      <p>Create a group</p>
      <input
        type="text"
        placeholder="Group Name"
        className="input"
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void handleCreateGroup(newGroupName);
          }
        }}
      />
      {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}
      <button
        className="btn btn-primary"
        disabled={isCreating || !newGroupName.trim()}
        onClick={() => void handleCreateGroup(newGroupName)}
      >
        {isCreating && <span className="loading loading-spinner" />}
        {isCreating ? "Creating..." : "Create"}
      </button>
    </>
  );
}
