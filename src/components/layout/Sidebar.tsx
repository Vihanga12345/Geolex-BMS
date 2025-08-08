import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Users, 
  Menu, 
  TrendingUp, 
  Settings,
  Home,
  LogOut,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  moduleKey?: string;
  requireManager?: boolean;
}

// Store the sidebar state in localStorage for persistence
const STORAGE_KEY = 'sidebar_collapsed';

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed: externalCollapsed, 
  onToggleCollapse 
}) => {
  // Initialize with localStorage value or default to false
  const storedCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  const [collapsed, setCollapsed] = useState(externalCollapsed !== undefined ? externalCollapsed : storedCollapsed);
  const { currentUser, hasModuleAccess, hasManagerAccess, signOut } = useERPAuth();
  const location = useLocation();

  // Navigation items with module permissions
  const navigationItems: NavItem[] = [
    {
      title: 'Dashboard',
      path: '/',
      icon: <Home size={22} />,
    },
    {
      title: 'Sales',
      path: '/sales',
      icon: <ShoppingCart size={22} />,
      moduleKey: 'sales',
    },
    {
      title: 'Inventory',
      path: '/inventory',
      icon: <Package size={22} />,
      moduleKey: 'inventory',
    },
    {
      title: 'Procurement',
      path: '/procurement',
      icon: <Truck size={22} />,
      moduleKey: 'procurement',
    },
    {
      title: 'Finance',
      path: '/financials',
      icon: <DollarSign size={22} />,
      moduleKey: 'finance',
    },
    {
      title: 'User Management',
      path: '/users',
      icon: <Users size={22} />,
      requireManager: true,
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: <Settings size={22} />,
    },
  ];

  // Filter navigation items based on user permissions
  const filteredNavItems = navigationItems.filter(item => {
    // Always show dashboard and settings
    if (!item.moduleKey && !item.requireManager) {
      return true;
    }
    
    // Check manager access
    if (item.requireManager) {
      return hasManagerAccess();
    }
    
    // Check module access
    if (item.moduleKey) {
      return hasModuleAccess(item.moduleKey);
    }
    
    return true;
  });
  
  // Sync with external collapsed state if provided
  useEffect(() => {
    if (externalCollapsed !== undefined && externalCollapsed !== collapsed) {
      setCollapsed(externalCollapsed);
      localStorage.setItem(STORAGE_KEY, externalCollapsed.toString());
    }
  }, [externalCollapsed]);

  const handleToggleCollapse = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    // Save to localStorage for persistence
    localStorage.setItem(STORAGE_KEY, newCollapsedState.toString());
    if (onToggleCollapse) {
      onToggleCollapse(newCollapsedState);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <div 
      className={cn(
        "h-screen bg-gray-900 fixed top-0 left-0 z-40 transition-all duration-300 ease-in-out border-r border-gray-700 shadow-sm",
        "hidden md:block", // Hide on mobile, show on desktop
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      {/* Mobile sidebar toggle */}
      <div className="absolute right-4 top-4 block md:hidden">
        <button 
          onClick={handleToggleCollapse}
          className="p-2 rounded-md hover:bg-gray-700 text-white"
        >
          <Menu size={20} />
        </button>
      </div>
      
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-gray-700",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <span className="text-xl font-semibold tracking-tight text-white animate-fade-in">ERP System</span>
        )}
        
        {/* Collapse button */}
        <button 
          onClick={handleToggleCollapse}
          className={cn(
            "p-1.5 rounded-md hover:bg-gray-700 transition-all duration-300 ease-in-out text-white",
            collapsed ? "rotate-180" : ""
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User Info */}
      {currentUser && !collapsed && (
        <div className="px-4 py-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {currentUser.first_name.charAt(0)}{currentUser.last_name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {currentUser.first_name} {currentUser.last_name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {currentUser.role === 'manager' ? 'Manager' : 'Employee'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Info (collapsed) */}
      {currentUser && collapsed && (
        <div className="px-2 py-4 border-b border-gray-700 flex justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {currentUser.first_name.charAt(0)}{currentUser.last_name.charAt(0)}
            </span>
          </div>
        </div>
      )}
      
      {/* Navigation Links */}
      <nav className="py-4 px-2 flex-1">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                    "hover:bg-gray-700 group",
                    isActive ? 
                      "bg-blue-600 text-white font-medium" : 
                      "text-gray-300 hover:text-white",
                    collapsed ? "justify-center" : ""
                  )}
                >
                  <span className="transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </span>
                  
                  {!collapsed && (
                    <span className="animate-fade-in">{item.title}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign Out Button */}
      <div className="border-t border-gray-700 p-2">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full text-gray-300 hover:text-white hover:bg-gray-700",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
