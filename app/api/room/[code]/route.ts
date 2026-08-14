import { NextRequest, NextResponse } from 'next/server';
import { clearFiles } from '@/lib/fileStore';

// In-memory store: { [roomCode]: { [deviceId]: DeviceInfo } }
interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  joinedAt: number;
  lastSeen: number;
}

const rooms = new Map<string, Map<string, DeviceInfo>>();

// Clean up stale devices (not seen in last 10 seconds)
function cleanRoom(code: string) {
  const room = rooms.get(code);
  if (!room) return;
  const now = Date.now();
  for (const [id, device] of room.entries()) {
    if (now - device.lastSeen > 10_000) {
      room.delete(id);
    }
  }
  if (room.size === 0) {
    rooms.delete(code);
    clearFiles(code); // Clean up RAM store and temporary disk storage
  }
}

// GET: list devices in room
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  cleanRoom(code);
  const room = rooms.get(code);
  const devices: DeviceInfo[] = room ? Array.from(room.values()) : [];
  return NextResponse.json({ devices });
}

// POST: join room (heartbeat)
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json() as { id: string; name: string; type: 'mobile' | 'tablet' | 'desktop' };
  const { id, name, type } = body;

  if (!id || !name) {
    return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
  }

  if (!rooms.has(code)) rooms.set(code, new Map());
  const room = rooms.get(code)!;

  const existing = room.get(id);
  room.set(id, {
    id,
    name,
    type,
    joinedAt: existing?.joinedAt ?? Date.now(),
    lastSeen: Date.now(),
  });

  cleanRoom(code);
  const devices = Array.from(room.values());
  return NextResponse.json({ devices });
}

// DELETE: leave room
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    rooms.get(code)?.delete(id);
  }
  cleanRoom(code); // Immediately trigger cleanup if the room becomes empty
  return NextResponse.json({ ok: true });
}
