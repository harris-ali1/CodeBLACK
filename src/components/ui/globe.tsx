// Wireframe globe extracted from the ScrollX "contact-with-globe" component.
// Changes: exported, Houston added, optional pulsing markers, unused state removed.
import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import type { GeoPermissibleObjects } from "d3";

export interface GlobeMarker {
  /** [lat, lon] */
  coords: [number, number];
  color?: string;
}

interface GlobeProps {
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  graticuleColor?: string;
  graticuleOpacity?: number;
  sphereOutlineColor?: string;
  sphereOutlineWidth?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  rotateToLocation?: string | [number, number];
  rotateCities?: string[];
  rotationSpeed?: number;
  initialRotation?: [number, number];
  enableInteraction?: boolean;
  showGraticule?: boolean;
  countryFillColor?: string;
  countryHoverColor?: string;
  variant?: "wireframe" | "wireframesolid" | "solid";
  scale?: number;
  backgroundColor?: string;
  markers?: GlobeMarker[];
}

interface GeoFeature {
  type: string;
  geometry: GeometryObject;
  properties: Record<string, unknown>;
}

interface WorldAtlasTopology extends Topology {
  objects: { countries: GeometryCollection };
}

export const cityCoordinates: Record<string, [number, number]> = {
  houston: [29.7604, -95.3698],
  "san francisco": [37.7749, -122.4194],
  "new york": [40.7128, -74.006],
  london: [51.5074, -0.1278],
  tokyo: [35.6762, 139.6503],
  "los angeles": [34.0522, -118.2437],
  chicago: [41.8781, -87.6298],
};

export function Globe({
  width,
  height,
  className = "aspect-square w-full max-w-150",
  strokeColor = "currentColor",
  strokeWidth = 1.0,
  graticuleColor = "currentColor",
  graticuleOpacity = 0.2,
  sphereOutlineColor = "currentColor",
  sphereOutlineWidth = 1,
  autoRotate = true,
  autoRotateSpeed = 0.5,
  rotateToLocation,
  rotateCities = [],
  rotationSpeed = 3000,
  initialRotation = [0, 0],
  enableInteraction = true,
  showGraticule = true,
  countryFillColor,
  countryHoverColor,
  variant = "wireframe",
  scale = 1,
  backgroundColor,
  markers = [],
}: GlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<GeoFeature[]>([]);
  const [rotation, setRotation] = useState<[number, number]>(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState([0, 0]);
  const [isVisible, setIsVisible] = useState(false);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const rotationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationAnimFrame = useRef<number | null>(null);
  const rotationStartTime = useRef<number | null>(null);
  const rotationFrom = useRef<[number, number]>([0, 0]);
  const rotationTo = useRef<[number, number]>([0, 0]);
  const animationFrame = useRef<number | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const rotationRef = useRef(rotation);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const useResponsive = !width && !height;
  const finalWidth = useResponsive ? dimensions.width : width || 800;
  const finalHeight = useResponsive ? dimensions.height : height || 500;
  const countryFill = countryFillColor || (variant === "solid" ? "currentColor" : "none");
  const bgColor = backgroundColor || "transparent";

  // Size + visibility tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      if (useResponsive) {
        const w = container.offsetWidth || 300;
        setDimensions({ width: w, height: w });
      }
    };
    update();
    if (useResponsive) {
      resizeObserver.current = new ResizeObserver(update);
      resizeObserver.current.observe(container);
    }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(container);
    return () => {
      resizeObserver.current?.disconnect();
      observer.unobserve(container);
    };
  }, [useResponsive]);

  // World outlines, bundled locally so the demo works on bad Wi-Fi
  useEffect(() => {
    import("world-atlas/countries-110m.json")
      .then((mod) => {
        const world = mod.default as unknown as WorldAtlasTopology;
        setWorldData(feature(world, world.objects.countries).features as GeoFeature[]);
      })
      .catch((error) => console.error("Error loading world data:", error));
  }, []);

  // Continuous spin
  useEffect(() => {
    if (!autoRotate || !isVisible || isDragging || rotateCities.length > 0) {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }
    const rotate = () => {
      setRotation((prev) => [(prev[0] + autoRotateSpeed) % 360, prev[1]]);
      animationFrame.current = requestAnimationFrame(rotate);
    };
    animationFrame.current = requestAnimationFrame(rotate);
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [autoRotate, autoRotateSpeed, isVisible, isDragging, rotateCities.length]);

  const animateRotationTo = useCallback((target: [number, number], duration = 1200) => {
    if (rotationAnimFrame.current) cancelAnimationFrame(rotationAnimFrame.current);
    rotationFrom.current = rotationRef.current;
    rotationTo.current = target;
    rotationStartTime.current = performance.now();
    const animate = (time: number) => {
      const t = Math.min((time - (rotationStartTime.current || 0)) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setRotation([
        rotationFrom.current[0] + (rotationTo.current[0] - rotationFrom.current[0]) * eased,
        rotationFrom.current[1] + (rotationTo.current[1] - rotationFrom.current[1]) * eased,
      ]);
      if (t < 1) rotationAnimFrame.current = requestAnimationFrame(animate);
    };
    rotationAnimFrame.current = requestAnimationFrame(animate);
  }, []);

  // Fly between cities (a single city = spin in, then settle there)
  useEffect(() => {
    if (rotateCities.length === 0 || !isVisible) return;
    const flyTo = (index: number) => {
      const c = cityCoordinates[rotateCities[index].toLowerCase()];
      if (c) animateRotationTo([-c[1], -c[0]], rotationSpeed * 0.6);
    };
    flyTo(currentCityIndex);
    if (rotateCities.length > 1) {
      rotationInterval.current = setInterval(() => {
        setCurrentCityIndex((i) => (i + 1) % rotateCities.length);
      }, rotationSpeed);
    }
    return () => {
      if (rotationInterval.current) clearInterval(rotationInterval.current);
    };
  }, [rotateCities, currentCityIndex, rotationSpeed, isVisible, animateRotationTo]);

  useEffect(() => {
    if (!rotateToLocation) return;
    const c =
      typeof rotateToLocation === "string"
        ? cityCoordinates[rotateToLocation.toLowerCase()] || [0, 0]
        : rotateToLocation;
    setRotation([-c[1], -c[0]]);
  }, [rotateToLocation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enableInteraction) return;
    setIsDragging(true);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) setLastMouse([e.clientX - rect.left, e.clientY - rect.top]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !enableInteraction) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cur = [e.clientX - rect.left, e.clientY - rect.top];
    const dx = cur[0] - lastMouse[0];
    const dy = cur[1] - lastMouse[1];
    setRotation((prev) => [prev[0] + dx * 0.5, Math.max(-90, Math.min(90, prev[1] - dy * 0.5))]);
    setLastMouse(cur);
  };

  // Draw
  useEffect(() => {
    if (!svgRef.current || worldData.length === 0 || !isVisible) return;
    if (useResponsive && dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const isSolid = variant === "solid";
    const renderGraticule = variant === "wireframe" && showGraticule && graticuleOpacity > 0;
    const outlineWidth = variant === "wireframe" ? sphereOutlineWidth : 1.5;
    const radius = (Math.min(finalWidth, finalHeight) / 2) * scale * 0.9;

    if (bgColor !== "transparent") {
      svg.append("circle").attr("cx", finalWidth / 2).attr("cy", finalHeight / 2).attr("r", radius).attr("fill", bgColor);
    }

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([finalWidth / 2, finalHeight / 2])
      .rotate([rotation[0], rotation[1]])
      .precision(0.1);
    const path = d3.geoPath(projection);

    if (renderGraticule) {
      svg
        .append("path")
        .datum(d3.geoGraticule()())
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", graticuleColor)
        .attr("stroke-width", 1)
        .attr("opacity", graticuleOpacity);
    }

    svg
      .selectAll(".country")
      .data(worldData)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d) => path(d as unknown as GeoPermissibleObjects) || "")
      .attr("fill", isSolid ? countryFill : "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", isSolid ? strokeWidth * 0.5 : strokeWidth)
      .attr("opacity", isSolid ? 0.3 : 1)
      .on("mouseenter", function () {
        if (countryHoverColor && isSolid) d3.select(this).attr("fill", countryHoverColor);
      })
      .on("mouseleave", function () {
        if (isSolid) d3.select(this).attr("fill", countryFill);
      });

    svg
      .append("path")
      .datum({ type: "Sphere" } as d3.GeoSphere)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", sphereOutlineColor)
      .attr("stroke-width", outlineWidth)
      .attr("opacity", variant === "wireframe" ? 1 : 0.8);

    // Markers on the visible hemisphere only
    const center: [number, number] = [-rotation[0], -rotation[1]];
    for (const m of markers) {
      const lonLat: [number, number] = [m.coords[1], m.coords[0]];
      if (d3.geoDistance(lonLat, center) > Math.PI / 2) continue;
      const p = projection(lonLat);
      if (!p) continue;
      const color = m.color || "#38bdf8";
      const pulse = svg.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("fill", color);
      pulse.append("animate").attr("attributeName", "r").attr("values", "3;14").attr("dur", "1.6s").attr("repeatCount", "indefinite");
      pulse.append("animate").attr("attributeName", "opacity").attr("values", "0.6;0").attr("dur", "1.6s").attr("repeatCount", "indefinite");
      svg.append("circle").attr("cx", p[0]).attr("cy", p[1]).attr("r", 3.5).attr("fill", color);
    }
  }, [
    worldData, rotation, isVisible, finalWidth, finalHeight, strokeColor, strokeWidth,
    graticuleColor, graticuleOpacity, sphereOutlineColor, sphereOutlineWidth, showGraticule,
    countryFill, countryHoverColor, variant, scale, bgColor, useResponsive, dimensions.width, markers,
  ]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={finalWidth}
        height={finalHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        className={useResponsive ? "w-full h-full transition-opacity duration-1000" : ""}
        style={{
          cursor: enableInteraction ? (isDragging ? "grabbing" : "grab") : "default",
          opacity: useResponsive ? (dimensions.width > 0 ? 1 : 0) : 1,
        }}
      />
    </div>
  );
}