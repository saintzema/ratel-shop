import { Metadata } from 'next';
import { ReactNode } from 'react';

type Props = {
    children: ReactNode;
};

export const metadata: Metadata = {
    title: "Search Products | FairPrice Nigeria Price Verification",
    description: "Search for any product and verify its real market price in Nigeria. Avoid overpaying on Jumia or Konga.",
};

export default function SearchLayout({ children }: Props) {
    return children;
}
