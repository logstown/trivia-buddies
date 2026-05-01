"use client";

import {
  Authenticated,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { OpenTDBCategory } from "../convex/opentdb";
import { TodaysQuestion } from "./TodaysQuestion";

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="font-bold">
            Trivia Buddies
          </NavLink>
          <nav className="flex items-center gap-4 text-sm">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/leaderboard">Leaderboard</NavItem>
            <NavItem to="/profile">Profile</NavItem>
          </nav>
        </div>
        <UserButton />
      </header>
      <main className="p-8">
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
        <Authenticated>
          <UserSync />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/join-group/:groupId" element={<JoinGroup />} />
            <Route path="/your-next-category" element={<YourNextCategory />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Authenticated>
      </main>
    </>
  );
}

function UserSync() {
  const syncUser = useMutation(api.users.upsertCurrentUser);

  useEffect(() => {
    syncUser({});
  }, [syncUser]);

  return null;
}

function JoinGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  if (!groupId) return <Navigate to="/" replace />;

  const group = useQuery(api.group.getGroupById, {
    groupId: groupId as Id<"groups">,
  });
  const joinGroup = useMutation(api.group.joinGroup);

  const handleJoinGroup = async (groupId: Id<"groups">) => {
    try {
      await joinGroup({ groupId });
      navigate("/");
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  if (!group) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
        <h1 className="text-4xl font-bold">Group Not Found</h1>
        <p className="">The group you are trying to join does not exist.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
      <h1 className="text-4xl font-bold">Joining a Group...</h1>
      <p className="">
        {group
          ? `${group.hostName} is inviting you to join ${group.name}`
          : "Loading group information..."}
      </p>
      <button
        className="btn btn-xl btn-primary"
        onClick={() => handleJoinGroup(groupId as Id<"groups">)}
      >
        Join Group
      </button>
    </section>
  );
}

function NavItem({ children, to }: { children: ReactNode; to: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-2 transition-colors",
          isActive
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

function HomePage() {
  const [newGroupName, setNewGroupName] = useState("");
  const user = useQuery(api.users.getCurrentUser);
  const group = useQuery(api.group.getGroupByUser, user ? {} : "skip");
  const createGroup = useMutation(api.group.createGroup);
  const startGame = useMutation(api.group.startGame);
  const addQuestion = useAction(api.questions.addNewQuestion);

  if (group === undefined) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        <h1 className="text-3xl font-bold">
          Loading your group information...
        </h1>
      </section>
    );
  }

  const handleCreateGroup = async (name: string) => {
    try {
      const groupId = await createGroup({ name });
      console.log("Group created with ID:", groupId);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
      {group ? (
        group.isReady ? (
          <TodaysQuestion />
        ) : (
          <>
            {group.isUserHost ? (
              <>
                <h1 className="text-3xl font-bold">
                  You Created {group.name}!
                </h1>
                <p className="">
                  Share this link with your friends to join the group:
                </p>
                <code className="rounded px-2 py-1">
                  {window.location.origin}/join-group/{group._id}
                </code>
                <button className="btn btn-primary" onClick={() => startGame()}>
                  Start Game
                </button>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">You are in {group.name}!</h1>
                <p className="">
                  Waiting for {group.hostName} to start the game...
                </p>
              </>
            )}
            <ul className="list bg-base-100 rounded-box shadow-md">
              <li className="p-4 pb-2 text-xs opacity-60 tracking-wide">
                Members
              </li>
              {group.users.map((user) => (
                <li key={user._id} className="list-row">
                  <div>
                    <img
                      className="size-10 rounded-box"
                      src={
                        user.imageUrl ||
                        "https://img.daisyui.com/images/profile/demo/1@94.webp"
                      }
                    />
                  </div>
                  <div className="flex items-center">
                    <div>{user.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <>
          <h3 className="text-2xl"> You are not part of a group yet.</h3>
          <p>Create a group</p>
          <input
            type="text"
            placeholder="Group Name"
            className="input"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleCreateGroup(newGroupName)}
          >
            Create
          </button>
        </>
      )}
    </section>
  );
}

function YourNextCategory() {
  const user = useQuery(api.users.getCurrentUser);
  const fetchCategories = useAction(api.opentdb.fetchCategories);
  const updateNextCategory = useMutation(api.users.updateNextCategory);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<OpenTDBCategory[]>([]);
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    setSelectedCategory(user?.nextCategory ?? null);
  }, [user]);

  useEffect(() => {
    fetchCategories().then((categories) => {
      setCategories(categories);
    });
  }, [fetchCategories]);

  if (!user) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
        <h1 className="text-3xl font-bold">Not Authenticated</h1>
        <p className="">Please sign in to see your next category.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-8">
      <h1 className="text-3xl font-bold">Your Next Category Is...</h1>
      <select
        className="select select-bordered w-full max-w-xs"
        value={selectedCategory ?? ""}
        onChange={(e) => {
          setSelectedCategory(e.target.value ? parseInt(e.target.value) : null);
          setShowSave(true);
        }}
      >
        <option value="">Random</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      {showSave && (
        <button
          className="btn btn-primary"
          onClick={async () => {
            console.log(selectedCategory);
            await updateNextCategory({
              nextCategory: selectedCategory ?? undefined,
            });
            setShowSave(false);
          }}
        >
          Save
        </button>
      )}
    </section>
  );
}

function LeaderboardPage() {
  const samplePlayers = [
    { name: "Ada", score: 1420 },
    { name: "Grace", score: 1285 },
    { name: "Linus", score: 1160 },
  ];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="">Example route for future score data.</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        {samplePlayers.map((player, index) => (
          <div
            key={player.name}
            className="flex items-center justify-between border-b border-slate-200 p-4 last:border-b-0 dark:border-slate-800"
          >
            <span>
              {index + 1}. {player.name}
            </span>
            <strong>{player.score.toLocaleString()} pts</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="">Example route for account and trivia preferences.</p>
      </div>
      <Authenticated>
        <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
          Profile details can go here.
        </div>
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </section>
  );
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Log in to see the numbers</p>
      <SignInButton mode="modal">
        <button className="btn btn-xl btn-primary">Sign in</button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="btn btn-xl btn-soft">Sign up</button>
      </SignUpButton>
    </div>
  );
}
