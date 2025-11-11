"use client";

/**
 * Crossing Schematic Component
 * SVG visualization of rail crossing geometry
 */

interface CrossingSchematicProps {
  length: number;
  tracks: number;
  angle: number;
  gauge: number;
  trackSpacing?: number; // actual track spacing in meters
}

export default function CrossingSchematic({
  length,
  tracks,
  angle,
  gauge,
  trackSpacing: actualTrackSpacing,
}: CrossingSchematicProps) {
  const svgWidth = 600;
  const svgHeight = 400;
  const scale = 30; // pixels per meter

  // Calculate RHR length
  const rhrLength = Math.ceil(length / 1.8) * 1.8;
  const crossingWidth = rhrLength * scale;

  // Use actual track spacing if provided, otherwise default to 4.0m for visual spacing
  const trackSpacingMeters = actualTrackSpacing || 4.0;
  const trackSpacingPixels = trackSpacingMeters * scale;

  // Calculate rail gauge spacing (convert mm to meters, then to pixels)
  const gaugeMeters = gauge / 1000; // convert mm to meters
  const gaugePixels = gaugeMeters * scale;
  const railOffset = gaugePixels / 2; // offset from center for each rail

  // Calculate angle in radians
  const angleRad = (angle * Math.PI) / 180;

  // Calculate center point
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Road dimensions
  const roadWidth = 100;
  const roadLength = 300;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700">Crossing Schematic</h3>
        <p className="text-xs text-gray-500 mt-1">
          Top view (not to scale)
        </p>
      </div>

      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

        {/* Draw rail tracks (horizontal) */}
        {Array.from({ length: tracks }).map((_, i) => {
          const trackY = centerY + (i - (tracks - 1) / 2) * trackSpacingPixels;

          return (
            <g key={`track-${i}`}>
              {/* Left rail */}
              <line
                x1={centerX - crossingWidth / 2}
                y1={trackY - railOffset}
                x2={centerX + crossingWidth / 2}
                y2={trackY - railOffset}
                stroke="#4b5563"
                strokeWidth="2"
              />
              {/* Right rail */}
              <line
                x1={centerX - crossingWidth / 2}
                y1={trackY + railOffset}
                x2={centerX + crossingWidth / 2}
                y2={trackY + railOffset}
                stroke="#4b5563"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Draw road (angled) */}
        {(() => {
          // Calculate road endpoints based on angle
          const dx = (roadLength / 2) * Math.cos(angleRad);
          const dy = (roadLength / 2) * Math.sin(angleRad);

          // Road centerline
          const roadX1 = centerX - dx;
          const roadY1 = centerY + dy;
          const roadX2 = centerX + dx;
          const roadY2 = centerY - dy;

          // Perpendicular vector for road width
          const perpX = -Math.sin(angleRad) * (roadWidth / 2);
          const perpY = Math.cos(angleRad) * (roadWidth / 2);

          return (
            <g>
              {/* Road surface */}
              <line
                x1={roadX1}
                y1={roadY1}
                x2={roadX2}
                y2={roadY2}
                stroke="#9ca3af"
                strokeWidth="60"
                opacity="0.3"
              />

              {/* Road edges */}
              <line
                x1={roadX1 - perpX}
                y1={roadY1 - perpY}
                x2={roadX2 - perpX}
                y2={roadY2 - perpY}
                stroke="#6b7280"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <line
                x1={roadX1 + perpX}
                y1={roadY1 + perpY}
                x2={roadX2 + perpX}
                y2={roadY2 + perpY}
                stroke="#6b7280"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </g>
          );
        })()}

        {/* Crossing panels - one per track */}
        {Array.from({ length: tracks }).map((_, i) => {
          const trackY = centerY + (i - (tracks - 1) / 2) * trackSpacingPixels;

          return (
            <rect
              key={`crossing-panel-${i}`}
              x={centerX - crossingWidth / 2}
              y={trackY - roadWidth / 2}
              width={crossingWidth}
              height={roadWidth}
              fill="#3b82f6"
              opacity="0.2"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          );
        })}

        {/* Annotations */}
        <g>
          {/* Length annotation */}
          <line
            x1={centerX - crossingWidth / 2}
            y1={svgHeight - 40}
            x2={centerX + crossingWidth / 2}
            y2={svgHeight - 40}
            stroke="#374151"
            strokeWidth="1"
            markerStart="url(#arrowLeft)"
            markerEnd="url(#arrowRight)"
          />
          <text
            x={centerX}
            y={svgHeight - 25}
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
          >
            {rhrLength.toFixed(1)}m
          </text>

          {/* Angle annotation */}
          <text
            x={centerX + crossingWidth / 2 + 20}
            y={centerY - 20}
            fontSize="12"
            fill="#374151"
          >
            {angle}°
          </text>

          {/* Gauge annotation - visual measurement for single track */}
          {tracks === 1 && (
            <>
              {/* Vertical line showing gauge between rails */}
              <line
                x1={centerX - crossingWidth / 2 - 30}
                y1={centerY - railOffset}
                x2={centerX - crossingWidth / 2 - 30}
                y2={centerY + railOffset}
                stroke="#374151"
                strokeWidth="1"
                markerStart="url(#arrowUp)"
                markerEnd="url(#arrowDown)"
              />
              <text
                x={centerX - crossingWidth / 2 - 45}
                y={centerY}
                fontSize="12"
                fill="#374151"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {gauge}mm
              </text>
            </>
          )}

          {/* Tracks annotation */}
          <text x={20} y={50} fontSize="12" fill="#374151">
            Tracks: {tracks}
          </text>

          {/* Gauge annotation for multi-track */}
          {tracks > 1 && (
            <>
              {/* Vertical line showing gauge on first track */}
              <line
                x1={centerX - crossingWidth / 2 - 30}
                y1={centerY - trackSpacingPixels / 2 - railOffset}
                x2={centerX - crossingWidth / 2 - 30}
                y2={centerY - trackSpacingPixels / 2 + railOffset}
                stroke="#374151"
                strokeWidth="1"
                markerStart="url(#arrowUp)"
                markerEnd="url(#arrowDown)"
              />
              <text
                x={centerX - crossingWidth / 2 - 45}
                y={centerY - trackSpacingPixels / 2}
                fontSize="11"
                fill="#374151"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {gauge}mm
              </text>
            </>
          )}

          {/* Track spacing annotation for multi-track */}
          {tracks > 1 && actualTrackSpacing && (
            <>
              {/* Vertical line showing spacing between first two tracks */}
              <line
                x1={svgWidth - 60}
                y1={centerY - trackSpacingPixels / 2}
                x2={svgWidth - 60}
                y2={centerY + trackSpacingPixels / 2}
                stroke="#374151"
                strokeWidth="1"
                markerStart="url(#arrowUp)"
                markerEnd="url(#arrowDown)"
              />
              <text
                x={svgWidth - 50}
                y={centerY}
                fontSize="12"
                fill="#374151"
                dominantBaseline="middle"
              >
                {trackSpacingMeters.toFixed(1)}m
              </text>
            </>
          )}
        </g>

        {/* Arrow markers */}
        <defs>
          <marker
            id="arrowRight"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 5 3, 0 6" fill="#374151" />
          </marker>
          <marker
            id="arrowLeft"
            markerWidth="10"
            markerHeight="10"
            refX="0"
            refY="3"
            orient="auto"
          >
            <polygon points="5 0, 0 3, 5 6" fill="#374151" />
          </marker>
          <marker
            id="arrowUp"
            markerWidth="10"
            markerHeight="10"
            refX="3"
            refY="0"
            orient="auto"
          >
            <polygon points="0 5, 3 0, 6 5" fill="#374151" />
          </marker>
          <marker
            id="arrowDown"
            markerWidth="10"
            markerHeight="10"
            refX="3"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 3 5, 6 0" fill="#374151" />
          </marker>
        </defs>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-gray-600">
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-gray-600 mr-2"></div>
          <span>Rail Track</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-gray-400 border-dashed mr-2"></div>
          <span>Road Surface</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 opacity-20 border border-blue-500 mr-2"></div>
          <span>Crossing Panel</span>
        </div>
      </div>
    </div>
  );
}
