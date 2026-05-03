export const Avatar: React.FC<{
  imageUrl?: string;
  name: string;
  isLarge?: boolean;
}> = ({ imageUrl, name, isLarge = false }) => {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!imageUrl) {
    return (
      <div
        className={`avatar avatar-placeholder ${isLarge ? "w-16 h-16" : "w-8 h-8"}`}
      >
        <div className="bg-neutral text-neutral-content w-full h-full rounded-full flex items-center justify-center">
          <span className={isLarge ? "text-lg" : "text-xs"}>{initials}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="avatar">
      <div className={`w-8 rounded-full ${isLarge ? "w-16 h-16" : "w-8 h-8"}`}>
        <img src={imageUrl} />
      </div>
    </div>
  );
};
