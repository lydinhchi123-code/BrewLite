import type { Metadata } from "next";
import "./globals.css";

import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
title: "BrewLite | Cà phê mỗi ngày",
description: "Đặt cà phê và thức uống yêu thích cùng BrewLite.",
};

export default function RootLayout({
children,
}: Readonly<{ children: React.ReactNode }>) {
return (
<html lang="vi">
<body>
<Header />
{children}
<Footer />
</body>
</html>
);
}