import { NextRequest, NextResponse } from 'next/server';

// Testimonials admin item endpoints disabled
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: false, error: 'Admin testimonial item endpoint disabled' }, { status: 410 });
}
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: false, error: 'Admin testimonial item endpoint disabled' }, { status: 410 });
}
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ success: false, error: 'Admin testimonial item endpoint disabled' }, { status: 410 });
}