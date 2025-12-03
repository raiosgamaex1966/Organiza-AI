import { DashboardLayout } from "./DashboardLayout";

interface LayoutProps {
    children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    return <DashboardLayout>{children}</DashboardLayout>;
};

export default Layout;
