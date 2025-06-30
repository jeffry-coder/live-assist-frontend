import { RadioIcon, HistoryIcon, ChevronRightIcon } from "lucide-react";
import iconSvg from "../assets/icon.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "../../components/ui/sidebar";

interface AppSidebarProps {
  activeItem: string;
  onItemSelect: (item: string) => void;
}

const menuItems = [
  {
    title: "Live",
    value: "live",
    icon: RadioIcon,
  },
  {
    title: "History",
    value: "history",
    icon: HistoryIcon,
  },
];

export function AppSidebar({ activeItem, onItemSelect }: AppSidebarProps) {
  return (
    <Sidebar collapsible="none" className="border-r h-screen w-56">
      <SidebarHeader>
        <div className="px-2 py-2">
          <div className="flex items-center gap-2">
            <img src={iconSvg} alt="Live Assist" className="w-10 h-10" />
            <h2 className="text-lg font-semibold">Live Assist</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onItemSelect(item.value)}
                    isActive={activeItem === item.value}
                    tooltip={item.title}
                    className={`justify-between ${
                      activeItem === item.value
                        ? "bg-primary text-primary-foreground font-semibold border-l-4 border-primary"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon />
                      <span>{item.title}</span>
                    </div>
                    <ChevronRightIcon className="h-4 w-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
