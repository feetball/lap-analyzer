import { NextRequest, NextResponse } from 'next/server';
import { getRaceDatabase } from '@/utils/database';

export async function GET() {
  try {
    const db = getRaceDatabase();
    const sessions = db.getAllSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, date, circuit, data } = await request.json();
    
    if (!name || !date || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getRaceDatabase();
    const sessionId = db.createSession({ name, date, circuit, data });
    
    return NextResponse.json({ id: sessionId, message: 'Session created successfully' });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
