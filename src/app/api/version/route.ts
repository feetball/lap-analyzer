import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    return NextResponse.json({ 
      version: packageJson.version,
      name: packageJson.name
    });
  } catch {
    return NextResponse.json({ 
      version: '0.2.0',
      name: 'lap-analyzer'
    });
  }
}
