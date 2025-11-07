// 'use client';

// import {
//   Building2,
//   ChevronDown,
//   FileText,
//   Home,
//   Loader2,
//   LogOut,
//   Menu,
//   Package,
//   Settings,
//   ShoppingBag,
//   ShoppingCart,
//   TrendingUp,
//   TrendingUpDown,
//   Users,
//   X
// } from 'lucide-react';
// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import { useEffect, useRef, useState } from 'react';

// export default function Navbar() {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [isOpen, setIsOpen] = useState(false);
//   const [userMenuOpen, setUserMenuOpen] = useState(false);
//   const [managementMenuOpen, setManagementMenuOpen] = useState(false);
//   const [user, setUser] = useState<any>(null);
//   const [organization, setOrganization] = useState<any>(null);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);

//   const userMenuRef = useRef<HTMLDivElement>(null);
//   const managementMenuRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     // Load user and organization from localStorage
//     const userData = localStorage.getItem('user');
//     const orgData = localStorage.getItem('organization');

//     if (userData) {
//       try {
//         setUser(JSON.parse(userData));
//         // Reset dropdowns when user logs in
//         setUserMenuOpen(false);
//         setManagementMenuOpen(false);
//         setIsOpen(false);
//       } catch (e) {
//         console.error('Error parsing user data:', e);
//       }
//     }

//     if (orgData) {
//       try {
//         setOrganization(JSON.parse(orgData));
//       } catch (e) {
//         console.error('Error parsing organization data:', e);
//       }
//     }
//   }, []);

//   // Reset logout state when navigating to login/register pages
//   useEffect(() => {
//     if (pathname === '/login' || pathname === '/register' || pathname === '/reset-password') {
//       setIsLoggingOut(false);
//     }
//   }, [pathname]);

//   // Reset dropdown states when navigating to dashboard or any other page
//   useEffect(() => {
//     setUserMenuOpen(false);
//     setManagementMenuOpen(false);
//   }, [pathname]);

//   // Close dropdowns when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
//         setUserMenuOpen(false);
//       }
//       if (managementMenuRef.current && !managementMenuRef.current.contains(event.target as Node)) {
//         setManagementMenuOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   const handleLogout = async () => {
//     // Close all dropdowns immediately
//     setUserMenuOpen(false);
//     setManagementMenuOpen(false);
//     setIsOpen(false);
//     setIsLoggingOut(true);

//     // Simulate a small delay for better UX
//     await new Promise(resolve => setTimeout(resolve, 800));

//     localStorage.removeItem('accessToken');
//     localStorage.removeItem('refreshToken');
//     localStorage.removeItem('user');
//     localStorage.removeItem('organization');

//     // Reset all states before redirecting
//     setUserMenuOpen(false);
//     setManagementMenuOpen(false);
//     setIsOpen(false);

//     router.push('/login');
//   };

//   const isActive = (path: string) => {
//     return pathname === path || pathname?.startsWith(path + '/');
//   };

//   const navLinks = [
//     {
//       name: 'Dashboard',
//       href: '/dashboard',
//       icon: Home,
//     },
//     {
//       name: 'Sales',
//       href: '/dashboard/sales',
//       icon: TrendingUp,
//     },
//     {
//       name: 'Purchases',
//       href: '/dashboard/purchases',
//       icon: ShoppingBag,
//     },
//     {
//       name: 'Inventory',
//       href: '/dashboard/inventory',
//       icon: ShoppingBag,
//     },
//     {
//       name: 'Management',
//       icon: Settings,
//       submenu: [
//         { name: 'Customers', href: '/dashboard/management/customers', icon: Users },
//         { name: 'Products', href: '/dashboard/management/products', icon: Package },
//         { name: 'Promotions and offers', href: '/dashboard/management/promotions', icon: ShoppingBag },
//         { name: 'Vendors', href: '/dashboard/management/vendors', icon: Building2 },
//         { name: 'Users', href: '/dashboard/management/users', icon: Users },
//         { name: 'Edit Sales', href: '/dashboard/management/sales', icon: TrendingUpDown },
//         { name: 'Edit Purchases', href: '/dashboard/management/purchases', icon: ShoppingBag },
//       ],
//     },
//     {
//       name: 'Reports',
//       href: '/dashboard/reports',
//       icon: FileText,
//     },
//     {
//       name: 'Expenses',
//       href: '/dashboard/expenses',
//       icon: FileText,
//     },
//     {
//       name: 'Inventory',
//       href: '/dashboard/inventory',
//       icon: FileText,
//     },
//   ];

//   // Don't show navbar on login/register pages
//   if (pathname === '/login' || pathname === '/register' || pathname === '/reset-password') {
//     return null;
//   }

//   return (
//     <nav className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between h-16">
//           {/* Logo and Brand */}
//           <div className="flex items-center">
//             <Link href="/dashboard" className="flex items-center space-x-3">
//               <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
//                 <ShoppingCart className="w-6 h-6 text-white" />
//               </div>
//               <div className="hidden md:block">
//                 <h1 className="text-xl font-bold text-gray-900 dark:text-white">
//                   {organization?.name || 'Liquor POS'}
//                 </h1>
//                 <p className="text-xs text-gray-500 dark:text-gray-400">Point of Sale System</p>
//               </div>
//             </Link>
//           </div>

//           {/* Desktop Navigation */}
//           <div className="hidden md:flex items-center space-x-1">
//             {navLinks.map((link) => (
//               link.submenu ? (
//                 <div key={link.name} className="relative" ref={managementMenuRef}>
//                   <button
//                     onClick={() => setManagementMenuOpen(!managementMenuOpen)}
//                     className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname?.startsWith('/dashboard/management')
//                       ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
//                       : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
//                       }`}
//                   >
//                     <link.icon className="w-4 h-4" />
//                     <span>{link.name}</span>
//                     <ChevronDown className="w-4 h-4" />
//                   </button>

//                   {managementMenuOpen && (
//                     <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2">
//                       {link.submenu.map((sublink) => (
//                         <Link
//                           key={sublink.href}
//                           href={sublink.href}
//                           onClick={() => setManagementMenuOpen(false)}
//                           className={`flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${isActive(sublink.href)
//                             ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
//                             : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
//                             }`}
//                         >
//                           <sublink.icon className="w-4 h-4" />
//                           <span>{sublink.name}</span>
//                         </Link>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <Link
//                   key={link.name}
//                   href={link.href}
//                   className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
//                     ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
//                     : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
//                     }`}
//                 >
//                   <link.icon className="w-4 h-4" />
//                   <span>{link.name}</span>
//                 </Link>
//               )
//             ))}
//           </div>

//           {/* User Menu */}
//           <div className="flex items-center space-x-4">
//             {/* User Dropdown */}
//             <div className="relative" ref={userMenuRef}>
//               <button
//                 onClick={() => setUserMenuOpen(!userMenuOpen)}
//                 className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
//               >
//                 <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
//                   <span className="text-white text-sm font-semibold">
//                     {user?.name?.charAt(0).toUpperCase() || 'U'}
//                   </span>
//                 </div>
//                 <div className="hidden md:block text-left">
//                   <p className="text-sm font-medium text-gray-900 dark:text-white">
//                     {user?.name || 'User'}
//                   </p>
//                   <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
//                     {user?.role || 'User'}
//                   </p>
//                 </div>
//                 <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
//               </button>

//               {userMenuOpen && (
//                 <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2">
//                   <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
//                     <p className="text-sm font-medium text-gray-900 dark:text-white">
//                       {user?.name}
//                     </p>
//                     <p className="text-xs text-gray-500 dark:text-gray-400">
//                       {user?.email}
//                     </p>
//                   </div>

//                   <Link
//                     href="/dashboard/profile"
//                     onClick={() => setUserMenuOpen(false)}
//                     className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//                   >
//                     <Users className="w-4 h-4" />
//                     <span>Profile</span>
//                   </Link>

//                   <Link
//                     href="/dashboard/settings"
//                     onClick={() => setUserMenuOpen(false)}
//                     className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//                   >
//                     <Settings className="w-4 h-4" />
//                     <span>Settings</span>
//                   </Link>

//                   <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

//                   <button
//                     onClick={(e) => { e.stopPropagation(); setUserMenuOpen(false); handleLogout() }}
//                     className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
//                   >
//                     <LogOut className="w-4 h-4" />
//                     <span>Logout</span>
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* Mobile Menu Button */}
//             <button
//               onClick={() => setIsOpen(!isOpen)}
//               className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//             >
//               {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Mobile Navigation */}
//       {isOpen && (
//         <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
//           <div className="px-4 py-4 space-y-2">
//             {navLinks.map((link) => (
//               link.submenu ? (
//                 <div key={link.name}>
//                   <button
//                     onClick={() => setManagementMenuOpen(!managementMenuOpen)}
//                     className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
//                   >
//                     <div className="flex items-center space-x-3">
//                       <link.icon className="w-5 h-5" />
//                       <span className="font-medium">{link.name}</span>
//                     </div>
//                     <ChevronDown className={`w-4 h-4 transition-transform ${managementMenuOpen ? 'rotate-180' : ''}`} />
//                   </button>

//                   {managementMenuOpen && (
//                     <div className="ml-4 mt-2 space-y-1">
//                       {link.submenu.map((sublink) => (
//                         <Link
//                           key={sublink.href}
//                           href={sublink.href}
//                           onClick={() => {
//                             setIsOpen(false);
//                             setManagementMenuOpen(false);
//                           }}
//                           className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${isActive(sublink.href)
//                             ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
//                             : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
//                             }`}
//                         >
//                           <sublink.icon className="w-4 h-4" />
//                           <span>{sublink.name}</span>
//                         </Link>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <Link
//                   key={link.name}
//                   href={link.href}
//                   onClick={() => setIsOpen(false)}
//                   className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${isActive(link.href)
//                     ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
//                     : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
//                     }`}
//                 >
//                   <link.icon className="w-5 h-5" />
//                   <span className="font-medium">{link.name}</span>
//                 </Link>
//               )
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Fullscreen Logout Loader */}
//       {isLoggingOut && (
//         <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
//           <div className="text-center">
//             <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
//             <h2 className="text-2xl font-bold text-white mb-2">Logging Out...</h2>
//             <p className="text-blue-100">Please wait while we sign you out</p>
//           </div>
//         </div>
//       )}
//     </nav>
//   );
// }

'use client';

import {
  Building2,
  ChevronDown,
  FileText,
  Home,
  Loader2,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  TrendingUpDown,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [managementMenuOpen, setManagementMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const managementMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const orgData = localStorage.getItem('organization');
    if (userData) setUser(JSON.parse(userData));
    if (orgData) setOrganization(JSON.parse(orgData));
  }, []);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/register' || pathname === '/reset-password')
      setIsLoggingOut(false);
  }, [pathname]);

  useEffect(() => {
    setUserMenuOpen(false);
    setManagementMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node))
        setUserMenuOpen(false);
      if (managementMenuRef.current && !managementMenuRef.current.contains(event.target as Node))
        setManagementMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setManagementMenuOpen(false);
    setIsOpen(false);
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    localStorage.clear();
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const navLinks = [
    // { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Sales', href: '/dashboard/sales', icon: TrendingUp },
    { name: 'B2B', href: '/dashboard/b2b-sales', icon: TrendingUp },
    { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag },
    {
      name: 'Management',
      icon: Settings,
      submenu: [
        { name: 'Customers', href: '/dashboard/management/customers', icon: Users },
        { name: 'Products', href: '/dashboard/management/products', icon: Package },
        { name: 'Promotions', href: '/dashboard/management/promotions', icon: ShoppingBag },
        { name: 'Vendors', href: '/dashboard/management/vendors', icon: Building2 },
        { name: 'Users', href: '/dashboard/management/users', icon: Users },
        { name: 'Edit Sales', href: '/dashboard/management/sales', icon: TrendingUpDown },
        { name: 'Edit Purchases', href: '/dashboard/management/purchases', icon: ShoppingBag },
      ],
    },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'Expenses', href: '/dashboard/expenses', icon: FileText },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  ];

  if (['/login', '/register', '/reset-password'].includes(pathname)) return null;

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 transition-all">
      <div className=" mx-auto px-4 sm:px-2 lg:px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {organization?.name || 'Liquor POS'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Point of Sale</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) =>
              link.submenu ? (
                <div key={link.name} className="relative" ref={managementMenuRef}>
                  <button
                    onClick={() => setManagementMenuOpen(!managementMenuOpen)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                      pathname.startsWith('/dashboard/management')
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        managementMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {managementMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 animate-fade-in">
                      {link.submenu.map((sublink) => (
                        <Link
                          key={sublink.href}
                          href={sublink.href}
                          onClick={() => setManagementMenuOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-3 text-sm transition ${
                            isActive(sublink.href)
                              ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <sublink.icon className="w-4 h-4" />
                          <span>{sublink.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive(link.href)
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              )
            )}
          </div>

          {/* User + Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Users className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/dashboard/organization-settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Org Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        } bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700`}
      >
        <div className="px-4 py-3 space-y-1">
          {navLinks.map((link) =>
            link.submenu ? (
              <div key={link.name}>
                <button
                  onClick={() => setManagementMenuOpen(!managementMenuOpen)}
                  className="flex justify-between w-full px-3 py-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <link.icon className="w-5 h-5" />
                    <span>{link.name}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      managementMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {managementMenuOpen && (
                  <div className="ml-6 mt-1 space-y-1">
                    {link.submenu.map((sublink) => (
                      <Link
                        key={sublink.href}
                        href={sublink.href}
                        onClick={() => {
                          setIsOpen(false);
                          setManagementMenuOpen(false);
                        }}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-md ${
                          isActive(sublink.href)
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <sublink.icon className="w-4 h-4" />
                        <span>{sublink.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-md ${
                  isActive(link.href)
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.name}</span>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Logout Loader */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Logging Out...</h2>
            <p className="text-blue-100">Please wait while we sign you out</p>
          </div>
        </div>
      )}
    </nav>
  );
}
