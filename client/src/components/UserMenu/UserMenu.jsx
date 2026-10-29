import { Logout01Icon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetMeQuery } from "../../app/api.js";
import { Icon } from "../Icon/Icon.jsx";

export const UserMenu = ({ onLogout }) => {
  const { data: me } = useGetMeQuery();
  const displayName = me?.name || me?.email || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Konto"
        className="shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Avatar size="lg">
          {me?.avatarUrl ? (
            <AvatarImage src={me.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : null}
          <AvatarFallback className="bg-primary/20 font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          {me?.name ? <span className="text-sm text-foreground">{me.name}</span> : null}
          <span className="truncate">{me?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout}>
          <Icon icon={Logout01Icon} size={16} />
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
