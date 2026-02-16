import { NextRequest, NextResponse } from 'next/server';

// Testimonials API disabled
export async function GET(request: NextRequest) {
  return NextResponse.json({ success: false, error: 'Testimonials endpoint has been disabled' }, { status: 410 });
}