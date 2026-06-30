import { Outlet, useLoaderData, useRouteError, useLocation, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

// Navigation items config
const NAV_ITEMS = [
  { href: "/app", icon: "dashboard", label: "Dashboard" },
  { href: "/app/cart-customizer", icon: "palette", label: "Cart Customizer" },
  { href: "/app/upsell-rules", icon: "trending_up", label: "Upsell Rules" },
  { href: "/app/progress-bar", icon: "sports_score", label: "Progress Bar" },
  { href: "/app/free-gifts", icon: "redeem", label: "Free Gifts" },
  { href: "/app/discounts", icon: "sell", label: "Discounts" },
  { href: "/app/urgency", icon: "timer", label: "Urgency & Timers" },
  { href: "/app/fraud-settings", icon: "shield", label: "Fraud Settings" },
  { href: "/app/analytics", icon: "bar_chart", label: "Analytics" },
  { href: "/app/billing", icon: "payments", label: "Plan & Billing" },
];

// Mobile bottom nav (subset of items)
const BOTTOM_NAV_ITEMS = [
  { href: "/app", icon: "home", label: "Home" },
  { href: "/app/analytics", icon: "trending_up", label: "Metrics" },
  { href: "/app/upsell-rules", icon: "inventory", label: "Upsells" },
  { href: "/app/cart-customizer", icon: "palette", label: "Customize" },
];

function NavItem({ href, icon, label, isActive }) {
  return (
    <Link
      to={href}
      className={`nav-item ${isActive ? "nav-item--active" : "nav-item--inactive"}`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-body text-body-md">{label}</span>
    </Link>
  );
}

function BottomNavItem({ href, icon, label, isActive }) {
  return (
    <Link
      to={href}
      className={`flex flex-col items-center justify-center active:scale-90 duration-200 ${
        isActive
          ? "bg-primary-container text-on-primary-container rounded-full px-4 py-1"
          : "text-on-surface-variant hover:text-primary transition-colors"
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-label text-label-sm">{label}</span>
    </Link>
  );
}

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();

  // Determine active route for nav highlighting
  const isActive = (href) => {
    if (href === "/app") return location.pathname === "/app" || location.pathname === "/app/";
    return location.pathname.startsWith(href);
  };

  return (
    <AppProvider embedded apiKey={apiKey}>
      {/* ─── Top App Bar ─── */}
      <header className="bg-surface-container-lowest text-primary w-full top-0 sticky border-b border-outline-variant shadow-sm z-40 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined btn-icon md:hidden">
            menu
          </button>
          <h1 className="font-headline text-headline-md font-bold text-primary">
            SwiftCart
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="material-symbols-outlined btn-icon">
            notifications
          </button>
          <button className="material-symbols-outlined btn-icon">
            help_outline
          </button>
        </div>
      </header>

      <div className="flex">
        {/* ─── Desktop Sidebar Navigation ─── */}
        <aside className="hidden md:flex h-[calc(100vh-56px)] w-64 flex-col gap-2 p-4 bg-surface-container-lowest border-r border-outline-variant shadow-md sticky top-14 overflow-y-auto custom-scrollbar">
          {/* Store identity */}
          <div className="flex items-center gap-3 p-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm">
              SC
            </div>
            <div>
              <p className="font-body text-sm text-on-surface font-bold">Store Admin</p>
              <p className="text-label-sm text-on-surface-variant">Merchant</p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href)}
              />
            ))}
          </nav>
        </aside>

        {/* ─── Main Content Area ─── */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden mb-20 md:mb-0 min-h-[calc(100vh-56px)]">
          <Outlet />
        </main>
      </div>

      {/* ─── Mobile Bottom Navigation ─── */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface-container-lowest border-t border-outline-variant shadow-nav flex justify-around items-center h-16 px-4 pb-safe">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <BottomNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.href)}
          />
        ))}
      </nav>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
