import { Link } from "react-router-dom";
import { Shield, Bell, HelpCircle, ChevronDown, MapPin } from "lucide-react";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE_BY_ID } from "@/types/rbac";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GovtMasthead() {
  const { user } = useSessionStore();
  const role = ROLE_BY_ID[user.roleId];
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-40 gov-masthead">
      <div className="gov-tricolor" aria-hidden />
      {/* slim gov strip */}
      <div className="hidden sm:flex h-6 items-center bg-[#0F2340] text-white text-[11px] tracking-wide">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4">
          <span className="opacity-90">भारत सरकार — Government of India &nbsp;|&nbsp; भूमि संसाधन विभाग — Department of Land Resources</span>
          <span className="flex items-center gap-3 opacity-80">
            <span>RFCTLARR Act, 2013</span>
            <span className="h-3 w-px bg-white/30" />
            <Link to="/" className="hover:underline">Switch role</Link>
          </span>
        </div>
      </div>
      {/* main masthead */}
      <div className="mx-auto flex h-[56px] max-w-[1600px] items-center justify-between gap-4 px-4">
        <Link to="/app/overview" className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0F2340] text-white shrink-0">
            <Shield className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-[15px] font-bold tracking-tight text-[#0F2340]">TERRANEX</span>
              <Badge variant="muted" className="hidden sm:inline-flex text-[10px] leading-none">V2 Mock</Badge>
            </span>
            <span className="hidden sm:block text-[11px] leading-none text-muted-foreground">National Land Acquisition Operating System &nbsp;·&nbsp; DoLR</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* jurisdiction */}
          <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700">
            <MapPin className="h-3.5 w-3.5 text-slate-500" />
            {user.jurisdiction}
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex text-[11px]" style={{ borderLeft: `3px solid ${role?.color ?? "#0F2340"}` }}>
            {role?.shortLabel ?? user.roleId}
          </Badge>

          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Notifications" asChild>
            <Link to="/app/notifications">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border bg-white pl-1 pr-2 py-1 text-left hover:bg-slate-50">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-xs leading-tight">
                  <span className="block font-medium text-[#0F2340]">{user.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{role?.shortLabel}</span>
                </span>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block text-xs font-semibold">{user.name}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">{role?.label}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">{user.jurisdiction}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/">Switch role</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Profile & preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Sign out (mock)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
