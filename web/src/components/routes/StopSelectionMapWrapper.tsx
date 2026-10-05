'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { CustomerLocation } from './StopSelectionMap';

const DynamicMap = dynamic(() => import('./StopSelectionMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] flex flex-col items-center justify-center bg-gray-100 rounded-xl border border-border">
      <div className="text-3xl mb-2 animate-bounce">🗺️</div>
      <p className="text-sm font-semibold text-primary">Initializing Viewport Dispatch Engine…</p>
      <p className="text-xs text-text-muted mt-1">Connecting geospatial bounding-box stream for Addis Ababa</p>
    </div>
  ),
});

interface StopSelectionMapWrapperProps {
  customers: CustomerLocation[];
  selectedCustomerIds: string[];
  onToggleCustomer: (id: string) => void;
  onSelectMultiple: (ids: string[], mode: 'add' | 'replace' | 'remove') => void;
  onViewportFetch?: (viewport: { minLat: number; maxLat: number; minLng: number; maxLng: number; zoom: number }) => void;
  isLoadingViewport?: boolean;
}

export default function StopSelectionMapWrapper(props: StopSelectionMapWrapperProps) {
  return <DynamicMap {...props} />;
}
