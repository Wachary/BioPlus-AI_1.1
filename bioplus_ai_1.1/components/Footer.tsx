'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              About BioPlus AI
            </h3>
            <p className="mt-4 text-base text-gray-500">
              An AI-powered health assessment tool designed to help you understand
              your symptoms and make informed decisions about your health.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/onboarding/questions"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Start Assessment
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/history"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  View History
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Legal
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/privacy"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; {new Date().getFullYear()} BioPlus AI. All rights reserved.
          </p>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Disclaimer: This tool is for informational purposes only and is not a
            substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
    </footer>
  );
}
