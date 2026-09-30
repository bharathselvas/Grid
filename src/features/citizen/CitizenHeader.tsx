import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCitizenSession } from "./citizenSessionStore";
import { Menu, X, Globe, LogIn, LogOut, User, Bell } from "lucide-react";
import { CITIZEN_NOTIFICATIONS } from "./citizenData";

const PUBLIC_NAV = [
  { to: "/citizen", label: "Home" },
  { to: "/citizen/status", label: "Check Status" },
  { to: "/citizen/notices", label: "Notices" },
  { to: "/citizen/transparency", label: "Transparency" },
  { to: "/citizen/help", label: "Help" },
];

const PRIVATE_NAV = [
  { to: "/citizen/my-case", label: "My Case" },
  { to: "/citizen/my-case/documents", label: "Documents" },
  { to: "/citizen/objections", label: "Objections" },
  { to: "/citizen/grievances", label: "Grievances" },
];

export function CitizenHeader() {
  const { isAuthenticated, logout } = useCitizenSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const unreadCount = CITIZEN_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      {/* Tricolor bar */}
      <div className="h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      {/* Government branding */}
      <div className="bg-[#0F2340] text-white px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">भा</div>
            <div>
              <p className="text-[10px] leading-tight opacity-80">भारत सरकार / Government of India</p>
              <p className="text-[10px] leading-tight opacity-80">भूमि संसाधन विभाग / Department of Land Resources</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <Globe className="h-3 w-3" />
            <button className="hover:underline">English</button>
            <span className="opacity-50">|</span>
            <button className="hover:underline">हिंदी</button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/citizen" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#0F2340]">TERRANEX</span>
            <span className="hidden sm:inline text-xs text-muted-foreground">Land Acquisition Information & Citizen Services</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {(isAuthenticated ? [...PUBLIC_NAV.filter((n) => n.to !== "/citizen"), ...PRIVATE_NAV] : PUBLIC_NAV).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  location.pathname === n.to || (n.to !== "/citizen" && location.pathname.startsWith(n.to))
                    ? "bg-[#0F2340] text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Link to="/citizen/notifications" className="relative p-1.5 hover:bg-slate-100 rounded">
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
                )}
              </Link>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="h-4 w-4" /> Demo Landowner
                </span>
                <button onClick={logout} className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-slate-50">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            ) : (
              <Link to="/citizen/login" className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#0F2340] text-white rounded hover:bg-[#1a365d]">
                <LogIn className="h-4 w-4" /> Landowner Login
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-1.5 hover:bg-slate-100 rounded">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden mt-3 pb-2 border-t pt-3 space-y-1">
            {(isAuthenticated ? [...PUBLIC_NAV.filter((n) => n.to !== "/citizen"), ...PRIVATE_NAV] : PUBLIC_NAV).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm ${
                  location.pathname === n.to ? "bg-[#0F2340] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
