import { useState } from "react";

import {
    Bell,
    Building2,
    CalendarDays,
    ClipboardList,
    Home,
    LogOut,
    Menu,
    Shield,
    Users,
    UserRound,
    Activity,
} from "lucide-react";

import {
    Routes,
    Route,
    Navigate,
    useNavigate,
} from "react-router-dom";

import "./index.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResidentsPage from "./ResidentsPage";
import VisitorsPage from "./VisitorsPage";
import VisitsPage from "./pages/VisitsPage";
import SecurityPage from "./pages/SecurityPage.jsx";
import ReportsPage from "./pages/ReportPage.jsx";
import ActivityLogs from "./pages/ActivityLogs.jsx";

import ProtectedRoute from "./components/ProtectedRoute";

import { useAuth } from "./context/AuthContext";

import ResidentProfilePage from "./pages/ResidentProfilePage";
import ResidentVisitorsPage from "./pages/ResidentVisitorsPage";
import ResidentVisitsPage from "./pages/ResidentVisitsPage";


/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({
                     activePage,
                     setActivePage,
                     mobile = false,
                     closeMobileMenu,
                 }) {

    const navigate = useNavigate();

    const { user, logout } = useAuth();

    const role = user?.role || "ROLE_USER";

    const isAdmin =
        role === "ROLE_ADMIN";

    const isSecurity =
        role === "ROLE_SECURITY";

    const isResident =
        role === "ROLE_RESIDENT";


    /* =====================================================
       ADMIN NAVIGATION
       ===================================================== */

    const adminNavigation = [

        {
            name: "Dashboard",
            icon: <Home size={20} />,
            path: "/",
        },

        {
            name: "Residents",
            icon: <Users size={20} />,
            path: "/residents",
        },

        {
            name: "Visitors",
            icon: <UserRound size={20} />,
            path: "/visitors",
        },

        {
            name: "Visits",
            icon: <CalendarDays size={20} />,
            path: "/visits",
        },

        {
            name: "Security",
            icon: <Shield size={20} />,
            path: "/security",
        },

        {
            name: "Reports",
            icon: <ClipboardList size={20} />,
            path: "/reports",
        },

        {
            name: "Activity Logs",
            icon: <Activity size={20} />,
            path: "/activity-logs",
        },

    ];


    /* =====================================================
       SECURITY NAVIGATION
       ===================================================== */

    const securityNavigation = [

        {
            name: "Dashboard",
            icon: <Home size={20} />,
            path: "/",
        },

        {
            name: "Visitors",
            icon: <UserRound size={20} />,
            path: "/visitors",
        },

        {
            name: "Visits",
            icon: <CalendarDays size={20} />,
            path: "/visits",
        },

        {
            name: "Security",
            icon: <Shield size={20} />,
            path: "/security",
        },

        {
            name: "Activity Logs",
            icon: <Activity size={20} />,
            path: "/activity-logs",
        },

    ];


    /* =====================================================
       RESIDENT NAVIGATION
       ===================================================== */

    const residentNavigation = [

        {
            name: "Dashboard",
            icon: <Home size={20} />,
            path: "/",
        },

        {
            name: "My Profile",
            icon: <UserRound size={20} />,
            path: "/resident/profile",
        },

        {
            name: "My Visitors",
            icon: <Users size={20} />,
            path: "/resident/visitors",
        },

        {
            name: "My Visits",
            icon: <CalendarDays size={20} />,
            path: "/resident/visits",
        },

    ];


    /* =====================================================
       SELECT NAVIGATION BASED ON ROLE
       ===================================================== */

    const navigation = isAdmin
        ? adminNavigation
        : isSecurity
            ? securityNavigation
            : isResident
                ? residentNavigation
                : [];


    /* =====================================================
       NAVIGATION HANDLER
       ===================================================== */

    function handleNavigation(item) {

        setActivePage(item.name);

        navigate(item.path);

        if (
            mobile &&
            closeMobileMenu
        ) {
            closeMobileMenu();
        }
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    function handleLogout() {

        logout();

        if (
            mobile &&
            closeMobileMenu
        ) {
            closeMobileMenu();
        }

        navigate(
            "/login",
            {
                replace: true,
            }
        );
    }


    return (

        <aside className="sidebar">


            {/* =================================================
               BRAND
               ================================================= */}

            <div className="sidebar-brand">

                <div className="brand-mark">
                    EF
                </div>

                <div>

                    <strong>
                        EstateFlow
                    </strong>

                    <span>
                        Estate management
                    </span>

                </div>

            </div>


            {/* =================================================
               MENU LABEL
               ================================================= */}

            <div className="menu-label">

                {isSecurity
                    ? "SECURITY OPERATIONS"
                    : isResident
                        ? "RESIDENT PORTAL"
                        : "MAIN MENU"}

            </div>


            {/* =================================================
               NAVIGATION
               ================================================= */}

            <nav className="sidebar-nav">

                {navigation.map((item) => (

                    <button
                        key={item.name}
                        type="button"
                        className={`nav-item ${
                            activePage === item.name
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleNavigation(item)
                        }
                    >

                        {item.icon}

                        <span>
                            {item.name}
                        </span>

                    </button>

                ))}

            </nav>


            {/* =================================================
               LOGOUT
               ================================================= */}

            <div className="sidebar-bottom">

                <button
                    type="button"
                    className="nav-item logout-item"
                    onClick={handleLogout}
                >

                    <LogOut size={20} />

                    <span>
                        Logout
                    </span>

                </button>

            </div>

        </aside>
    );
}


/* =========================================================
   HEADER
   ========================================================= */

function Header({
                    setMobileMenu,
                }) {

    const { user } = useAuth();

    const username =
        user?.username || "User";

    const role =
        user?.role || "ROLE_USER";

    const firstLetter =
        username
            ?.charAt(0)
            ?.toUpperCase() || "U";

    const displayRole =
        role.replace(
            "ROLE_",
            ""
        );


    return (

        <header className="topbar">


            {/* =================================================
               MOBILE MENU BUTTON
               ================================================= */}

            <div className="mobile-menu-button">

                <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                        setMobileMenu(true)
                    }
                >

                    <Menu size={21} />

                </button>

            </div>


            {/* =================================================
               TOPBAR BRAND
               ================================================= */}

            <div className="topbar-brand">

                <strong>
                    EstateFlow
                </strong>

                <span>
                    Estate management platform
                </span>

            </div>


            {/* =================================================
               USER AREA
               ================================================= */}

            <div className="topbar-right">


                <button
                    type="button"
                    className="notification-button"
                >

                    <Bell size={20} />

                    <span />

                </button>


                <div className="user-profile">

                    <div className="avatar">

                        {firstLetter}

                    </div>


                    <div className="user-info">

                        <strong>
                            {username}
                        </strong>

                        <span>
                            {displayRole}
                        </span>

                    </div>

                </div>

            </div>

        </header>
    );
}


/* =========================================================
   MAIN LAYOUT
   ========================================================= */

function MainLayout() {

    const { user } = useAuth();

    const role =
        user?.role || "ROLE_USER";

    const isAdmin =
        role === "ROLE_ADMIN";

    const isSecurity =
        role === "ROLE_SECURITY";

    const isResident =
        role === "ROLE_RESIDENT";


    const [activePage, setActivePage] =
        useState("Dashboard");


    const [mobileMenu, setMobileMenu] =
        useState(false);


    /* =====================================================
       ALLOWED PATHS
       ===================================================== */

    const securityAllowedPaths = [

        "/",
        "/visitors",
        "/visits",
        "/security",
        "/activity-logs",

    ];


    const adminAllowedPaths = [

        "/",
        "/residents",
        "/visitors",
        "/visits",
        "/security",
        "/reports",
        "/activity-logs",

    ];


    const residentAllowedPaths = [

        "/",
        "/resident/profile",
        "/resident/visitors",
        "/resident/visits",

    ];


    /* =====================================================
       PATH AUTHORIZATION
       ===================================================== */

    function isPathAllowed(path) {

        if (isAdmin) {

            return adminAllowedPaths.includes(
                path
            );

        }


        if (isSecurity) {

            return securityAllowedPaths.includes(
                path
            );

        }


        if (isResident) {

            return residentAllowedPaths.includes(
                path
            );

        }


        return path === "/";
    }


    return (

        <div className="app">


            {/* =================================================
               MOBILE OVERLAY
               ================================================= */}

            {mobileMenu && (

                <div
                    className="mobile-overlay"
                    onClick={() =>
                        setMobileMenu(false)
                    }
                />

            )}


            {/* =================================================
               MOBILE SIDEBAR
               ================================================= */}

            <div
                className={`mobile-sidebar ${
                    mobileMenu
                        ? "open"
                        : ""
                }`}
            >

                <Sidebar
                    activePage={activePage}
                    setActivePage={
                        setActivePage
                    }
                    mobile={true}
                    closeMobileMenu={() =>
                        setMobileMenu(false)
                    }
                />

            </div>


            {/* =================================================
               DESKTOP SIDEBAR
               ================================================= */}

            <div className="desktop-sidebar">

                <Sidebar
                    activePage={activePage}
                    setActivePage={
                        setActivePage
                    }
                />

            </div>


            {/* =================================================
               MAIN CONTENT
               ================================================= */}

            <main className="main-content">


                <Header
                    setMobileMenu={
                        setMobileMenu
                    }
                />


                <div className="content-area">

                    <Routes>


                        {/* =================================================
                           DASHBOARD
                           ================================================= */}

                        <Route
                            path="/"
                            element={
                                <Dashboard />
                            }
                        />


                        {/* =================================================
                           ADMIN / SECURITY VISITORS
                           ================================================= */}

                        <Route
                            path="/visitors"
                            element={
                                isPathAllowed(
                                    "/visitors"
                                ) ? (
                                    <VisitorsPage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           ADMIN RESIDENTS
                           ================================================= */}

                        <Route
                            path="/residents"
                            element={
                                isPathAllowed(
                                    "/residents"
                                ) ? (
                                    <ResidentsPage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           VISITS
                           ================================================= */}

                        <Route
                            path="/visits"
                            element={
                                isPathAllowed(
                                    "/visits"
                                ) ? (
                                    <VisitsPage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           SECURITY
                           ================================================= */}

                        <Route
                            path="/security"
                            element={
                                isPathAllowed(
                                    "/security"
                                ) ? (
                                    <SecurityPage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           REPORTS
                           ================================================= */}

                        <Route
                            path="/reports"
                            element={
                                isPathAllowed(
                                    "/reports"
                                ) ? (
                                    <ReportsPage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           ACTIVITY LOGS
                           ================================================= */}

                        <Route
                            path="/activity-logs"
                            element={
                                isPathAllowed(
                                    "/activity-logs"
                                ) ? (
                                    <ActivityLogs />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           RESIDENT PROFILE
                           ================================================= */}

                        <Route
                            path="/resident/profile"
                            element={
                                isPathAllowed(
                                    "/resident/profile"
                                ) ? (
                                    <ResidentProfilePage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           RESIDENT VISITORS
                           ================================================= */}

                        <Route
                            path="/resident/visitors"
                            element={
                                isPathAllowed(
                                    "/resident/visitors"
                                ) ? (
                                    <ResidentVisitorsPage />
                                ) : (
                                    <Navigate
                                        to="/"
                                        replace
                                    />
                                )
                            }
                        />


                        {/* =================================================
                           RESIDENT VISITS
                           ================================================= */}

                        <Route
                            path="/resident/visits"
                            element={
                                isPathAllowed("/resident/visits") ? (
                                    <ResidentVisitsPage />
                                ) : (
                                    <Navigate to="/" replace />
                                )
                            }
                        />


                        {/* =================================================
                           UNKNOWN ROUTES
                           ================================================= */}

                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to="/"
                                    replace
                                />
                            }
                        />

                    </Routes>

                </div>

            </main>

        </div>
    );
}


/* =========================================================
   COMING SOON PAGE
   ========================================================= */

function ComingSoonPage({
                            title,
                        }) {

    return (

        <div className="coming-soon">

            <div className="coming-icon">

                <Building2 size={30} />

            </div>


            <div className="eyebrow">
                ESTATEFLOW
            </div>


            <h1>
                {title}
            </h1>


            <p>
                This module is being connected
                to the EstateFlow backend.
            </p>

        </div>
    );
}


/* =========================================================
   PROTECTED LAYOUT
   ========================================================= */

function ProtectedLayout() {

    return (

        <ProtectedRoute>

            <MainLayout />

        </ProtectedRoute>
    );
}


/* =========================================================
   APP
   ========================================================= */

function App() {

    return (

        <Routes>


            {/* =================================================
               LOGIN
               ================================================= */}

            <Route
                path="/login"
                element={
                    <Login />
                }
            />


            {/* =================================================
               PROTECTED APPLICATION
               ================================================= */}

            <Route
                path="/*"
                element={
                    <ProtectedLayout />
                }
            />

        </Routes>
    );
}


export default App;