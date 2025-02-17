'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center -ml-2">
              <Link href="/" className="flex items-center">
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`}
                  alt="BioPlus AI"
                  width={64}
                  height={64}
                  priority
                  className="h-16 w-16 object-contain"
                />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center h-10 mt-3 px-3 border-b-2 text-sm font-medium ${
                  isActive('/')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Home
              </Link>
              <Link
                href="/onboarding/questions"
                className={`inline-flex items-center h-10 mt-3 px-3 border-b-2 text-sm font-medium ${
                  isActive('/onboarding/questions')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Assessment
              </Link>
              <Link
                href="/dashboard/history"
                className={`inline-flex items-center h-10 mt-3 px-3 border-b-2 text-sm font-medium ${
                  isActive('/dashboard/history')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                History
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/onboarding/questions"
              className="inline-flex items-center h-10 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Start Assessment
            </Link>
            
            <Link
              href="/dashboard/history"
              className="inline-flex items-center h-10 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              History
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
