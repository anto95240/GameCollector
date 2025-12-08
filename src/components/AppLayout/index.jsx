import { Outlet } from "react-router";

function AppLayout() {
    return (
        <div className="app-layout">
            {/* Header, menu, etc ici */}
            <Outlet />
        </div>
    );
}

export default AppLayout;
