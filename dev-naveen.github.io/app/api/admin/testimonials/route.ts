import { NextRequest, NextResponse } from 'next/server';

// Testimonials admin API has been disabled
export async function GET(request: NextRequest) {
  return NextResponse.json({ success: false, error: 'Admin testimonials endpoint disabled' }, { status: 410 });
}
export async function POST(request: NextRequest) {
  return NextResponse.json({ success: false, error: 'Admin testimonials endpoint disabled' }, { status: 410 });
}