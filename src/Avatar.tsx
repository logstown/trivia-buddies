export const Avatar: React.FC<{ imageUrl?: string; name: string }> = ({
  imageUrl,
  name,
}) => {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!imageUrl) {
    return (
      <div className="avatar avatar-placeholder">
        <div className="bg-neutral text-neutral-content w-8 rounded-full">
          <span className="text-xs">{initials}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="avatar">
      <div className="w-8 rounded-full">
        <img src={imageUrl} />
      </div>
    </div>
  );
};
