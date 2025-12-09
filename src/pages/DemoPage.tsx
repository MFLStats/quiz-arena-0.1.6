import React from 'react';
import { Navigate } from 'react-router-dom';
// Legacy demo page replaced with redirect to avoid build errors
export function DemoPage() {
  return <Navigate to="/" replace />;
}