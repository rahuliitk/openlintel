import { NextRequest, NextResponse } from 'next/server';
import { db, exteriorDesigns, eq } from '@openlintel/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const design = await db.query.exteriorDesigns.findFirst({
    where: eq(exteriorDesigns.id, id),
  });

  const elevation = design?.elevationType ?? 'front';
  const roof = (design?.roofStyle ?? 'gable').replace(/_/g, ' ');
  const material = (design?.facadeMaterial ?? 'brick').replace(/_/g, ' ');

  // Generate an SVG placeholder that represents the exterior render
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#87CEEB"/>
      <stop offset="100%" stop-color="#E0F0FF"/>
    </linearGradient>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4CAF50"/>
      <stop offset="100%" stop-color="#388E3C"/>
    </linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D7CCC8"/>
      <stop offset="100%" stop-color="#BCAAA4"/>
    </linearGradient>
    <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5D4037"/>
      <stop offset="100%" stop-color="#795548"/>
    </linearGradient>
  </defs>
  <!-- Sky -->
  <rect width="800" height="600" fill="url(#sky)"/>
  <!-- Sun -->
  <circle cx="650" cy="80" r="45" fill="#FFF9C4" opacity="0.9"/>
  <!-- Clouds -->
  <ellipse cx="150" cy="70" rx="60" ry="20" fill="white" opacity="0.7"/>
  <ellipse cx="180" cy="60" rx="40" ry="18" fill="white" opacity="0.7"/>
  <ellipse cx="500" cy="100" rx="50" ry="16" fill="white" opacity="0.5"/>
  <!-- Ground / Grass -->
  <rect x="0" y="420" width="800" height="180" fill="url(#grass)"/>
  <!-- Driveway -->
  <path d="M 320 600 L 360 420 L 440 420 L 480 600 Z" fill="#9E9E9E"/>
  <!-- House base -->
  <rect x="200" y="240" width="400" height="180" fill="url(#wall)" stroke="#8D6E63" stroke-width="2"/>
  <!-- Roof -->
  <polygon points="180,240 400,120 620,240" fill="url(#roofGrad)" stroke="#4E342E" stroke-width="2"/>
  <!-- Door -->
  <rect x="370" y="320" width="60" height="100" fill="#5D4037" rx="2"/>
  <circle cx="420" cy="375" r="4" fill="#FFC107"/>
  <!-- Windows -->
  <rect x="240" y="280" width="70" height="60" fill="#B3E5FC" stroke="#455A64" stroke-width="2" rx="2"/>
  <line x1="275" y1="280" x2="275" y2="340" stroke="#455A64" stroke-width="1.5"/>
  <line x1="240" y1="310" x2="310" y2="310" stroke="#455A64" stroke-width="1.5"/>
  <rect x="490" y="280" width="70" height="60" fill="#B3E5FC" stroke="#455A64" stroke-width="2" rx="2"/>
  <line x1="525" y1="280" x2="525" y2="340" stroke="#455A64" stroke-width="1.5"/>
  <line x1="490" y1="310" x2="560" y2="310" stroke="#455A64" stroke-width="1.5"/>
  <!-- Garage -->
  <rect x="520" y="320" width="80" height="100" fill="#BDBDBD" stroke="#757575" stroke-width="2" rx="2"/>
  <line x1="520" y1="340" x2="600" y2="340" stroke="#9E9E9E" stroke-width="1"/>
  <line x1="520" y1="360" x2="600" y2="360" stroke="#9E9E9E" stroke-width="1"/>
  <line x1="520" y1="380" x2="600" y2="380" stroke="#9E9E9E" stroke-width="1"/>
  <line x1="520" y1="400" x2="600" y2="400" stroke="#9E9E9E" stroke-width="1"/>
  <!-- Trees -->
  <rect x="100" y="350" width="12" height="70" fill="#5D4037"/>
  <ellipse cx="106" cy="330" rx="35" ry="45" fill="#2E7D32"/>
  <rect x="680" y="340" width="12" height="80" fill="#5D4037"/>
  <ellipse cx="686" cy="320" rx="30" ry="40" fill="#2E7D32"/>
  <!-- Bushes -->
  <ellipse cx="210" cy="415" rx="25" ry="15" fill="#388E3C"/>
  <ellipse cx="250" cy="418" rx="20" ry="12" fill="#43A047"/>
  <ellipse cx="590" cy="418" rx="20" ry="12" fill="#43A047"/>
  <!-- Walkway -->
  <path d="M 370 420 L 380 450 L 350 480 L 360 520 L 340 560 L 350 600" fill="none" stroke="#BDBDBD" stroke-width="12" stroke-linecap="round"/>
  <!-- Labels -->
  <rect x="0" y="520" width="800" height="80" fill="rgba(0,0,0,0.6)"/>
  <text x="400" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="white" font-weight="bold">${elevation.replace(/_/g, ' ').toUpperCase()} ELEVATION — AI Generated Render</text>
  <text x="400" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#ccc">${roof} roof · ${material} facade</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
